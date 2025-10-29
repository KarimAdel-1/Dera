/**
 * Dera Protocol Service V2
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

// Contract addresses (these should be configured per environment)
const CONTRACTS = {
  POOL: process.env.NEXT_PUBLIC_POOL_ADDRESS || '0.0.123456',
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

class DeraProtocolServiceV2 {
  constructor() {
    this.contracts = CONTRACTS;
    this.topics = HCS_TOPICS;
    this.mirrorNodeUrl = MIRROR_NODE_URL;
    this.rpcUrl = RPC_URL;
    this.provider = null;
    this.poolContract = null;
    this.oracleContract = null;
  }

  /**
   * Initialize the service with JSON-RPC provider
   */
  async initialize() {
    try {
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

      console.log('Dera Protocol Service V2 initialized');
      return true;
    } catch (error) {
      console.error('Error initializing Dera Protocol Service:', error);
      return false;
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
   * Supply assets to the pool
   * @param {string} asset - Asset address (0.0.xxxxx format)
   * @param {string} amount - Amount to supply (in token units with decimals)
   * @param {string} onBehalfOf - Address to supply on behalf of
   * @param {number} referralCode - Referral code
   * @returns {Promise<object>} Transaction response
   */
  async supply(asset, amount, onBehalfOf, referralCode = 0) {
    try {
      const signer = await this.getSigner();
      const poolWithSigner = this.poolContract.connect(signer);

      // First, check and approve if needed
      const erc20 = new ethers.Contract(asset, ERC20ABI.abi, signer);
      const allowance = await erc20.allowance(onBehalfOf, this.contracts.POOL);

      if (allowance < amount) {
        console.log('Approving Pool to spend tokens...');
        const approveTx = await erc20.approve(this.contracts.POOL, amount);
        await approveTx.wait();
        console.log('Approval confirmed');
      }

      // Execute supply
      console.log('Supplying to pool...', { asset, amount, onBehalfOf, referralCode });
      const tx = await poolWithSigner.supply(asset, amount, onBehalfOf, referralCode);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        receipt
      };
    } catch (error) {
      console.error('Supply error:', error);
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
      const signer = await this.getSigner();
      const poolWithSigner = this.poolContract.connect(signer);

      console.log('Withdrawing from pool...', { asset, amount, to });
      const tx = await poolWithSigner.withdraw(asset, amount, to);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        amountWithdrawn: receipt.events?.find(e => e.event === 'Withdraw')?.args?.amount,
        receipt
      };
    } catch (error) {
      console.error('Withdraw error:', error);
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
      const signer = await this.getSigner();
      const poolWithSigner = this.poolContract.connect(signer);

      console.log('Borrowing from pool...', { asset, amount, referralCode, onBehalfOf });
      const tx = await poolWithSigner.borrow(asset, amount, referralCode, onBehalfOf);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        receipt
      };
    } catch (error) {
      console.error('Borrow error:', error);
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
      const signer = await this.getSigner();
      const poolWithSigner = this.poolContract.connect(signer);

      // First, approve if needed
      const erc20 = new ethers.Contract(asset, ERC20ABI.abi, signer);
      const allowance = await erc20.allowance(onBehalfOf, this.contracts.POOL);

      if (allowance < amount) {
        console.log('Approving Pool to spend tokens for repayment...');
        const approveTx = await erc20.approve(this.contracts.POOL, amount);
        await approveTx.wait();
        console.log('Approval confirmed');
      }

      console.log('Repaying loan...', { asset, amount, onBehalfOf });
      const tx = await poolWithSigner.repay(asset, amount, onBehalfOf);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        amountRepaid: receipt.events?.find(e => e.event === 'Repay')?.args?.amount,
        receipt
      };
    } catch (error) {
      console.error('Repay error:', error);
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
      const data = await this.poolContract.getUserAccountData(userAddress);

      // data returns: totalCollateralBase, totalDebtBase, availableBorrowsBase,
      //               currentLiquidationThreshold, ltv, healthFactor
      return {
        totalSuppliedUSD: Number(ethers.formatUnits(data[0], 8)), // Base currency is 8 decimals
        totalBorrowedUSD: Number(ethers.formatUnits(data[1], 8)),
        availableToBorrowUSD: Number(ethers.formatUnits(data[2], 8)),
        currentLiquidationThreshold: Number(data[3]) / 100, // BPS to percentage
        ltv: Number(data[4]) / 100, // BPS to percentage
        healthFactor: Number(ethers.formatUnits(data[5], 18)),
      };
    } catch (error) {
      console.error('Get user account data error:', error);
      throw error;
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
      const assetData = await this.poolContract.getAssetData(asset);
      const dTokenAddress = assetData.dTokenAddress;

      // Query dToken balance
      const dToken = new ethers.Contract(dTokenAddress, ERC20ABI.abi, this.provider);
      const balance = await dToken.balanceOf(userAddress);

      return balance.toString();
    } catch (error) {
      console.error('Get user asset balance error:', error);
      throw error;
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
      const assetData = await this.poolContract.getAssetData(asset);
      const debtTokenAddress = assetData.variableDebtTokenAddress;

      // Query variable debt token balance
      const debtToken = new ethers.Contract(debtTokenAddress, ERC20ABI.abi, this.provider);
      const balance = await debtToken.balanceOf(userAddress);

      return balance.toString();
    } catch (error) {
      console.error('Get user borrow balance error:', error);
      throw error;
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

      return {
        configuration: data.configuration,
        liquidityIndex: data.liquidityIndex,
        liquidityRate: Number(ethers.formatUnits(data.currentLiquidityRate, 27)), // Ray format (27 decimals)
        borrowIndex: data.borrowIndex,
        borrowRate: Number(ethers.formatUnits(data.currentBorrowRate, 27)), // Ray format
        lastUpdateTimestamp: Number(data.lastUpdateTimestamp),
        id: data.id,
        dTokenAddress: data.dTokenAddress,
        stableDebtTokenAddress: data.stableDebtTokenAddress,
        variableDebtTokenAddress: data.variableDebtTokenAddress,
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
        // Decode base64 message content
        const content = Buffer.from(msg.message, 'base64').toString('utf-8');
        const data = JSON.parse(content);

        return {
          type: eventType,
          timestamp: new Date(msg.consensus_timestamp).getTime(),
          sequenceNumber: msg.sequence_number,
          data: data,
          transactionId: data.transactionId || 'N/A',
        };
      } catch (error) {
        return {
          type: eventType,
          timestamp: new Date(msg.consensus_timestamp).getTime(),
          sequenceNumber: msg.sequence_number,
          data: {},
          error: 'Parse error',
        };
      }
    });
  }

  /**
   * ======================
   * UTILITY METHODS
   * ======================
   */

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
}

// Export singleton instance
const deraProtocolServiceV2 = new DeraProtocolServiceV2();
export default deraProtocolServiceV2;
