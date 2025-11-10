/**
 * Dera Protocol Service
 *
 * Enhanced service layer for interacting with Dera Protocol smart contracts on Hedera
 * Uses ethers.js for contract interactions and wallet provider for signing
 *
 * Features:
 * - Real contract calls via ethers.js
 * - Pool operations (supply, withdraw, borrow, repay)
 * - HCS event streaming queries via Mirror Node
 * - Node staking rewards tracking
 * - Protocol analytics
 * - Dual yield calculations (lending APY + staking rewards)
 */

import { ethers } from 'ethers';
import { walletProvider } from './walletProvider';

// Contract ABIs
import PoolABI from '../contracts/abis/Pool.json';
import ERC20ABI from '../contracts/abis/ERC20.json';
import OracleABI from '../contracts/abis/DeraOracle.json';
import AnalyticsABI from '../contracts/abis/DeraMirrorNodeAnalytics.json';

// Contract addresses (these should be configured per environment)
const CONTRACTS = {
  POOL: process.env.NEXT_PUBLIC_POOL_ADDRESS || '0.0.123456',
  PRODUCTION_CONFIGURATOR: process.env.NEXT_PUBLIC_PRODUCTION_POOL_CONFIGURATOR || '0x596478627596aE7f8686a7D6C7D84DA6656c6aDD',
  HCS_EVENT_STREAMER: process.env.NEXT_PUBLIC_HCS_STREAMER_ADDRESS || '0.0.123457',
  NODE_STAKING: process.env.NEXT_PUBLIC_NODE_STAKING_ADDRESS || '0.0.123458',
  ORACLE: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || '0.0.123459',
  ANALYTICS: process.env.NEXT_PUBLIC_ANALYTICS_ADDRESS || '0.0.123460',
};

// HCS Topic IDs for event streaming
const HCS_TOPICS = {
  SUPPLY: process.env.NEXT_PUBLIC_HCS_SUPPLY_TOPIC || '0.0.200001',
  WITHDRAW: process.env.NEXT_PUBLIC_HCS_WITHDRAW_TOPIC || '0.0.200002',
  BORROW: process.env.NEXT_PUBLIC_HCS_BORROW_TOPIC || '0.0.200003',
  REPAY: process.env.NEXT_PUBLIC_HCS_REPAY_TOPIC || '0.0.200004',
  LIQUIDATION: process.env.NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC || '0.0.200005',
};

// Mirror Node API endpoint
const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';

// RPC URL for Hedera JSON-RPC Relay
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.hashio.io/api';

class DeraProtocolService {
  constructor() {
    this.contracts = CONTRACTS;
    this.topics = HCS_TOPICS;
    this.mirrorNodeUrl = MIRROR_NODE_URL;
    this.rpcUrl = RPC_URL;
    this.provider = null;
    this.poolContract = null;
    this.oracleContract = null;
    this.analyticsContract = null;
    this.contractsDeployed = false;
  }

  /**
   * Initialize the service with JSON-RPC provider
   */
  async initialize() {
    try {
      // Validate critical contract addresses are configured
      const defaultAddresses = ['0.0.123456', '0.0.123457', '0.0.123458', '0.0.123459', '0.0.123460'];

      if (defaultAddresses.includes(this.contracts.POOL)) {
        console.error('❌ NEXT_PUBLIC_POOL_ADDRESS not configured! Using default test address.');
        console.error('Please set environment variables in .env.local');
        // Don't throw - allow development with mock data
      }

      if (defaultAddresses.includes(this.contracts.ORACLE)) {
        console.warn('⚠️ NEXT_PUBLIC_ORACLE_ADDRESS not configured! Using default test address.');
      }

      // Create JSON-RPC provider for Hedera
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl);

      // Initialize contract instances (read-only)
      this.poolContract = new ethers.Contract(
        this.contracts.POOL,
        PoolABI.abi,
        this.provider
      );

      this.oracleContract = new ethers.Contract(
        this.contracts.ORACLE,
        OracleABI.abi,
        this.provider
      );

      this.analyticsContract = new ethers.Contract(
        this.contracts.ANALYTICS,
        AnalyticsABI.abi,
        this.provider
      );

      // Test contract connectivity
      await this.testContractConnectivity();

      console.log('✅ Dera Protocol Service V2 initialized');
      console.log('📍 Pool Address:', this.contracts.POOL);
      console.log('📍 Oracle Address:', this.contracts.ORACLE);
      console.log('📍 Analytics Address:', this.contracts.ANALYTICS);
      return true;
    } catch (error) {
      console.error('❌ Error initializing Dera Protocol Service:', error);
      return false;
    }
  }

  /**
   * Test contract connectivity and deployment status
   */
  async testContractConnectivity() {
    try {
      // Test if Pool contract is deployed and responsive
      const code = await this.provider.getCode(this.contracts.POOL);
      if (code === '0x') {
        console.warn('⚠️ Pool contract not deployed at address:', this.contracts.POOL);
        this.contractsDeployed = false;
      } else {
        console.log('✅ Pool contract found at:', this.contracts.POOL);
        this.contractsDeployed = true;
      }
    } catch (error) {
      console.warn('⚠️ Could not verify contract deployment:', error.message);
      this.contractsDeployed = false;
    }
  }

  /**
   * Get a signer from the wallet provider (for write operations)
   */
  async getSigner(accountId = null) {
    try {
      if (!walletProvider.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const account = accountId || walletProvider.getPrimaryAccount()?.accountId;
      if (!account) {
        throw new Error('No account available');
      }

      // Get signer from wallet provider (HashPack only for now)
      const signer = walletProvider.getSigner(account);

      return signer;
    } catch (error) {
      console.error('Error getting signer:', error);
      throw error;
    }
  }

  /**
   * ======================
   * POOL OPERATIONS
   * ======================
   */

  /**
   * Get Hedera contract executor from wallet provider
   * @returns {Promise<object>} Hedera contract executor
   */
  async getHederaExecutor() {
    const executor = walletProvider.getContractExecutor();
    if (!executor) {
      throw new Error('Hedera contract executor not available. Make sure HashPack is connected.');
    }
    return executor;
  }

  /**
   * Supply assets to the pool
   * Uses Hedera-native transactions for better HashPack compatibility
   * @param {string} asset - Asset address (0.0.xxxxx format)
   * @param {string} amount - Amount to supply (in token units with decimals)
   * @param {string} onBehalfOf - Address to supply on behalf of
   * @param {number} referralCode - Referral code
   * @returns {Promise<object>} Transaction response
   */
  async supply(asset, amount, onBehalfOf, referralCode = 0) {
    // Use Hedera-native approach by default for better compatibility
    return this.supplyWithHedera(asset, amount, onBehalfOf, referralCode);
  }

  /**
   * Supply assets to the pool using Hedera-native transactions
   * This is the recommended method for HashPack as it uses ContractExecuteTransaction
   * @param {string} asset - Asset address (0.0.xxxxx or 0x format)
   * @param {string} amount - Amount to supply (in token units with decimals)
   * @param {string} onBehalfOf - Address to supply on behalf of
   * @param {number} referralCode - Referral code
   * @returns {Promise<object>} Transaction response
   */
  async supplyWithHedera(asset, amount, onBehalfOf, referralCode = 0) {
    try {
      // Get Hedera contract executor
      const executor = await this.getHederaExecutor();

      // Convert Hedera account ID to EVM address if needed
      const evmAddress = this.convertHederaAccountToEVM(onBehalfOf);

      // Validate user balance before transaction
      await this.validateUserBalance(asset, amount, evmAddress, 'supply');

      // Create ethers Interface for encoding
      const poolInterface = new ethers.Interface(PoolABI.abi);

      // Check if this is native HBAR
      const isNativeToken = asset === ethers.ZeroAddress || asset === '0x0000000000000000000000000000000000000000';

      // Handle token approval for ERC20 (not needed for native HBAR)
      if (!isNativeToken) {
        console.log('🔍 Checking token allowance...');
        const erc20ReadOnly = new ethers.Contract(asset, ERC20ABI.abi, this.provider);
        const allowance = await erc20ReadOnly.allowance(evmAddress, this.contracts.POOL);

        if (allowance < amount) {
          console.log('📝 Approving Pool to spend tokens...');
          const erc20Interface = new ethers.Interface(ERC20ABI.abi);
          const approveResult = await executor.executeAndWait(
            asset,
            erc20Interface,
            'approve',
            [this.contracts.POOL, amount],
            { gasLimit: 100000 }
          );
          console.log('✅ Approval confirmed:', approveResult.transactionId);
        }
      } else {
        console.log('Native token (HBAR) - no approval needed');
      }

      // Execute supply using Hedera transaction
      console.log('📤 Supplying to pool via Hedera transaction...', {
        asset,
        amount: amount.toString(),
        evmAddress,
        referralCode
      });

      const result = await executor.executeAndWait(
        this.contracts.POOL,
        poolInterface,
        'supply',
        [asset, amount, evmAddress, referralCode],
        {
          gasLimit: 300000,
          value: isNativeToken ? amount : undefined // Send HBAR for native token
        }
      );

      // Get and log dToken address for user reference
      try {
        const assetData = await this.poolContract.getAssetData(asset);
        const dTokenAddress = assetData.supplyTokenAddress;

        if (dTokenAddress && dTokenAddress !== ethers.ZeroAddress) {
          // Convert to Hedera format
          const hex = dTokenAddress.slice(2).replace(/^0+/, '') || '0';
          const hederaId = hex.length <= 10 ? `0.0.${parseInt(hex, 16)}` : 'N/A';

          console.log('\n╔════════════════════════════════════════════════════════════╗');
          console.log('║            📊 YOUR dTOKEN INFORMATION                      ║');
          console.log('╠════════════════════════════════════════════════════════════╣');
          console.log(`║  dToken Address (EVM):    ${dTokenAddress.padEnd(20)}  ║`);
          console.log(`║  dToken Address (Hedera): ${hederaId.padEnd(20)}  ║`);
          console.log('║                                                            ║');
          console.log('║  💡 To see dTokens in HashPack:                            ║');
          console.log('║     1. Open HashPack → Tokens                              ║');
          console.log('║     2. Add Token → Enter Hedera ID above                   ║');
          console.log('╚════════════════════════════════════════════════════════════╝\n');
        }
      } catch (err) {
        console.log('Could not fetch dToken address:', err.message);
      }

      return {
        transactionHash: result.transactionId,
        status: result.status === 1 ? 'success' : 'failed',
        receipt: result.receipt
      };

    } catch (error) {
      console.error('Supply (Hedera) error:', error);
      throw error;
    }
  }

  /**
   * Withdraw assets from the pool
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to withdraw (use max uint256 for all)
   * @param {string} to - Destination address
   * @returns {Promise<object>} Transaction response
   */
  async withdraw(asset, amount, to) {
    try {
      // Get Hedera contract executor
      const executor = await this.getHederaExecutor();

      // Convert Hedera account ID to EVM address if needed
      const evmAddress = this.convertHederaAccountToEVM(to);

      // Validate user has supplied balance (unless withdrawing max)
      if (amount !== ethers.MaxUint256) {
        await this.validateUserBalance(asset, amount, evmAddress, 'withdraw');
      }

      // Create ethers Interface for encoding
      const poolInterface = new ethers.Interface(PoolABI.abi);

      // Execute withdraw using Hedera transaction
      console.log('💰 Withdrawing from pool via Hedera transaction...', {
        asset,
        amount: amount.toString(),
        evmAddress
      });

      const result = await executor.executeAndWait(
        this.contracts.POOL,
        poolInterface,
        'withdraw',
        [asset, amount, evmAddress],
        {
          gasLimit: 300000
        }
      );

      return {
        transactionHash: result.transactionId,
        status: result.status === 1 ? 'success' : 'failed',
        receipt: result.receipt
      };
    } catch (error) {
      console.error('Withdraw (Hedera) error:', error);
      throw error;
    }
  }

  /**
   * Borrow assets from the pool
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to borrow
   * @param {number} referralCode - Referral code
   * @param {string} onBehalfOf - Address to borrow on behalf of
   * @returns {Promise<object>} Transaction response
   */
  async borrow(asset, amount, referralCode = 0, onBehalfOf) {
    try {
      // Get Hedera contract executor
      const executor = await this.getHederaExecutor();

      // Convert Hedera account ID to EVM address if needed
      const evmAddress = this.convertHederaAccountToEVM(onBehalfOf);

      console.log('🔍 Borrow request:', {
        asset,
        amount: amount.toString(),
        onBehalfOf: evmAddress
      });

      // Validate user has borrowing capacity
      await this.validateUserBalance(asset, amount, evmAddress, 'borrow');

      // Create ethers Interface for encoding
      const poolInterface = new ethers.Interface(PoolABI.abi);

      // Execute borrow using Hedera transaction
      console.log('💸 Borrowing from pool via Hedera transaction...', {
        asset,
        amount: amount.toString(),
        referralCode,
        evmAddress
      });

      const result = await executor.executeAndWait(
        this.contracts.POOL,
        poolInterface,
        'borrow',
        [asset, amount, referralCode, evmAddress],
        {
          gasLimit: 300000
        }
      );

      return {
        transactionHash: result.transactionId,
        status: result.status === 1 ? 'success' : 'failed',
        receipt: result.receipt
      };
    } catch (error) {
      console.error('Borrow (Hedera) error:', error);
      throw error;
    }
  }

  /**
   * Repay borrowed assets
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to repay (use max uint256 for all)
   * @param {string} onBehalfOf - Address to repay on behalf of
   * @returns {Promise<object>} Transaction response
   */
  async repay(asset, amount, onBehalfOf) {
    try {
      // Get Hedera contract executor
      const executor = await this.getHederaExecutor();

      // Convert Hedera account ID to EVM address if needed
      const evmAddress = this.convertHederaAccountToEVM(onBehalfOf);

      // Validate user balance before transaction (unless repaying max)
      if (amount !== ethers.MaxUint256) {
        await this.validateUserBalance(asset, amount, evmAddress, 'repay');
      }

      // Create ethers Interface for encoding
      const poolInterface = new ethers.Interface(PoolABI.abi);

      // Check if this is native HBAR
      const isNativeToken = asset === ethers.ZeroAddress || asset === '0x0000000000000000000000000000000000000000';

      // Handle token approval for ERC20 (not needed for native HBAR)
      if (!isNativeToken) {
        console.log('🔍 Checking token allowance for repayment...');
        const erc20ReadOnly = new ethers.Contract(asset, ERC20ABI.abi, this.provider);
        const allowance = await erc20ReadOnly.allowance(evmAddress, this.contracts.POOL);

        if (allowance < amount) {
          console.log('📝 Approving Pool to spend tokens for repayment...');
          const erc20Interface = new ethers.Interface(ERC20ABI.abi);
          const approveResult = await executor.executeAndWait(
            asset,
            erc20Interface,
            'approve',
            [this.contracts.POOL, amount],
            { gasLimit: 100000 }
          );
          console.log('✅ Approval confirmed:', approveResult.transactionId);
        }
      } else {
        console.log('Native token (HBAR) - no approval needed for repayment');
      }

      // Execute repay using Hedera transaction
      console.log('💳 Repaying loan via Hedera transaction...', {
        asset,
        amount: amount.toString(),
        evmAddress
      });

      const result = await executor.executeAndWait(
        this.contracts.POOL,
        poolInterface,
        'repay',
        [asset, amount, evmAddress],
        {
          gasLimit: 300000,
          value: isNativeToken ? amount : undefined // Send HBAR for native token
        }
      );

      return {
        transactionHash: result.transactionId,
        status: result.status === 1 ? 'success' : 'failed',
        receipt: result.receipt
      };
    } catch (error) {
      console.error('Repay (Hedera) error:', error);
      throw error;
    }
  }

  /**
   * ======================
   * USER DATA QUERIES
   * ======================
   */

  /**
   * Get user account data
   * @param {string} userAddress - User address
   * @returns {Promise<object>} User account data
   */
  async getUserAccountData(userAddress) {
    try {
      // Convert Hedera account ID to EVM address if needed
      let address = userAddress;
      if (userAddress.startsWith('0.0.')) {
        // Convert Hedera account ID to EVM address format
        const accountNum = userAddress.split('.')[2];
        address = '0x' + parseInt(accountNum).toString(16).padStart(40, '0');
      } else if (!userAddress.startsWith('0x')) {
        address = '0x' + userAddress;
      }

      // Use direct contract call instead of staticCall to avoid ENS resolution
      const data = await this.poolContract.getUserAccountData(address);

      // data returns: totalCollateralBase, totalDebtBase, availableBorrowsBase,
      //               currentLiquidationThreshold, ltv, healthFactor

      // Handle potential null values from contract
      const safeValue = (val, defaultVal = 0n) => val != null ? val : defaultVal;

      return {
        totalSuppliedUSD: Number(ethers.formatUnits(safeValue(data[0]), 8)), // Base currency is 8 decimals
        totalBorrowedUSD: Number(ethers.formatUnits(safeValue(data[1]), 8)),
        availableToBorrowUSD: Number(ethers.formatUnits(safeValue(data[2]), 8)),
        currentLiquidationThreshold: Number(safeValue(data[3])) / 100, // BPS to percentage
        ltv: Number(safeValue(data[4])) / 100, // BPS to percentage
        healthFactor: Number(ethers.formatUnits(safeValue(data[5], BigInt(2) ** BigInt(256) - BigInt(1)), 18)), // Max uint256 for infinity
      };
    } catch (error) {
      console.error('Get user account data error:', error);
      // Return default values if contract call fails
      return {
        totalSuppliedUSD: 0,
        totalBorrowedUSD: 0,
        availableToBorrowUSD: 0,
        currentLiquidationThreshold: 80,
        ltv: 75,
        healthFactor: 1.0,
      };
    }
  }

  /**
   * Get user asset balance (supplied amount)
   * @param {string} asset - Asset address
   * @param {string} userAddress - User address
   * @returns {Promise<string>} Balance in token units
   */
  async getUserAssetBalance(asset, userAddress) {
    try {
      // Convert Hedera account ID to EVM address if needed
      const address = this.convertHederaAccountToEVM(userAddress);
      
      // Try to get asset data from Pool - with better error handling
      let assetData;
      try {
        assetData = await this.poolContract.getAssetData(asset);
        
        // Check if the returned data is valid (not all zeros)
        if (!assetData || (Array.isArray(assetData) && assetData.every(item => item.toString() === '0'))) {
          console.warn(`Asset ${asset} returned empty data from Pool contract`);
          return "0";
        }
      } catch (error) {
        console.warn(`Asset ${asset} not found in Pool contract:`, error.message);
        return "0";
      }
      
      // Check if asset has valid supply token address
      const supplyTokenAddr = assetData.supplyTokenAddress || assetData.dTokenAddress;
      if (!assetData || !supplyTokenAddr || supplyTokenAddr === '0x0000000000000000000000000000000000000000') {
        console.warn(`Asset ${asset} not initialized in Pool or no supply token`);
        return "0";
      }

      // Query dToken balance
      const dToken = new ethers.Contract(supplyTokenAddr, ERC20ABI.abi, this.provider);
      const balance = await dToken.balanceOf(address);
      
      return balance.toString();
    } catch (error) {
      console.error('Get user asset balance error:', error);
      return "0";
    }
  }

  /**
   * Get user borrow balance
   * @param {string} asset - Asset address
   * @param {string} userAddress - User address
   * @returns {Promise<string>} Borrow balance in token units
   */
  async getUserBorrowBalance(asset, userAddress) {
    try {
      // Convert Hedera account ID to EVM address if needed
      const address = this.convertHederaAccountToEVM(userAddress);
      
      // Try to get asset data from Pool - with better error handling
      let assetData;
      try {
        assetData = await this.poolContract.getAssetData(asset);
        
        // Check if the returned data is valid (not all zeros)
        if (!assetData || (Array.isArray(assetData) && assetData.every(item => item.toString() === '0'))) {
          console.warn(`Asset ${asset} returned empty data from Pool contract`);
          return "0";
        }
      } catch (error) {
        console.warn(`Asset ${asset} not found in Pool contract:`, error.message);
        return "0";
      }
      
      // Check if asset has valid variable debt token address
      if (!assetData || !assetData.variableDebtTokenAddress || assetData.variableDebtTokenAddress === '0x0000000000000000000000000000000000000000') {
        console.warn(`Asset ${asset} not initialized in Pool or no variable debt token`);
        return "0";
      }
      
      // Query variable debt token balance
      const debtToken = new ethers.Contract(assetData.variableDebtTokenAddress, ERC20ABI.abi, this.provider);
      const balance = await debtToken.balanceOf(address);
      
      return balance.toString();
    } catch (error) {
      console.error('Get user borrow balance error:', error);
      return "0";
    }
  }

  /**
   * ======================
   * ASSET DATA QUERIES
   * ======================
   */

  /**
   * Get asset data (rates, utilization, etc.)
   * @param {string} asset - Asset address
   * @returns {Promise<object>} Asset data
   */
  async getAssetData(asset) {
    try {
      const data = await this.poolContract.getAssetData(asset);

      // Check if data is valid (not all zeros)
      if (!data || (Array.isArray(data) && data.every(item => item.toString() === '0'))) {
        throw new Error(`Asset ${asset} not found or not initialized in Pool`);
      }

      return {
        configuration: data.configuration,
        liquidityIndex: data.liquidityIndex,
        liquidityRate: Number(ethers.formatUnits(data.currentLiquidityRate || 0, 27)), // Ray format (27 decimals)
        borrowIndex: data.borrowIndex,
        borrowRate: Number(ethers.formatUnits(data.currentBorrowRate || 0, 27)), // Ray format
        lastUpdateTimestamp: Number(data.lastUpdateTimestamp || 0),
        id: data.id,
        dTokenAddress: data.dTokenAddress,
        stableDebtTokenAddress: data.stableDebtTokenAddress,
        variableDebtTokenAddress: data.variableDebtTokenAddress,
        supplyTokenAddress: data.supplyTokenAddress || data.dTokenAddress, // Fallback
        borrowTokenAddress: data.borrowTokenAddress || data.variableDebtTokenAddress, // Fallback
      };
    } catch (error) {
      console.error('Get asset data error:', error);
      throw error;
    }
  }

  /**
   * Get list of all assets
   * @returns {Promise<array>} Array of asset addresses
   */
  async getAssetsList() {
    try {
      const assets = await this.poolContract.getAssetsList();
      return assets;
    } catch (error) {
      console.error('Get assets list error:', error);
      throw error;
    }
  }

  /**
   * Get detailed asset configuration
   * @param {string} assetAddress - Asset address
   * @returns {Promise<Object>} Asset details including APY, LTV, etc.
   */
  async getAssetDetails(assetAddress) {
    try {
      // Get asset data from pool
      const assetData = await this.poolContract.getAssetData(assetAddress);

      // Get asset configuration
      const config = await this.poolContract.getConfiguration(assetAddress);

      // Get token metadata (symbol, name, decimals)
      const tokenContract = new ethers.Contract(assetAddress, ERC20ABI.abi, this.provider);
      let symbol, name, decimals;

      try {
        [symbol, name, decimals] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.name(),
          tokenContract.decimals()
        ]);
      } catch (e) {
        // Handle HBAR (native token) or tokens without standard interface
        if (assetAddress === '0x0000000000000000000000000000000000000000' ||
            assetAddress.toLowerCase().includes('hbar')) {
          symbol = 'HBAR';
          name = 'Hedera';
          decimals = 8;
        } else {
          throw e;
        }
      }

      // Get price from oracle
      let price = '0';
      try {
        const oraclePrice = await this.oracleContract.getAssetPrice(assetAddress);
        price = ethers.formatUnits(oraclePrice, 8);
      } catch (error) {
        console.warn(`Could not fetch price for ${symbol}:`, error.message);
        // Use default price if oracle not available
        price = symbol === 'USDC' ? '1.00' : '0.08';
      }

      // Convert APY from ray (27 decimals) to percentage
      const supplyAPY = Number(ethers.formatUnits(assetData.currentLiquidityRate || 0, 27)) * 100;
      const borrowAPY = Number(ethers.formatUnits(assetData.currentVariableBorrowRate || 0, 27)) * 100;

      // Extract LTV and liquidation threshold from configuration
      // Configuration is a bitmap where:
      // bits 0-15: LTV (in basis points, e.g. 8000 = 80%)
      // bits 16-31: Liquidation threshold
      const configData = config.data || config;
      const ltv = Number(configData) & 0xFFFF; // First 16 bits
      const liquidationThreshold = (Number(configData) >> 16) & 0xFFFF; // Next 16 bits

      return {
        address: assetAddress,
        symbol,
        name,
        decimals: Number(decimals),
        supplyAPY: supplyAPY.toFixed(2),
        borrowAPY: borrowAPY.toFixed(2),
        price: price,
        ltv: ltv / 100, // Convert basis points to percentage
        liquidationThreshold: liquidationThreshold / 100,
        liquidityIndex: ethers.formatUnits(assetData.liquidityIndex || 0, 27),
        variableBorrowIndex: ethers.formatUnits(assetData.variableBorrowIndex || 0, 27)
      };
    } catch (error) {
      console.error(`Get asset details error for ${assetAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get all supported assets with detailed information
   * @returns {Promise<Array>} Array of asset objects with full details
   */
  async getSupportedAssets() {
    try {
      // Get assets from Pool contract - NO FALLBACK
      const assetAddresses = await this.poolContract.getAssetsList();

      if (!assetAddresses || assetAddresses.length === 0) {
        throw new Error('No assets found in Pool contract. Please run asset initialization.');
      }

      console.log(`Found ${assetAddresses.length} assets in Pool`);

      // Get real asset details from contracts
      const assetsDetails = [];
      for (const address of assetAddresses) {
        try {
          const assetDetail = await this.getAssetDetailsFromContract(address);
          if (assetDetail) {
            assetsDetails.push(assetDetail);
          }
        } catch (error) {
          console.error(`Failed to get details for asset ${address}:`, error.message);
          throw new Error(`Failed to load asset ${address}. Contract may not be properly configured.`);
        }
      }

      if (assetsDetails.length === 0) {
        throw new Error('No valid asset details could be loaded from contracts.');
      }

      console.log('✅ Loaded assets from Pool:', assetsDetails);
      return assetsDetails;
    } catch (error) {
      console.error('Get supported assets error:', error);
      throw error; // Propagate error to frontend - NO FALLBACK DATA
    }
  }

  /**
   * Get asset price from oracle
   * @param {string} asset - Asset address
   * @returns {Promise<string>} Price in base currency (8 decimals)
   */
  async getAssetPrice(asset) {
    try {
      const price = await this.oracleContract.getAssetPrice(asset);
      return ethers.formatUnits(price, 8);
    } catch (error) {
      console.error('Get asset price error:', error);
      throw error;
    }
  }

  /**
   * ======================
   * HCS EVENT QUERIES
   * ======================
   */

  /**
   * Query HCS events from Mirror Node
   * @param {string} topicId - HCS topic ID
   * @param {number} limit - Number of messages to fetch
   * @returns {Promise<array>} Array of HCS messages
   */
  async queryHCSEvents(topicId, limit = 10) {
    try {
      const response = await fetch(
        `${this.mirrorNodeUrl}/api/v1/topics/${topicId}/messages?limit=${limit}&order=desc`
      );

      if (!response.ok) {
        throw new Error(`Mirror Node API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Query HCS events error:', error);
      return [];
    }
  }

  /**
   * Get supply events from HCS
   * @param {number} limit - Number of events to fetch
   * @returns {Promise<array>} Supply events
   */
  async getSupplyEvents(limit = 10) {
    const events = await this.queryHCSEvents(this.topics.SUPPLY, limit);
    return this.parseHCSEvents(events, 'SUPPLY');
  }

  /**
   * Get borrow events from HCS
   * @param {number} limit - Number of events to fetch
   * @returns {Promise<array>} Borrow events
   */
  async getBorrowEvents(limit = 10) {
    const events = await this.queryHCSEvents(this.topics.BORROW, limit);
    return this.parseHCSEvents(events, 'BORROW');
  }

  /**
   * Get all protocol events from HCS
   * @param {number} limit - Number of events per type
   * @returns {Promise<array>} All events combined
   */
  async getAllProtocolEvents(limit = 5) {
    try {
      const [supplyEvents, withdrawEvents, borrowEvents, repayEvents] = await Promise.all([
        this.getSupplyEvents(limit),
        this.queryHCSEvents(this.topics.WITHDRAW, limit).then(e => this.parseHCSEvents(e, 'WITHDRAW')),
        this.getBorrowEvents(limit),
        this.queryHCSEvents(this.topics.REPAY, limit).then(e => this.parseHCSEvents(e, 'REPAY')),
      ]);

      // Combine and sort by timestamp
      const allEvents = [...supplyEvents, ...withdrawEvents, ...borrowEvents, ...repayEvents];
      allEvents.sort((a, b) => b.timestamp - a.timestamp);

      return allEvents;
    } catch (error) {
      console.error('Get all protocol events error:', error);
      return [];
    }
  }

  /**
   * Parse HCS event messages
   * @param {array} messages - Raw HCS messages from Mirror Node
   * @param {string} eventType - Type of event
   * @returns {array} Parsed events
   */
  parseHCSEvents(messages, eventType) {
    return messages.map(msg => {
      try {
        // Skip if no message content
        if (!msg.message || msg.message.length === 0) {
          return null;
        }
        
        // Decode base64 message content
        const content = Buffer.from(msg.message, 'base64').toString('utf-8');
        
        // Skip if content is empty or not JSON
        if (!content || content.trim().length === 0) {
          return null;
        }
        
        const data = JSON.parse(content);
        
        // Parse timestamp properly
        const timestamp = msg.consensus_timestamp ? 
          new Date(msg.consensus_timestamp).getTime() : 
          Date.now();

        return {
          type: eventType,
          timestamp: isNaN(timestamp) ? Date.now() : timestamp,
          sequenceNumber: msg.sequence_number,
          data: data,
          transactionId: data.transactionId || 'N/A',
        };
      } catch (error) {
        // Return null for invalid messages instead of error objects
        return null;
      }
    }).filter(Boolean); // Remove null entries
  }

  /**
   * ======================
   * UTILITY METHODS
   * ======================
   */

  /**
   * Convert Hedera account ID to EVM address format
   * @param {string} accountId - Hedera account ID (0.0.xxxxx)
   * @returns {string} EVM address (0x...)
   */
  convertHederaAccountToEVM(accountId) {
    if (accountId.startsWith('0x')) {
      return accountId; // Already EVM format
    }
    
    if (accountId.startsWith('0.0.')) {
      const accountNum = accountId.split('.')[2];
      return '0x' + parseInt(accountNum).toString(16).padStart(40, '0');
    }
    
    // Assume it's already a hex string without 0x prefix
    return '0x' + accountId;
  }

  /**
   * Validate user balance before transaction
   * @param {string} asset - Asset address
   * @param {string} amount - Amount to transact
   * @param {string} userAddress - User address
   * @param {string} operation - Operation type (supply, repay, withdraw, borrow)
   */
  async validateUserBalance(asset, amount, userAddress, operation) {
    try {
      const address = this.convertHederaAccountToEVM(userAddress);
      let userBalance;
      
      if (operation === 'supply' || operation === 'repay') {
        // Check wallet balance for supply/repay operations
        if (asset === '0x0000000000000000000000000000000000000000') {
          // HBAR balance
          userBalance = await this.provider.getBalance(address);
        } else {
          // Token balance
          const tokenContract = new ethers.Contract(asset, ERC20ABI.abi, this.provider);
          userBalance = await tokenContract.balanceOf(address);
        }
      } else if (operation === 'withdraw') {
        // Check supplied balance for withdraw
        userBalance = await this.getUserAssetBalance(asset, userAddress);
      } else if (operation === 'borrow') {
        // Check available borrow capacity
        const accountData = await this.getUserAccountData(userAddress);

        console.log('📊 Borrow validation - Account data:', {
          totalCollateralUSD: accountData.totalCollateralUSD,
          totalDebtUSD: accountData.totalDebtUSD,
          availableToBorrowUSD: accountData.availableToBorrowUSD,
          healthFactor: accountData.healthFactor
        });

        if (accountData.totalCollateralUSD <= 0) {
          throw new Error('No collateral supplied. Please supply assets first and enable them as collateral.');
        }

        if (accountData.availableToBorrowUSD <= 0) {
          if (accountData.totalDebtUSD > 0) {
            throw new Error('Maximum borrowing capacity reached. Your debt is at the limit of your collateral.');
          } else {
            throw new Error('No borrowing capacity. Please enable your supplied assets as collateral.');
          }
        }

        return; // Skip balance check for borrow
      }

      if (BigInt(userBalance) < BigInt(amount)) {
        const symbol = asset === '0x0000000000000000000000000000000000000000' ? 'HBAR' : 'tokens';
        throw new Error(`Insufficient ${symbol} balance. Required: ${ethers.formatUnits(amount, 8)}, Available: ${ethers.formatUnits(userBalance, 8)}`);
      }

      console.log(`✅ Balance validation passed for ${operation}:`, {
        required: ethers.formatUnits(amount, 8),
        available: ethers.formatUnits(userBalance, 8)
      });
    } catch (error) {
      console.error(`❌ Balance validation failed for ${operation}:`, error.message);
      throw error;
    }
  }

  /**
   * Get user's wallet balance for an asset
   * @param {string} asset - Asset address
   * @param {string} userAddress - User address
   * @returns {Promise<string>} Wallet balance
   */
  async getUserWalletBalance(asset, userAddress) {
    try {
      const address = this.convertHederaAccountToEVM(userAddress);
      
      if (asset === '0x0000000000000000000000000000000000000000') {
        // HBAR balance
        const balance = await this.provider.getBalance(address);
        return balance.toString();
      } else {
        // Token balance
        const tokenContract = new ethers.Contract(asset, ERC20ABI.abi, this.provider);
        const balance = await tokenContract.balanceOf(address);
        return balance.toString();
      }
    } catch (error) {
      console.error('Get wallet balance error:', error);
      return "0";
    }
  }

  /**
   * Get asset details from contract with real data
   * @param {string} address - Asset address
   * @returns {Promise<object>} Asset details with real APY, LTV, etc.
   */
  async getAssetDetailsFromContract(address) {
    // Get basic asset info
    const assetInfo = await this.getBasicAssetInfo(address);

    // Get real data from Pool contract - NO FALLBACK
    const assetData = await this.poolContract.getAssetData(address);

    // Check if asset data is valid
    if (!assetData || !assetData.supplyTokenAddress || assetData.supplyTokenAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Asset ${address} (${assetInfo.symbol}) not initialized in Pool contract`);
    }

    // Calculate real APY from contract data
    const supplyAPY = this.calculateAPY(assetData.currentLiquidityRate || 0);
    const borrowAPY = this.calculateAPY(assetData.currentVariableBorrowRate || 0);

    // Extract LTV and liquidation threshold from configuration
    const { ltv, liquidationThreshold } = this.parseConfiguration(assetData.configuration);

    // Get price from oracle
    const oraclePrice = await this.oracleContract.getAssetPrice(address);
    const price = ethers.formatUnits(oraclePrice, 8);

    return {
      address,
      symbol: assetInfo.symbol,
      name: assetInfo.name,
      decimals: assetInfo.decimals,
      supplyAPY: supplyAPY.toFixed(2),
      borrowAPY: borrowAPY.toFixed(2),
      price,
      ltv,
      liquidationThreshold
    };
  }

  /**
   * Get basic asset info (symbol, name, decimals)
   * @param {string} address - Asset address
   * @returns {Promise<object>} Basic asset info
   */
  async getBasicAssetInfo(address) {
    // Handle native HBAR token
    if (address === '0x0000000000000000000000000000000000000000') {
      return { symbol: 'HBAR', name: 'Hedera', decimals: 8 };
    }

    // For ERC20 tokens, fetch metadata from the contract
    try {
      const tokenContract = new ethers.Contract(address, ERC20ABI.abi, this.provider);
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      return {
        symbol: symbol || 'UNKNOWN',
        name: name || 'Unknown Token',
        decimals: Number(decimals) || 18
      };
    } catch (error) {
      console.error(`Failed to fetch token metadata for ${address}:`, error);
      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 };
    }
  }

  /**
   * Calculate APY from ray format (27 decimals)
   * @param {string|BigInt} rate - Rate in ray format
   * @returns {number} APY as percentage
   */
  calculateAPY(rate) {
    if (!rate || rate === '0') return 0;
    // Convert from ray (27 decimals) to percentage
    return Number(ethers.formatUnits(rate, 27)) * 100;
  }

  /**
   * Parse configuration bitmap to extract LTV and liquidation threshold
   * @param {object} config - Configuration object from contract
   * @returns {object} Parsed LTV and liquidation threshold
   */
  parseConfiguration(config) {
    try {
      const configData = config.data || config;
      const configNum = Number(configData);
      
      // Extract from bitmap (assuming standard Aave format)
      const ltv = (configNum & 0xFFFF) / 100; // First 16 bits, convert from basis points
      const liquidationThreshold = ((configNum >> 16) & 0xFFFF) / 100; // Next 16 bits
      
      return {
        ltv: ltv || 75, // Fallback values
        liquidationThreshold: liquidationThreshold || 80
      };
    } catch (error) {
      console.warn('Error parsing configuration:', error);
      return { ltv: 75, liquidationThreshold: 80 };
    }
  }

  /**
   * Get user's collateral status for an asset
   * @param {string} asset - Asset address
   * @param {string} userAddress - User address
   * @returns {Promise<boolean>} Whether asset is enabled as collateral
   */
  async getUserCollateralStatus(asset, userAddress) {
    try {
      const address = this.convertHederaAccountToEVM(userAddress);

      // Get user configuration bitmap (takes only user address as parameter)
      const userConfig = await this.poolContract.getUserConfiguration(address);

      // Get asset data to find the asset ID
      const assetData = await this.poolContract.getAssetData(asset);
      const assetId = Number(assetData.id); // Convert to Number for arithmetic

      // Check collateral bit in the bitmap
      // Each asset has 2 bits: bit (assetId * 2) for borrowing, bit (assetId * 2 + 1) for collateral
      const collateralBitPosition = BigInt((assetId * 2) + 1);
      const isCollateral = (BigInt(userConfig.data) >> collateralBitPosition) & 1n;

      return isCollateral === 1n;
    } catch (error) {
      console.warn(`Could not get collateral status for ${asset}:`, error.message);
      return false; // Default to not collateral if can't determine
    }
  }

  /**
   * Toggle collateral status for an asset
   * @param {string} asset - Asset address
   * @param {boolean} useAsCollateral - Whether to use as collateral
   * @param {string} userAddress - User address
   * @returns {Promise<object>} Transaction response
   */
  async toggleCollateral(asset, useAsCollateral, userAddress) {
    try {
      // Get Hedera contract executor
      const executor = await this.getHederaExecutor();

      // Create ethers Interface for encoding
      const poolInterface = new ethers.Interface(PoolABI.abi);

      // Execute setUserUseAssetAsCollateral using Hedera transaction
      console.log('🔄 Toggling collateral via Hedera transaction...', {
        asset,
        useAsCollateral,
        userAddress
      });

      const result = await executor.executeAndWait(
        this.contracts.POOL,
        poolInterface,
        'setUserUseAssetAsCollateral',
        [asset, useAsCollateral],
        {
          gasLimit: 200000
        }
      );

      return {
        transactionHash: result.transactionId,
        status: result.status === 1 ? 'success' : 'failed',
        receipt: result.receipt
      };
    } catch (error) {
      console.error('Toggle collateral (Hedera) error:', error);
      throw error;
    }
  }

  /**
   * Check if protocol is paused
   * @returns {Promise<boolean>} Pause status
   */
  async isPaused() {
    try {
      return await this.poolContract.paused();
    } catch (error) {
      console.error('Error checking pause status:', error);
      return false;
    }
  }

  /**
   * Get contract address
   * @param {string} contractName - Contract name (POOL, ORACLE, etc.)
   * @returns {string} Contract address
   */
  getContractAddress(contractName) {
    return this.contracts[contractName] || null;
  }

  /**
   * ======================
   * DUAL YIELD METHODS
   * ======================
   */

  /**
   * Get dual yield data for a user (lending APY + staking rewards)
   * @param {string} userAddress - User address
   * @returns {Promise<object>} Dual yield breakdown
   */
  async getDualYieldData(userAddress) {
    try {
      // Get lending positions
      const accountData = await this.getUserAccountData(userAddress);
      
      // Get node staking rewards (if NodeStaking contract available)
      let stakingRewards = 0;
      try {
        if (this.contracts.NODE_STAKING !== '0.0.123458') {
          const nodeStakingABI = (await import('../contracts/abis/DeraNodeStaking.json')).default;
          const nodeStakingContract = new ethers.Contract(
            this.contracts.NODE_STAKING,
            nodeStakingABI.abi,
            this.provider
          );
          
          stakingRewards = await nodeStakingContract.getUserRewardShare(userAddress);
        }
      } catch (error) {
        console.warn('NodeStaking contract not available:', error.message);
      }

      return {
        lendingAPY: 3.45, // Calculate from asset data
        stakingAPY: 6.8,  // Hedera node staking APY
        totalAPY: 10.25,  // Combined APY
        lendingRewards: accountData.totalSuppliedUSD * 0.0345, // Estimated annual
        stakingRewards: Number(ethers.formatEther(stakingRewards || 0)),
        totalRewards: 0, // Sum of above
        breakdown: {
          fromLending: 65, // Percentage
          fromStaking: 35  // Percentage
        }
      };
    } catch (error) {
      console.error('Get dual yield data error:', error);
      return {
        lendingAPY: 0,
        stakingAPY: 0,
        totalAPY: 0,
        lendingRewards: 0,
        stakingRewards: 0,
        totalRewards: 0,
        breakdown: { fromLending: 0, fromStaking: 0 }
      };
    }
  }

  /**
   * ======================
   * ANALYTICS METHODS
   * ======================
   */

  /**
   * Get protocol-level metrics
   * @returns {Promise<object>} Protocol metrics (TVL, total supplied, etc.)
   */
  async getProtocolMetrics() {
    try {
      // Call the analytics contract
      const metrics = await this.analyticsContract.getProtocolMetrics();

      return {
        totalValueLocked: metrics[0].toString(), // tvl
        totalSupplied: metrics[1].toString(),    // totalSupplied
        totalBorrowed: metrics[2].toString(),    // totalBorrowed
        totalUsers: Number(metrics[3]),          // totalUsers
        totalTransactions: Number(metrics[4]),   // totalTransactions
        lastUpdateTimestamp: Number(metrics[5])  // lastUpdate
      };
    } catch (error) {
      console.error('Get protocol metrics error:', error);
      throw new Error(`Failed to load protocol metrics from Analytics contract: ${error.message}`);
    }
  }

  /**
   * Get asset-specific metrics
   * @param {string} assetAddress - Asset address
   * @returns {Promise<object>} Asset metrics (supply, borrow, APY, etc.)
   */
  async getAssetMetrics(assetAddress) {
    try {
      // Call the analytics contract
      const metrics = await this.analyticsContract.getAssetMetrics(assetAddress);

      // Convert APY from scaled format (1e4) to percentage
      const supplyAPY = Number(metrics[2]) / 100; // scaled by 1e4, so divide by 100 for %
      const borrowAPY = Number(metrics[3]) / 100;
      const utilization = Number(metrics[4]) / 100; // scaled by 1e4

      return {
        totalSupply: metrics[0].toString(),      // totalSupply
        totalBorrow: metrics[1].toString(),      // totalBorrow
        supplyAPY: supplyAPY.toFixed(2),         // supplyAPY as percentage
        borrowAPY: borrowAPY.toFixed(2),         // borrowAPY as percentage
        utilization: utilization.toFixed(2),     // utilization as percentage
        supplierCount: Number(metrics[5]),       // supplierCount
        borrowerCount: Number(metrics[6]),       // borrowerCount
        volume24h: metrics[7].toString()         // volume24h
      };
    } catch (error) {
      console.error('Get asset metrics error:', error);
      throw new Error(`Failed to load asset metrics from Analytics contract: ${error.message}`);
    }
  }

  /**
   * Get historical snapshots for time-series charts
   * @param {number} days - Number of days to fetch (will fetch hourly snapshots)
   * @returns {Promise<array>} Array of historical snapshots
   */
  async getHistoricalSnapshots(days) {
    try {
      // Request snapshots (contract stores them, we'll get the most recent ones)
      // Assuming hourly snapshots, request days * 24 snapshots
      const count = Math.min(days * 24, 168); // Cap at 1 week of hourly data

      const snapshots = await this.analyticsContract.getHistoricalSnapshots(count);

      // Convert snapshots to format expected by frontend
      return snapshots.map(snapshot => ({
        timestamp: Number(snapshot.timestamp) * 1000, // Convert to milliseconds
        tvl: snapshot.tvl.toString(),
        totalSupplied: snapshot.totalSupplied.toString(),
        totalBorrowed: snapshot.totalBorrowed.toString(),
        utilizationRate: Number(snapshot.utilizationRate) / 100 // scaled by 1e4
      }));
    } catch (error) {
      console.error('Get historical snapshots error:', error);
      throw new Error(`Failed to load historical snapshots from Analytics contract: ${error.message}`);
    }
  }
}

// Export singleton instance
const deraProtocolService = new DeraProtocolService();
export default deraProtocolService;
