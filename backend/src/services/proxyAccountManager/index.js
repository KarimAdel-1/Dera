const hederaClient = require('../../utils/hederaClient');
const database = require('../../utils/database');
const logger = require('../../utils/logger');
const CryptoJS = require('crypto-js');

/**
 * Proxy Account Manager Service
 *
 * Responsibilities:
 * - Create and manage Hedera accounts for staking collateral
 * - Configure staking on proxy accounts
 * - Track and distribute staking rewards
 * - Return collateral to borrowers
 */
class ProxyAccountManager {
  constructor() {
    this.masterPassword = process.env.MASTER_PASSWORD;
    this.stakingNodeId = process.env.STAKING_NODE_ID || '0.0.3';
    this.stakingPercentage = parseInt(process.env.STAKING_PERCENTAGE || '80');
    this.isEnabled = false;

    // Reward distribution percentages
    this.rewardSplit = {
      borrower: parseInt(process.env.REWARD_BORROWER_PERCENTAGE || '40'),
      protocol: parseInt(process.env.REWARD_PROTOCOL_PERCENTAGE || '30'),
      lender: parseInt(process.env.REWARD_LENDER_PERCENTAGE || '20'),
      insurance: parseInt(process.env.REWARD_INSURANCE_PERCENTAGE || '10'),
    };

    this.protocolTreasury = process.env.PROTOCOL_TREASURY_ADDRESS;
    this.insuranceFund = process.env.INSURANCE_FUND_ADDRESS;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      await hederaClient.initialize();

      // Check if Hedera client is available
      if (!hederaClient.client) {
        logger.warn('Proxy Account Manager: Hedera client not available - running in disabled mode');
        this.isEnabled = false;
        return;
      }

      if (!this.masterPassword) {
        logger.warn('Proxy Account Manager: Master password not configured - running in disabled mode');
        logger.warn('Add MASTER_PASSWORD to .env to enable proxy account management');
        this.isEnabled = false;
        return;
      }

      this.isEnabled = true;
      logger.info('Proxy Account Manager initialized');
    } catch (error) {
      logger.error('Failed to initialize Proxy Account Manager:', error);
      logger.warn('Proxy Account Manager running in degraded mode');
      this.isEnabled = false;
    }
  }

  _checkEnabled() {
    if (!this.isEnabled) {
      throw new Error('Proxy Account Manager not enabled - configure Hedera credentials and MASTER_PASSWORD in .env');
    }
  }

  /**
   * Create proxy account for a borrower
   * @param {string} borrowerAddress - Borrower's wallet address
   * @param {number} collateralAmount - Amount of HBAR collateral
   */
  async createProxyAccount(borrowerAddress, collateralAmount) {
    try {
      this._checkEnabled();
      logger.info(`Creating proxy account for ${borrowerAddress} with ${collateralAmount} HBAR collateral`);

      // Create new Hedera account
      const account = await hederaClient.createAccount(collateralAmount);

      // Encrypt private key
      const encryptedPrivateKey = this.encryptPrivateKey(account.privateKey);

      // Calculate staking amounts
      const stakedAmount = (collateralAmount * this.stakingPercentage) / 100;
      const unstakedAmount = collateralAmount - stakedAmount;

      // Configure staking
      await hederaClient.configureStaking(
        account.accountId,
        account.privateKey,
        this.stakingNodeId
      );

      // Store proxy account metadata in database
      const proxyAccountData = {
        account_id: account.accountId,
        borrower_wallet: borrowerAddress,
        public_key: account.publicKey,
        encrypted_private_key: encryptedPrivateKey,
        initial_balance: collateralAmount,
        staked_amount: stakedAmount,
        unstaked_amount: unstakedAmount,
        staking_node_id: this.stakingNodeId,
        created_at: new Date().toISOString(),
        status: 'active',
      };

      // Save to database (you'll need to create this table)
      await database.client
        .from('proxy_accounts')
        .insert(proxyAccountData);

      logger.info(`Proxy account created: ${account.accountId}`);

      return {
        accountId: account.accountId,
        stakedAmount,
        unstakedAmount,
      };
    } catch (error) {
      logger.error('Failed to create proxy account:', error);
      throw error;
    }
  }

  /**
   * Calculate and distribute staking rewards
   * @param {string} proxyAccountId - Proxy account ID
   */
  async distributeRewards(proxyAccountId) {
    try {
      logger.info(`Distributing rewards for proxy account ${proxyAccountId}`);

      // Get proxy account data from database
      const { data: proxyAccount, error } = await database.client
        .from('proxy_accounts')
        .select('*')
        .eq('account_id', proxyAccountId)
        .single();

      if (error) throw error;

      // Get current balance
      const currentBalance = await hederaClient.getAccountBalance(proxyAccountId);

      // Calculate rewards (current balance - initial balance)
      const totalRewards = currentBalance - proxyAccount.initial_balance;

      if (totalRewards <= 0) {
        logger.info(`No rewards to distribute for ${proxyAccountId}`);
        return { totalRewards: 0 };
      }

      logger.info(`Total rewards: ${totalRewards} HBAR`);

      // Calculate splits
      const borrowerReward = (totalRewards * this.rewardSplit.borrower) / 100;
      const protocolReward = (totalRewards * this.rewardSplit.protocol) / 100;
      const lenderReward = (totalRewards * this.rewardSplit.lender) / 100;
      const insuranceReward = (totalRewards * this.rewardSplit.insurance) / 100;

      // Decrypt private key
      const privateKey = this.decryptPrivateKey(proxyAccount.encrypted_private_key);

      // Prepare multi-transfer
      const transfers = [
        { to: proxyAccount.borrower_wallet, amount: borrowerReward },
        { to: this.protocolTreasury, amount: protocolReward },
        { to: this.insuranceFund, amount: insuranceReward },
      ];

      // Note: Lender reward would be distributed proportionally to all lenders
      // This would require querying active lenders and their shares
      // For simplicity, we'll add it to protocol treasury for now
      transfers[1].amount += lenderReward;

      // Execute multi-transfer
      const result = await hederaClient.multiTransfer(
        proxyAccountId,
        privateKey,
        transfers
      );

      // Log distribution
      const distributionLog = {
        proxy_account_id: proxyAccountId,
        borrower_wallet: proxyAccount.borrower_wallet,
        total_rewards: totalRewards,
        borrower_share: borrowerReward,
        protocol_share: protocolReward,
        lender_share: lenderReward,
        insurance_share: insuranceReward,
        transaction_id: result.transactionId,
        distributed_at: new Date().toISOString(),
      };

      await database.client
        .from('reward_distributions')
        .insert(distributionLog);

      logger.info(`Rewards distributed successfully for ${proxyAccountId}`);

      return {
        totalRewards,
        distribution: {
          borrower: borrowerReward,
          protocol: protocolReward,
          lender: lenderReward,
          insurance: insuranceReward,
        },
        transactionId: result.transactionId,
      };
    } catch (error) {
      logger.error('Failed to distribute rewards:', error);
      throw error;
    }
  }

  /**
   * Return collateral to borrower (on loan repayment)
   * @param {string} proxyAccountId - Proxy account ID
   * @param {string} borrowerAddress - Borrower's wallet address
   */
  async returnCollateral(proxyAccountId, borrowerAddress) {
    try {
      logger.info(`Returning collateral from ${proxyAccountId} to ${borrowerAddress}`);

      // First, distribute any pending rewards
      await this.distributeRewards(proxyAccountId);

      // Get proxy account data
      const { data: proxyAccount, error } = await database.client
        .from('proxy_accounts')
        .select('*')
        .eq('account_id', proxyAccountId)
        .single();

      if (error) throw error;

      // Get remaining balance
      const remainingBalance = await hederaClient.getAccountBalance(proxyAccountId);

      if (remainingBalance <= 0) {
        logger.warn(`No balance to return from ${proxyAccountId}`);
        return { returned: 0 };
      }

      // Decrypt private key
      const privateKey = this.decryptPrivateKey(proxyAccount.encrypted_private_key);

      // Transfer all remaining balance back to borrower
      const result = await hederaClient.transferHbar(
        proxyAccountId,
        privateKey,
        borrowerAddress,
        remainingBalance
      );

      // Update proxy account status
      await database.client
        .from('proxy_accounts')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
        })
        .eq('account_id', proxyAccountId);

      logger.info(`Collateral returned: ${remainingBalance} HBAR to ${borrowerAddress}`);

      return {
        returned: remainingBalance,
        transactionId: result.transactionId,
      };
    } catch (error) {
      logger.error('Failed to return collateral:', error);
      throw error;
    }
  }

  /**
   * Transfer collateral to liquidator
   * @param {string} proxyAccountId - Proxy account ID
   * @param {string} liquidatorAddress - Liquidator's wallet address
   * @param {number} amount - Amount to transfer (including bonus)
   */
  async transferToLiquidator(proxyAccountId, liquidatorAddress, amount) {
    try {
      logger.info(`Transferring ${amount} HBAR from ${proxyAccountId} to liquidator ${liquidatorAddress}`);

      // Get proxy account data
      const { data: proxyAccount, error } = await database.client
        .from('proxy_accounts')
        .select('*')
        .eq('account_id', proxyAccountId)
        .single();

      if (error) throw error;

      // Decrypt private key
      const privateKey = this.decryptPrivateKey(proxyAccount.encrypted_private_key);

      // Transfer to liquidator
      const result = await hederaClient.transferHbar(
        proxyAccountId,
        privateKey,
        liquidatorAddress,
        amount
      );

      // Update proxy account status
      await database.client
        .from('proxy_accounts')
        .update({
          status: 'liquidated',
          closed_at: new Date().toISOString(),
        })
        .eq('account_id', proxyAccountId);

      logger.info(`Collateral transferred to liquidator`);

      return {
        transferred: amount,
        transactionId: result.transactionId,
      };
    } catch (error) {
      logger.error('Failed to transfer to liquidator:', error);
      throw error;
    }
  }

  /**
   * Encrypt private key
   */
  encryptPrivateKey(privateKey) {
    return CryptoJS.AES.encrypt(privateKey, this.masterPassword).toString();
  }

  /**
   * Decrypt private key
   */
  decryptPrivateKey(encryptedKey) {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, this.masterPassword);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Get proxy account by ID
   */
  async getProxyAccount(accountId) {
    try {
      const { data, error } = await database.client
        .from('proxy_accounts')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get proxy account:', error);
      throw error;
    }
  }
}

module.exports = ProxyAccountManager;
