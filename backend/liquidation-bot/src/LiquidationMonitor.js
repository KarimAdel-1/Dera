const { ethers } = require('ethers');
const { Client, AccountId, PrivateKey, ContractExecuteTransaction } = require('@hashgraph/sdk');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * LiquidationMonitor
 *
 * Monitors the Dera Protocol for liquidatable positions and executes liquidations.
 *
 * FLOW:
 * 1. Query LiquidationDataProvider for all user positions
 * 2. Check health factors (< 1.0 = liquidatable)
 * 3. Calculate profitability (bonus - gas costs)
 * 4. Execute liquidation if profitable
 * 5. Log results and update metrics
 */
class LiquidationMonitor {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.hederaClient = null;
    this.contracts = {};
    this.isRunning = false;
    this.metrics = {
      totalLiquidations: 0,
      successfulLiquidations: 0,
      failedLiquidations: 0,
      totalProfitUSD: 0,
    };
  }

  /**
   * Initialize the bot with network connections and contract instances
   */
  async initialize() {
    try {
      logger.info('Initializing Liquidation Bot...');

      // Initialize Hedera client
      this.hederaClient = Client.forTestnet(); // or forMainnet()

      const operatorId = AccountId.fromString(config.HEDERA_OPERATOR_ID);
      const operatorKey = PrivateKey.fromString(config.HEDERA_OPERATOR_KEY);

      this.hederaClient.setOperator(operatorId, operatorKey);

      // Initialize Ethers provider and wallet for contract interactions
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
      this.wallet = new ethers.Wallet(config.PRIVATE_KEY, this.provider);

      // Load contract ABIs and create instances
      await this.loadContracts();

      logger.info('✅ Liquidation Bot initialized successfully');
      logger.info(`Operator Account: ${config.HEDERA_OPERATOR_ID}`);
      logger.info(`Network: ${config.NETWORK}`);

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize bot:', error);
      throw error;
    }
  }

  /**
   * Load contract instances
   */
  async loadContracts() {
    const poolABI = require('./abis/Pool.json');
    const liquidationDataProviderABI = require('./abis/LiquidationDataProvider.json');
    const oracleABI = require('./abis/DeraOracle.json');

    this.contracts.pool = new ethers.Contract(
      config.POOL_ADDRESS,
      poolABI,
      this.wallet
    );

    this.contracts.liquidationDataProvider = new ethers.Contract(
      config.LIQUIDATION_DATA_PROVIDER_ADDRESS,
      liquidationDataProviderABI,
      this.wallet
    );

    this.contracts.oracle = new ethers.Contract(
      config.ORACLE_ADDRESS,
      oracleABI,
      this.wallet
    );

    logger.info('✅ Contracts loaded');
  }

  /**
   * Start monitoring for liquidatable positions
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting liquidation monitoring...');
    logger.info(`Check interval: ${config.CHECK_INTERVAL_MS}ms`);
    logger.info(`Min profit threshold: $${config.MIN_PROFIT_USD}`);

    // Run initial check
    await this.checkAndLiquidate();

    // Set up interval for continuous monitoring
    this.monitoringInterval = setInterval(
      () => this.checkAndLiquidate(),
      config.CHECK_INTERVAL_MS
    );
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isRunning = false;
    logger.info('⏸️  Liquidation monitoring stopped');
  }

  /**
   * Main function: Check for liquidatable positions and execute
   */
  async checkAndLiquidate() {
    try {
      logger.debug('🔍 Checking for liquidatable positions...');

      // Get all user positions from LiquidationDataProvider
      const positions = await this.getLiquidatablePositions();

      if (positions.length === 0) {
        logger.debug('✅ No liquidatable positions found');
        return;
      }

      logger.info(`🎯 Found ${positions.length} liquidatable position(s)`);

      // Process each liquidatable position
      for (const position of positions) {
        await this.processLiquidation(position);
      }

    } catch (error) {
      logger.error('❌ Error in checkAndLiquidate:', error);
    }
  }

  /**
   * Query LiquidationDataProvider for liquidatable positions
   */
  async getLiquidatablePositions() {
    try {
      const addressesProvider = await this.contracts.pool.ADDRESSES_PROVIDER();

      // Get all registered users from Pool's user registry
      // This uses the new getAllUsers() or getUsersPaginated() function
      let allUsers = [];

      try {
        // Try to use getUsersPaginated() for efficient iteration (recommended)
        const PAGE_SIZE = 100;
        let startIndex = 0;
        let hasMore = true;

        while (hasMore) {
          const [users, nextIndex] = await this.contracts.pool.getUsersPaginated(startIndex, PAGE_SIZE);

          allUsers = allUsers.concat(users);

          // nextIndex = 0 means we've reached the end
          if (nextIndex === 0 || nextIndex === 0n) {
            hasMore = false;
          } else {
            startIndex = Number(nextIndex);
          }

          logger.debug(`Fetched ${users.length} users (total: ${allUsers.length})`);
        }
      } catch (error) {
        // Fallback to getAllUsers() if getUsersPaginated() fails
        logger.warn('getUsersPaginated() failed, falling back to getAllUsers()');
        allUsers = await this.contracts.pool.getAllUsers();
      }

      logger.info(`📋 Found ${allUsers.length} registered users to monitor`);

      // Filter for liquidatable positions
      const liquidatablePositions = [];

      for (const userAddress of allUsers) {
        try {
          // Get user account data from Pool
          const userData = await this.contracts.pool.getUserAccountData(userAddress);

          const healthFactor = userData.healthFactor;
          const totalCollateralBase = userData.totalCollateralBase;
          const totalDebtBase = userData.totalDebtBase;

          // Health factor is in WAD (18 decimals), 1e18 = 1.0
          const healthFactorDecimal = Number(ethers.formatUnits(healthFactor, 18));

          logger.debug(`User ${userAddress}: HF=${healthFactorDecimal.toFixed(4)}`);

          // If health factor < 1.0, position is liquidatable
          if (healthFactorDecimal < 1.0 && totalDebtBase > 0) {
            logger.info(`💀 Liquidatable position found: ${userAddress} (HF: ${healthFactorDecimal.toFixed(4)})`);

            // Get detailed liquidation data
            const liquidationData = await this.contracts.liquidationDataProvider.getLiquidationData(
              userAddress,
              addressesProvider
            );

            liquidatablePositions.push({
              user: userAddress,
              healthFactor: healthFactorDecimal,
              totalCollateralBase,
              totalDebtBase,
              liquidationData,
            });
          }
        } catch (error) {
          logger.debug(`Could not get data for ${userAddress}:`, error.message);
        }
      }

      return liquidatablePositions;
    } catch (error) {
      logger.error('Error getting liquidatable positions:', error);
      return [];
    }
  }

  /**
   * Process a liquidation
   */
  async processLiquidation(position) {
    try {
      const { user, healthFactor, liquidationData } = position;

      logger.info(`🔨 Processing liquidation for ${user}`);

      // Calculate optimal liquidation parameters
      const liquidationParams = await this.calculateLiquidationParams(position);

      if (!liquidationParams) {
        logger.warn(`⚠️  Liquidation not profitable for ${user}`);
        return;
      }

      const {
        collateralAsset,
        debtAsset,
        debtToCover,
        expectedProfit
      } = liquidationParams;

      logger.info(`💰 Expected profit: $${expectedProfit.toFixed(2)}`);
      logger.info(`   Collateral: ${collateralAsset}`);
      logger.info(`   Debt Asset: ${debtAsset}`);
      logger.info(`   Debt to Cover: ${ethers.formatUnits(debtToCover, 6)} USDC`);

      // Execute liquidation
      const success = await this.executeLiquidation(
        user,
        collateralAsset,
        debtAsset,
        debtToCover
      );

      if (success) {
        this.metrics.successfulLiquidations++;
        this.metrics.totalProfitUSD += expectedProfit;
        logger.info(`✅ Liquidation successful! Total profit: $${this.metrics.totalProfitUSD.toFixed(2)}`);
      } else {
        this.metrics.failedLiquidations++;
        logger.error(`❌ Liquidation failed for ${user}`);
      }

      this.metrics.totalLiquidations++;

    } catch (error) {
      logger.error(`Error processing liquidation for ${position.user}:`, error);
      this.metrics.failedLiquidations++;
    }
  }

  /**
   * Calculate optimal liquidation parameters
   */
  async calculateLiquidationParams(position) {
    try {
      const { user, liquidationData, totalDebtBase } = position;

      // Get user configuration to determine active assets
      const userConfig = await this.contracts.pool.getUserConfiguration(user);

      // Get list of all assets
      const allAssets = await this.contracts.pool.getAssetsList();

      // Find most valuable collateral asset
      let maxCollateralValue = 0n;
      let collateralAsset = null;

      // Find largest debt asset
      let maxDebtValue = 0n;
      let debtAsset = null;

      // In a real implementation, you'd iterate through user's positions
      // using userConfig bitmap to determine which assets are active
      // For this template, we'll use configuration
      collateralAsset = config.DEFAULT_COLLATERAL_ASSET;
      debtAsset = config.DEFAULT_DEBT_ASSET;

      // Calculate maximum debt that can be covered (typically 50% of total debt)
      const maxDebtToCover = totalDebtBase / 2n;

      // Get liquidation bonus for this asset
      const assetData = await this.contracts.pool.getAssetData(collateralAsset);
      const liquidationBonus = assetData.configuration.liquidationBonus; // e.g., 10500 = 105% = 5% bonus

      // Calculate expected profit
      // Profit = (debtCovered * liquidationBonus) - debtCovered - gasCosts
      const bonusPercent = Number(liquidationBonus - 10000) / 100; // 500 -> 5%
      const debtToCoverUSD = Number(ethers.formatUnits(maxDebtToCover, 8)); // 8 decimals
      const expectedProfit = (debtToCoverUSD * bonusPercent / 100) - config.ESTIMATED_GAS_COST_USD;

      // Only liquidate if profit exceeds threshold
      if (expectedProfit < config.MIN_PROFIT_USD) {
        logger.debug(`Profit too low: $${expectedProfit.toFixed(2)} < $${config.MIN_PROFIT_USD}`);
        return null;
      }

      return {
        collateralAsset,
        debtAsset,
        debtToCover: maxDebtToCover,
        expectedProfit,
      };

    } catch (error) {
      logger.error('Error calculating liquidation params:', error);
      return null;
    }
  }

  /**
   * Execute liquidation transaction
   */
  async executeLiquidation(user, collateralAsset, debtAsset, debtToCover) {
    try {
      logger.info(`📤 Sending liquidation transaction...`);

      // Approve debt asset spending if needed
      const debtToken = new ethers.Contract(
        debtAsset,
        ['function approve(address spender, uint256 amount) returns (bool)'],
        this.wallet
      );

      // Check current allowance
      const allowance = await debtToken.allowance(this.wallet.address, config.POOL_ADDRESS);

      if (allowance < debtToCover) {
        logger.info('📝 Approving debt token spending...');
        const approveTx = await debtToken.approve(config.POOL_ADDRESS, ethers.MaxUint256);
        await approveTx.wait();
        logger.info('✅ Approval confirmed');
      }

      // Execute liquidation call
      // liquidationCall(collateralAsset, debtAsset, user, debtToCover, receiveSupplyToken)
      const tx = await this.contracts.pool.liquidationCall(
        collateralAsset,
        debtAsset,
        user,
        debtToCover,
        false // Don't receive aTokens, receive underlying collateral
      );

      logger.info(`⏳ Transaction sent: ${tx.hash}`);
      logger.info(`   Waiting for confirmation...`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        logger.info(`✅ Liquidation confirmed in block ${receipt.blockNumber}`);
        logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);
        return true;
      } else {
        logger.error(`❌ Transaction failed`);
        return false;
      }

    } catch (error) {
      logger.error('Error executing liquidation:', error);

      // Parse error for debugging
      if (error.reason) {
        logger.error(`Revert reason: ${error.reason}`);
      }

      return false;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      successRate: this.metrics.totalLiquidations > 0
        ? (this.metrics.successfulLiquidations / this.metrics.totalLiquidations * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    logger.info('🛑 Shutting down liquidation bot...');
    this.stop();

    if (this.hederaClient) {
      this.hederaClient.close();
    }

    logger.info('📊 Final Metrics:');
    logger.info(JSON.stringify(this.getMetrics(), null, 2));
    logger.info('👋 Goodbye!');
  }
}

module.exports = LiquidationMonitor;
