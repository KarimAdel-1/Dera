/**
 * Unified Wallet Provider
 *
 * Abstraction layer for multiple Hedera wallet providers
 * Supports: HashPack, Blade
 *
 * This service provides a consistent interface for wallet operations
 * regardless of which wallet the user chooses to use.
 */

import { hashpackService } from './hashpackService';
import { bladeService } from './bladeService';

// Supported wallet types
export const WALLET_TYPES = {
  HASHPACK: 'hashpack',
  BLADE: 'blade',
};

// Wallet metadata for UI display
export const WALLET_METADATA = {
  [WALLET_TYPES.HASHPACK]: {
    name: 'HashPack',
    description: 'Most popular Hedera wallet',
    icon: '/wallets/hashpack.png',
    downloadUrl: 'https://www.hashpack.app/',
    features: ['WalletConnect', 'Multi-account', 'HTS Support'],
  },
  [WALLET_TYPES.BLADE]: {
    name: 'Blade Wallet',
    description: 'Hedera browser extension wallet',
    icon: '/wallets/blade.png',
    downloadUrl: 'https://bladewallet.io/',
    features: ['Browser Extension', 'HTS Support', 'NFT Gallery'],
  },
};

class WalletProvider {
  constructor() {
    this.currentProvider = null;
    this.currentWalletType = null;
    this.connectedAccounts = [];
  }

  /**
   * Initialize all available wallet providers
   */
  async initialize() {
    try {
      // Initialize HashPack
      await hashpackService.initialize().catch(err => {
        console.warn('HashPack initialization failed:', err);
      });

      // Initialize Blade
      await bladeService.initialize().catch(err => {
        console.warn('Blade initialization failed:', err);
      });

      // Check for previously connected wallet
      const savedWalletType = this.getSavedWalletType();
      if (savedWalletType) {
        await this.checkPreviousConnection(savedWalletType);
      }

      return true;
    } catch (error) {
      console.error('Error initializing wallet providers:', error);
      return false;
    }
  }

  /**
   * Check if user was previously connected and restore session
   */
  async checkPreviousConnection(walletType) {
    try {
      if (walletType === WALLET_TYPES.HASHPACK && hashpackService.isConnected()) {
        this.currentProvider = hashpackService;
        this.currentWalletType = WALLET_TYPES.HASHPACK;
        this.connectedAccounts = hashpackService.getConnectedAccountIds().map(id => ({
          accountId: id,
          address: id,
          walletType: WALLET_TYPES.HASHPACK,
        }));
        return true;
      }

      if (walletType === WALLET_TYPES.BLADE && bladeService.getIsConnected()) {
        this.currentProvider = bladeService;
        this.currentWalletType = WALLET_TYPES.BLADE;
        const accountId = bladeService.getConnectedAccountId();
        if (accountId) {
          this.connectedAccounts = [{
            accountId,
            address: accountId,
            walletType: WALLET_TYPES.BLADE,
          }];
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking previous connection:', error);
      return false;
    }
  }

  /**
   * Connect to a specific wallet
   * @param {string} walletType - Type of wallet (WALLET_TYPES.HASHPACK or WALLET_TYPES.BLADE)
   * @returns {Promise<Array>} Connected accounts
   */
  async connect(walletType) {
    try {
      let accounts = [];

      switch (walletType) {
        case WALLET_TYPES.HASHPACK:
          accounts = await hashpackService.connectWallet();
          this.currentProvider = hashpackService;
          this.currentWalletType = WALLET_TYPES.HASHPACK;
          this.connectedAccounts = accounts.map(acc => ({
            ...acc,
            walletType: WALLET_TYPES.HASHPACK,
          }));
          break;

        case WALLET_TYPES.BLADE:
          accounts = await bladeService.connectWallet();
          this.currentProvider = bladeService;
          this.currentWalletType = WALLET_TYPES.BLADE;
          this.connectedAccounts = accounts.map(acc => ({
            ...acc,
            walletType: WALLET_TYPES.BLADE,
          }));
          break;

        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      // Save wallet type for next session
      this.saveWalletType(walletType);

      return this.connectedAccounts;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  /**
   * Disconnect from current wallet
   */
  async disconnect() {
    try {
      if (!this.currentProvider) {
        return true;
      }

      if (this.currentWalletType === WALLET_TYPES.HASHPACK) {
        await hashpackService.disconnectWallet();
      } else if (this.currentWalletType === WALLET_TYPES.BLADE) {
        await bladeService.disconnectWallet();
      }

      this.currentProvider = null;
      this.currentWalletType = null;
      this.connectedAccounts = [];

      // Clear saved wallet type
      this.clearSavedWalletType();

      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);

      // Force clear state
      this.currentProvider = null;
      this.currentWalletType = null;
      this.connectedAccounts = [];
      this.clearSavedWalletType();

      return false;
    }
  }

  /**
   * Send a transaction using the current wallet
   * @param {object} transaction - Transaction object or Hedera SDK transaction
   * @param {string} accountId - Optional account ID (for multi-account wallets)
   * @returns {Promise<object>} Transaction result
   */
  async sendTransaction(transaction, accountId = null) {
    try {
      if (!this.currentProvider) {
        throw new Error('No wallet connected');
      }

      if (this.currentWalletType === WALLET_TYPES.HASHPACK) {
        const accountToUse = accountId || this.connectedAccounts[0]?.accountId;
        return await hashpackService.sendTransaction(accountToUse, transaction);
      }

      if (this.currentWalletType === WALLET_TYPES.BLADE) {
        return await bladeService.sendTransaction(transaction);
      }

      throw new Error('No wallet provider available');
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a message using the current wallet
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(message) {
    try {
      if (!this.currentProvider) {
        throw new Error('No wallet connected');
      }

      if (this.currentWalletType === WALLET_TYPES.BLADE) {
        return await bladeService.signMessage(message);
      }

      // HashPack doesn't have a direct signMessage method in v3
      // You would need to implement this using a transaction
      throw new Error('Message signing not supported for current wallet');
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  /**
   * Get connected accounts
   * @returns {Array} Connected accounts
   */
  getConnectedAccounts() {
    return this.connectedAccounts;
  }

  /**
   * Get current wallet type
   * @returns {string|null} Wallet type
   */
  getCurrentWalletType() {
    return this.currentWalletType;
  }

  /**
   * Check if wallet is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.currentProvider !== null && this.connectedAccounts.length > 0;
  }

  /**
   * Get available wallets (installed and detected)
   * @returns {Array} Available wallets with their metadata
   */
  getAvailableWallets() {
    const available = [];

    // Check HashPack availability (always available via WalletConnect)
    available.push({
      type: WALLET_TYPES.HASHPACK,
      ...WALLET_METADATA[WALLET_TYPES.HASHPACK],
      isInstalled: true, // Always true for WalletConnect wallets
      isAvailable: true,
    });

    // Check Blade availability (browser extension)
    const isBladeInstalled = bladeService.constructor.isInstalled();
    available.push({
      type: WALLET_TYPES.BLADE,
      ...WALLET_METADATA[WALLET_TYPES.BLADE],
      isInstalled: isBladeInstalled,
      isAvailable: isBladeInstalled,
    });

    return available;
  }

  /**
   * Get signer for contract interactions (for HashPack)
   * @param {string} accountId - Account ID to get signer for
   * @returns {object} Signer object
   */
  getSigner(accountId) {
    if (this.currentWalletType === WALLET_TYPES.HASHPACK) {
      return hashpackService.getSigner(accountId);
    }

    throw new Error('Signer not available for current wallet type');
  }

  /**
   * Save wallet type to localStorage
   * @param {string} walletType - Wallet type to save
   */
  saveWalletType(walletType) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dera_wallet_type', walletType);
    }
  }

  /**
   * Get saved wallet type from localStorage
   * @returns {string|null} Saved wallet type
   */
  getSavedWalletType() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dera_wallet_type');
    }
    return null;
  }

  /**
   * Clear saved wallet type from localStorage
   */
  clearSavedWalletType() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dera_wallet_type');
    }
  }

  /**
   * Get wallet metadata
   * @param {string} walletType - Wallet type
   * @returns {object} Wallet metadata
   */
  getWalletMetadata(walletType) {
    return WALLET_METADATA[walletType] || null;
  }

  /**
   * Switch to a different connected account (for multi-account wallets like HashPack)
   * @param {string} accountId - Account ID to switch to
   * @returns {boolean} Success status
   */
  switchAccount(accountId) {
    const account = this.connectedAccounts.find(acc => acc.accountId === accountId);
    if (!account) {
      console.error('Account not found:', accountId);
      return false;
    }

    // Move selected account to the front
    this.connectedAccounts = [
      account,
      ...this.connectedAccounts.filter(acc => acc.accountId !== accountId)
    ];

    return true;
  }

  /**
   * Get primary (first) connected account
   * @returns {object|null} Primary account
   */
  getPrimaryAccount() {
    return this.connectedAccounts[0] || null;
  }
}

// Export singleton instance
export const walletProvider = new WalletProvider();
export default walletProvider;
