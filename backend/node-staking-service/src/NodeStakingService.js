const { ethers } = require('ethers');
const {
  Client,
  AccountId,
  PrivateKey,
  AccountUpdateTransaction,
  AccountBalanceQuery,
  TransferTransaction,
  Hbar,
} = require('@hashgraph/sdk');
const cron = require('node-cron');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * NodeStakingService
 *
 * Manages Hedera node staking for Dera Protocol to provide dual yield to lenders.
 *
 * DUAL YIELD MECHANISM:
 * Lenders earn TWO sources of yield:
 * 1. Lending APY - Interest from borrowers (standard)
 * 2. Staking APY - Hedera node staking rewards (~6-8% on HBAR)
 *
 * HOW IT WORKS:
 * 1. Protocol accumulates HBAR fees → DeraNodeStaking contract
 * 2. This service stakes HBAR with Hedera consensus nodes
 * 3. Staking rewards accrue automatically (daily)
 * 4. Service claims rewards and records them on-chain
 * 5. Rewards distributed pro-rata to DST holders
 *
 * ARCHITECTURE:
 * On-Chain (DeraNodeStaking.sol):
 * - Tracks stake amounts and rewards
 * - Manages distribution to lenders
 * - Records all operations
 *
 * Off-Chain (This Service):
 * - Executes actual staking via Hedera SDK
 * - Claims rewards periodically
 * - Updates on-chain records
 * - Automates distribution
 */
class NodeStakingService {
  constructor() {
    this.hederaClient = null;
    this.provider = null;
    this.wallet = null;
    this.stakingContract = null;
    this.isRunning = false;
    this.stakedNodes = new Map(); // nodeId -> stakeInfo
    this.metrics = {
      totalStaked: 0n,
      totalRewardsClaimed: 0n,
      totalDistributed: 0n,
      currentAPY: 0,
      lastRewardClaim: null,
      operationsCount: 0,
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      logger.info('Initializing Node Staking Service...');

      // Initialize Hedera client
      if (config.NETWORK === 'mainnet') {
        this.hederaClient = Client.forMainnet();
      } else {
        this.hederaClient = Client.forTestnet();
      }

      const operatorId = AccountId.fromString(config.HEDERA_OPERATOR_ID);
      const operatorKey = PrivateKey.fromString(config.HEDERA_OPERATOR_KEY);

      this.hederaClient.setOperator(operatorId, operatorKey);

      logger.info(`✅ Hedera client initialized: ${config.NETWORK}`);
      logger.info(`   Operator Account: ${config.HEDERA_OPERATOR_ID}`);

      // Initialize Ethers for contract interaction
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
      this.wallet = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, this.provider);

      // Load DeraNodeStaking contract
      const stakingABI = require('./abis/DeraNodeStaking.json');
      this.stakingContract = new ethers.Contract(
        config.NODE_STAKING_CONTRACT_ADDRESS,
        stakingABI,
        this.wallet
      );

      logger.info(`✅ Contract loaded: ${config.NODE_STAKING_CONTRACT_ADDRESS}`);

      // Load current staking state from contract
      await this.loadStakingState();

      logger.info('✅ Node Staking Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Load current staking state from contract
   */
  async loadStakingState() {
    try {
      const stakingInfo = await this.stakingContract.getStakingInfo();

      this.metrics.totalStaked = stakingInfo.currentlyStaked;

      logger.info('📊 Current Staking State:');
      logger.info(`   Available for Staking: ${ethers.formatEther(stakingInfo.availableForStaking)} HBAR`);
      logger.info(`   Currently Staked: ${ethers.formatEther(stakingInfo.currentlyStaked)} HBAR`);
      logger.info(`   Total Rewards: ${ethers.formatEther(stakingInfo.totalRewards)} HBAR`);
      logger.info(`   Staked Nodes: ${stakingInfo.numNodes}`);

    } catch (error) {
      logger.error('Error loading staking state:', error);
    }
  }

  /**
   * Start the service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting Node Staking Service...');

    // Listen to staking events
    this.startEventListeners();

    // Schedule periodic reward claiming
    this.scheduleRewardClaiming();

    // Schedule periodic reward distribution
    this.scheduleRewardDistribution();

    // Check for pending staking operations
    await this.processPendingOperations();

    logger.info('✅ Service started successfully');
  }

  /**
   * Listen to contract events
   */
  startEventListeners() {
    logger.info('👂 Starting event listeners...');

    // Listen to NodeStaked events
    this.stakingContract.on('NodeStaked', async (nodeId, amount, timestamp, event) => {
      try {
        logger.info(`📥 NodeStaked event: Node ${nodeId}, Amount: ${ethers.formatEther(amount)} HBAR`);

        // Execute actual staking via Hedera SDK
        await this.executeStaking(Number(nodeId), amount);

      } catch (error) {
        logger.error('Error handling NodeStaked event:', error);
      }
    });

    // Listen to NodeUnstaked events
    this.stakingContract.on('NodeUnstaked', async (nodeId, amount, timestamp, event) => {
      try {
        logger.info(`📥 NodeUnstaked event: Node ${nodeId}`);

        // Execute actual unstaking via Hedera SDK
        await this.executeUnstaking(Number(nodeId));

      } catch (error) {
        logger.error('Error handling NodeUnstaked event:', error);
      }
    });

    logger.info('✅ Event listeners started');
  }

  /**
   * Execute actual staking with Hedera node via SDK
   */
  async executeStaking(nodeId, amount) {
    try {
      logger.info(`🔐 Executing stake with node ${nodeId}...`);
      logger.info(`   Amount: ${ethers.formatEther(amount)} HBAR`);

      const operatorId = AccountId.fromString(config.HEDERA_OPERATOR_ID);

      // Update account to stake with specific node
      const transaction = new AccountUpdateTransaction()
        .setAccountId(operatorId)
        .setStakedNodeId(nodeId);

      const response = await transaction.execute(this.hederaClient);
      const receipt = await response.getReceipt(this.hederaClient);

      if (receipt.status.toString() === 'SUCCESS') {
        logger.info(`✅ Successfully staked with node ${nodeId}`);

        // Store stake info
        this.stakedNodes.set(nodeId, {
          nodeId,
          amount,
          stakedAt: Date.now(),
          lastRewardClaim: Date.now(),
        });

        this.metrics.operationsCount++;

      } else {
        logger.error(`❌ Staking failed: ${receipt.status.toString()}`);
      }

    } catch (error) {
      logger.error(`Error executing staking with node ${nodeId}:`, error);
    }
  }

  /**
   * Execute unstaking from Hedera node
   */
  async executeUnstaking(nodeId) {
    try {
      logger.info(`🔓 Executing unstake from node ${nodeId}...`);

      const operatorId = AccountId.fromString(config.HEDERA_OPERATOR_ID);

      // Update account to remove staking
      const transaction = new AccountUpdateTransaction()
        .setAccountId(operatorId)
        .setStakedNodeId(null); // Remove staking

      const response = await transaction.execute(this.hederaClient);
      const receipt = await response.getReceipt(this.hederaClient);

      if (receipt.status.toString() === 'SUCCESS') {
        logger.info(`✅ Successfully unstaked from node ${nodeId}`);

        // Remove from local tracking
        this.stakedNodes.delete(nodeId);

        this.metrics.operationsCount++;

      } else {
        logger.error(`❌ Unstaking failed: ${receipt.status.toString()}`);
      }

    } catch (error) {
      logger.error(`Error executing unstaking from node ${nodeId}:`, error);
    }
  }

  /**
   * Schedule periodic reward claiming (daily at midnight UTC)
   */
  scheduleRewardClaiming() {
    logger.info('⏰ Scheduling reward claiming...');
    logger.info(`   Frequency: ${config.REWARD_CLAIM_CRON}`);

    cron.schedule(config.REWARD_CLAIM_CRON, async () => {
      logger.info('🎁 Automated reward claiming triggered');
      await this.claimAllRewards();
    });

    // Also claim immediately if last claim was > 24 hours ago
    setInterval(async () => {
      const hoursSinceLastClaim = this.metrics.lastRewardClaim
        ? (Date.now() - this.metrics.lastRewardClaim) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceLastClaim >= 24) {
        logger.info('⏰ 24 hours since last claim, claiming rewards...');
        await this.claimAllRewards();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Claim staking rewards from Hedera
   */
  async claimAllRewards() {
    try {
      logger.info('🎁 Claiming staking rewards...');

      const operatorId = AccountId.fromString(config.HEDERA_OPERATOR_ID);

      // Query account balance to see current HBAR (includes rewards)
      const balanceQuery = new AccountBalanceQuery()
        .setAccountId(operatorId);

      const balance = await balanceQuery.execute(this.hederaClient);
      const currentHbar = balance.hbars.toBigNumber();

      logger.info(`💰 Current account balance: ${balance.hbars.toString()}`);

      // On Hedera, staking rewards are automatically added to account balance
      // We need to calculate rewards earned since last claim

      // Get previous balance from contract
      const stakingInfo = await this.stakingContract.getStakingInfo();
      const previousTotal = stakingInfo.totalRewards;

      // Calculate new rewards (simplified - in production, track more accurately)
      // This is a placeholder - actual rewards calculation should use Mirror Node API
      // to query staking rewards from account info

      // For demonstration, estimate based on APY
      const estimatedDailyRewards = (this.metrics.totalStaked * BigInt(config.ESTIMATED_APY)) / (BigInt(365) * 10000n);

      if (estimatedDailyRewards > 0) {
        logger.info(`📊 Estimated daily rewards: ${ethers.formatEther(estimatedDailyRewards)} HBAR`);

        // Record rewards on-chain
        // Note: In production, query actual rewards from Hedera account info via Mirror Node
        await this.recordRewards(config.DEFAULT_NODE_ID, estimatedDailyRewards);

        this.metrics.totalRewardsClaimed += estimatedDailyRewards;
        this.metrics.lastRewardClaim = Date.now();

      } else {
        logger.info('No rewards to claim yet');
      }

    } catch (error) {
      logger.error('Error claiming rewards:', error);
    }
  }

  /**
   * Record staking rewards on-chain
   */
  async recordRewards(nodeId, rewardAmount) {
    try {
      logger.info(`📝 Recording ${ethers.formatEther(rewardAmount)} HBAR rewards for node ${nodeId}...`);

      const tx = await this.stakingContract.recordStakingRewards(
        nodeId,
        rewardAmount
      );

      logger.info(`⏳ Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        logger.info(`✅ Rewards recorded on-chain`);
        this.metrics.operationsCount++;
      } else {
        logger.error(`❌ Transaction failed`);
      }

    } catch (error) {
      logger.error('Error recording rewards:', error);
    }
  }

  /**
   * Schedule periodic reward distribution to lenders
   */
  scheduleRewardDistribution() {
    logger.info('⏰ Scheduling reward distribution...');
    logger.info(`   Frequency: ${config.DISTRIBUTION_CRON}`);

    cron.schedule(config.DISTRIBUTION_CRON, async () => {
      logger.info('💸 Automated reward distribution triggered');
      await this.distributeRewards();
    });
  }

  /**
   * Distribute rewards to asset holders
   */
  async distributeRewards() {
    try {
      logger.info('💸 Distributing rewards to lenders...');

      // Get assets to distribute to (configured in config.js)
      const assets = config.DISTRIBUTION_ASSETS;

      for (const asset of assets) {
        try {
          // Get available rewards
          const stakingInfo = await this.stakingContract.getStakingInfo();
          const availableRewards = stakingInfo.availableForStaking;

          if (availableRewards === 0n) {
            logger.info(`No rewards available for distribution to ${asset}`);
            continue;
          }

          // Distribute a portion (e.g., 10% of available)
          const distributionAmount = availableRewards / 10n;

          logger.info(`💰 Distributing ${ethers.formatEther(distributionAmount)} HBAR to ${asset}`);

          const tx = await this.stakingContract.distributeRewardsToAsset(
            asset,
            distributionAmount
          );

          const receipt = await tx.wait();

          if (receipt.status === 1) {
            logger.info(`✅ Rewards distributed to ${asset}`);
            this.metrics.totalDistributed += distributionAmount;
            this.metrics.operationsCount++;
          }

        } catch (error) {
          logger.error(`Error distributing to ${asset}:`, error.message);
        }
      }

    } catch (error) {
      logger.error('Error distributing rewards:', error);
    }
  }

  /**
   * Process any pending operations
   */
  async processPendingOperations() {
    logger.info('🔍 Checking for pending operations...');

    // Check if contract has balance that should be staked
    const stakingInfo = await this.stakingContract.getStakingInfo();
    const availableForStaking = stakingInfo.availableForStaking;

    if (availableForStaking > ethers.parseEther(config.MIN_STAKE_AMOUNT)) {
      logger.info(`💡 Found ${ethers.formatEther(availableForStaking)} HBAR available for staking`);
      logger.info(`   Threshold: ${config.MIN_STAKE_AMOUNT} HBAR`);

      // Could auto-stake here, but for safety, just log
      logger.info('⚠️  Manual staking required via admin');
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalStakedHBAR: ethers.formatEther(this.metrics.totalStaked),
      totalRewardsHBAR: ethers.formatEther(this.metrics.totalRewardsClaimed),
      totalDistributedHBAR: ethers.formatEther(this.metrics.totalDistributed),
      isRunning: this.isRunning,
      activeStakes: this.stakedNodes.size,
    };
  }

  /**
   * Stop the service
   */
  async stop() {
    logger.info('⏸️  Stopping Node Staking Service...');

    this.isRunning = false;

    // Remove event listeners
    if (this.stakingContract) {
      await this.stakingContract.removeAllListeners();
    }

    // Close Hedera client
    if (this.hederaClient) {
      this.hederaClient.close();
    }

    logger.info('✅ Service stopped');
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    logger.info('🛑 Shutting down Node Staking Service...');

    await this.stop();

    logger.info('📊 Final Metrics:');
    logger.info(JSON.stringify(this.getMetrics(), null, 2));
    logger.info('👋 Goodbye!');
  }
}

module.exports = NodeStakingService;
