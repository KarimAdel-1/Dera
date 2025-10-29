/**
 * Blade Wallet Service
 *
 * Service for integrating with Blade Wallet on Hedera
 * Blade is a popular browser extension wallet for Hedera with support for HTS tokens
 *
 * Features:
 * - Wallet connection and disconnection
 * - Transaction signing
 * - Account management
 * - HTS token operations
 */

// Dynamic import to avoid SSR issues
let BladeSDK = null;

// Lazy load Blade SDK only on client-side
async function loadBlade() {
  if (typeof window === 'undefined') {
    return { BladeSDK: null };
  }

  if (!BladeSDK) {
    try {
      const blade = await import('@bladelabs/blade-web3.js');
      BladeSDK = blade.BladeConnector;
    } catch (error) {
      console.warn('Blade SDK not available:', error);
      return { BladeSDK: null };
    }
  }

  return { BladeSDK };
}

class BladeService {
  constructor() {
    this.blade = null;
    this.isConnected = false;
    this.accountId = null;
    this.network = 'testnet';
    this.eventListenersSetup = false;
  }

  /**
   * Initialize Blade wallet connection
   */
  async initialize() {
    try {
      if (typeof window === 'undefined') {
        console.log('Blade not available on server-side');
        return false;
      }

      const { BladeSDK: SDK } = await loadBlade();

      if (!SDK) {
        console.log('Blade SDK not available');
        return false;
      }

      // Check if Blade extension is installed
      if (!window.bladeConnector) {
        console.log('Blade wallet extension not detected');
        return false;
      }

      this.blade = window.bladeConnector;
      console.log('Blade wallet detected');

      // Setup event listeners
      this.setupEventListeners();

      // Check if already connected (from previous session)
      const isBladeConnected = await this.checkConnection();
      if (isBladeConnected) {
        console.log('Blade wallet already connected');
      }

      return true;
    } catch (error) {
      console.error('Error initializing Blade:', error);
      return false;
    }
  }

  /**
   * Check if Blade wallet is connected
   */
  async checkConnection() {
    try {
      if (!this.blade) return false;

      const params = await this.blade.getParameters();
      if (params && params.accountId) {
        this.isConnected = true;
        this.accountId = params.accountId;
        this.network = params.network || 'testnet';
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking Blade connection:', error);
      return false;
    }
  }

  /**
   * Setup event listeners for Blade wallet
   */
  setupEventListeners() {
    if (!this.blade || this.eventListenersSetup) {
      return;
    }

    // Listen for account changes
    if (this.blade.on) {
      this.blade.on('accountChanged', (accountId) => {
        console.log('Blade account changed:', accountId);
        this.accountId = accountId;

        // Emit custom event for app to handle
        window.dispatchEvent(new CustomEvent('bladeAccountChanged', {
          detail: { accountId }
        }));
      });

      // Listen for disconnection
      this.blade.on('disconnect', () => {
        console.log('Blade wallet disconnected');
        this.isConnected = false;
        this.accountId = null;

        // Emit custom event
        window.dispatchEvent(new CustomEvent('bladeDisconnected'));
      });
    }

    this.eventListenersSetup = true;
  }

  /**
   * Connect to Blade wallet
   * @returns {Promise<object>} Account information
   */
  async connectWallet() {
    try {
      if (!this.blade) {
        throw new Error('Blade not initialized. Please install Blade wallet extension.');
      }

      // Request wallet connection
      const params = await this.blade.createSession();

      if (!params || !params.accountId) {
        throw new Error('Failed to connect to Blade wallet');
      }

      this.isConnected = true;
      this.accountId = params.accountId;
      this.network = params.network || 'testnet';

      console.log('Connected to Blade:', {
        accountId: this.accountId,
        network: this.network
      });

      // Return account data in same format as HashPack for consistency
      return [{
        accountId: this.accountId,
        address: this.accountId,
        network: this.network,
      }];
    } catch (error) {
      console.error('Error connecting to Blade:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Blade wallet
   */
  async disconnectWallet() {
    try {
      if (this.blade && this.blade.killSession) {
        await this.blade.killSession();
      }

      this.isConnected = false;
      this.accountId = null;

      console.log('Disconnected from Blade');
      return true;
    } catch (error) {
      console.error('Error disconnecting from Blade:', error);

      // Force clear local state
      this.isConnected = false;
      this.accountId = null;

      return false;
    }
  }

  /**
   * Send a transaction using Blade wallet
   * @param {object} transaction - Transaction parameters
   * @returns {Promise<object>} Transaction result
   */
  async sendTransaction(transaction) {
    try {
      if (!this.isConnected || !this.accountId) {
        throw new Error('Blade wallet not connected');
      }

      if (!this.blade) {
        throw new Error('Blade not initialized');
      }

      // Blade uses different transaction format
      // Convert from Hedera SDK transaction to Blade format
      let result;

      if (transaction.contractCall) {
        // Contract execution
        result = await this.blade.contractCallFunction(
          transaction.contractId,
          transaction.functionName,
          transaction.parameters,
          transaction.gas || 100000,
          this.accountId
        );
      } else if (transaction.tokenTransfer) {
        // Token transfer
        result = await this.blade.transferTokens(
          transaction.tokenId,
          transaction.accountId,
          transaction.to,
          transaction.amount
        );
      } else {
        // Generic transaction
        result = await this.blade.sign(transaction);
      }

      return result;
    } catch (error) {
      console.error('Error sending transaction with Blade:', error);
      throw error;
    }
  }

  /**
   * Sign a message with Blade wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    try {
      if (!this.isConnected || !this.accountId) {
        throw new Error('Blade wallet not connected');
      }

      const result = await this.blade.sign({
        message,
        accountId: this.accountId
      });

      return result.signature;
    } catch (error) {
      console.error('Error signing message with Blade:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   * @returns {Promise<object>} Account balance information
   */
  async getAccountBalance() {
    try {
      if (!this.isConnected || !this.accountId) {
        throw new Error('Blade wallet not connected');
      }

      const balance = await this.blade.getBalance();
      return balance;
    } catch (error) {
      console.error('Error getting account balance:', error);
      throw error;
    }
  }

  /**
   * Get account info
   * @returns {Promise<object>} Account information
   */
  async getAccountInfo() {
    try {
      if (!this.isConnected || !this.accountId) {
        throw new Error('Blade wallet not connected');
      }

      const params = await this.blade.getParameters();
      return {
        accountId: params.accountId,
        network: params.network,
        publicKey: params.publicKey,
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  /**
   * Get connected account ID
   * @returns {string|null} Account ID
   */
  getConnectedAccountId() {
    return this.accountId;
  }

  /**
   * Check if wallet is connected
   * @returns {boolean} Connection status
   */
  getIsConnected() {
    return this.isConnected && this.accountId !== null;
  }

  /**
   * Get current network
   * @returns {string} Network name
   */
  getNetwork() {
    return this.network;
  }

  /**
   * Check if Blade wallet extension is installed
   * @returns {boolean} Installation status
   */
  static isInstalled() {
    return typeof window !== 'undefined' && !!window.bladeConnector;
  }
}

// Export singleton instance
export const bladeService = new BladeService();
export default bladeService;
