import { hashpackService } from './hashpackService';

class MultiWalletManager {
  constructor() {
    this.sessions = new Map(); // accountId → { provider, metadata }
    this.defaultWallet = null;
    this.contractService = null;
  }

  // Register wallet from Redux (called after wallet connects)
  registerWallet(accountId) {
    if (this.sessions.has(accountId)) return;
    
    this.sessions.set(accountId, {
      accountId,
      network: 'testnet',
    });

    if (!this.defaultWallet) {
      this.defaultWallet = accountId;
    }
  }

  async connectWallet() {
    const accounts = await hashpackService.connectWallet();
    
    for (const account of accounts) {
      this.sessions.set(account.accountId, {
        accountId: account.accountId,
        network: account.network,
      });

      if (!this.defaultWallet) {
        this.defaultWallet = account.accountId;
      }
    }

    return accounts.map(a => a.accountId);
  }

  listConnectedWallets() {
    return Array.from(this.sessions.keys());
  }

  setDefaultWallet(accountId) {
    if (!this.sessions.has(accountId)) throw new Error('Wallet not connected');
    this.defaultWallet = accountId;
  }

  getDefaultWallet() {
    if (!this.defaultWallet) {
      const accountIds = hashpackService.getConnectedAccountIds();
      if (accountIds.length > 0) {
        this.registerWallet(accountIds[0]);
        return accountIds[0];
      }
      throw new Error('No default wallet selected');
    }
    return this.defaultWallet;
  }

  async disconnectWallet(accountId) {
    if (!this.sessions.has(accountId)) return;

    this.sessions.delete(accountId);

    if (this.defaultWallet === accountId) {
      this.defaultWallet = this.listConnectedWallets()[0] || null;
    }

    if (this.sessions.size === 0) {
      await hashpackService.disconnectWallet();
    }
  }

  async disconnectAll() {
    this.sessions.clear();
    this.defaultWallet = null;
    await hashpackService.disconnectAll();
  }

  isConnected() {
    return this.sessions.size > 0 && this.defaultWallet !== null;
  }
}

export const walletManager = new MultiWalletManager();
export default walletManager;
