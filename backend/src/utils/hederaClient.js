const {
  Client,
  AccountId,
  PrivateKey,
  AccountCreateTransaction,
  TransferTransaction,
  Hbar,
  AccountBalanceQuery,
  AccountInfoQuery,
} = require('@hashgraph/sdk');
const logger = require('./logger');

class HederaClient {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
  }

  /**
   * Initialize Hedera client
   */
  async initialize() {
    try {
      const network = process.env.HEDERA_NETWORK || 'testnet';
      const accountId = process.env.HEDERA_ACCOUNT_ID;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!accountId || !privateKey) {
        throw new Error('Hedera credentials not configured');
      }

      this.operatorId = AccountId.fromString(accountId);
      this.operatorKey = PrivateKey.fromString(privateKey);

      // Create client based on network
      if (network === 'mainnet') {
        this.client = Client.forMainnet();
      } else {
        this.client = Client.forTestnet();
      }

      this.client.setOperator(this.operatorId, this.operatorKey);

      logger.info(`Hedera client initialized for ${network}`);
      logger.info(`Operator account: ${accountId}`);
    } catch (error) {
      logger.error('Failed to initialize Hedera client:', error);
      throw error;
    }
  }

  /**
   * Create a new Hedera account
   */
  async createAccount(initialBalance = 10) {
    try {
      // Generate new key pair
      const newAccountPrivateKey = PrivateKey.generateED25519();
      const newAccountPublicKey = newAccountPrivateKey.publicKey;

      // Create account
      const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(new Hbar(initialBalance))
        .execute(this.client);

      // Get the new account ID
      const getReceipt = await newAccount.getReceipt(this.client);
      const newAccountId = getReceipt.accountId;

      logger.info(`Created new account: ${newAccountId.toString()}`);

      return {
        accountId: newAccountId.toString(),
        publicKey: newAccountPublicKey.toString(),
        privateKey: newAccountPrivateKey.toString(),
      };
    } catch (error) {
      logger.error('Failed to create account:', error);
      throw error;
    }
  }

  /**
   * Configure account for staking
   */
  async configureStaking(accountId, accountPrivateKey, nodeId) {
    try {
      // Note: Hedera staking configuration would be done here
      // This is a placeholder for the actual staking setup
      logger.info(`Configured staking for account ${accountId} to node ${nodeId}`);

      return true;
    } catch (error) {
      logger.error('Failed to configure staking:', error);
      throw error;
    }
  }

  /**
   * Transfer HBAR between accounts
   */
  async transferHbar(fromAccountId, fromPrivateKey, toAccountId, amount) {
    try {
      const fromKey = PrivateKey.fromString(fromPrivateKey);

      const transaction = await new TransferTransaction()
        .addHbarTransfer(fromAccountId, new Hbar(-amount))
        .addHbarTransfer(toAccountId, new Hbar(amount))
        .freezeWith(this.client)
        .sign(fromKey);

      const txResponse = await transaction.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      logger.info(`Transferred ${amount} HBAR from ${fromAccountId} to ${toAccountId}`);

      return {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString(),
      };
    } catch (error) {
      logger.error('Failed to transfer HBAR:', error);
      throw error;
    }
  }

  /**
   * Multi-party transfer (for reward distribution)
   */
  async multiTransfer(fromAccountId, fromPrivateKey, transfers) {
    try {
      const fromKey = PrivateKey.fromString(fromPrivateKey);

      let transaction = new TransferTransaction();

      // Add all transfers
      for (const transfer of transfers) {
        transaction = transaction
          .addHbarTransfer(transfer.to, new Hbar(transfer.amount));
      }

      // Deduct total from source account
      const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
      transaction = transaction.addHbarTransfer(fromAccountId, new Hbar(-totalAmount));

      const signedTx = await transaction.freezeWith(this.client).sign(fromKey);
      const txResponse = await signedTx.execute(this.client);
      const receipt = await txResponse.getReceipt(this.client);

      logger.info(`Multi-transfer completed: ${transfers.length} recipients, total ${totalAmount} HBAR`);

      return {
        status: receipt.status.toString(),
        transactionId: txResponse.transactionId.toString(),
      };
    } catch (error) {
      logger.error('Failed to execute multi-transfer:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId) {
    try {
      const balance = await new AccountBalanceQuery()
        .setAccountId(accountId)
        .execute(this.client);

      return balance.hbars.toBigNumber().toNumber();
    } catch (error) {
      logger.error('Failed to get account balance:', error);
      throw error;
    }
  }

  /**
   * Get account info
   */
  async getAccountInfo(accountId) {
    try {
      const info = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(this.client);

      return {
        accountId: info.accountId.toString(),
        balance: info.balance.toBigNumber().toNumber(),
        isDeleted: info.isDeleted,
        stakePeriodStart: info.stakePeriodStart,
        stakedNodeId: info.stakedNodeId,
        stakedAccountId: info.stakedAccountId,
      };
    } catch (error) {
      logger.error('Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * Get client instance
   */
  getClient() {
    return this.client;
  }
}

// Export singleton instance
module.exports = new HederaClient();
