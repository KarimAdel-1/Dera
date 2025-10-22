const cron = require('node-cron');
const { ethers } = require('ethers');
const database = require('../../utils/database');
const logger = require('../../utils/logger');
const { convertHederaPrivateKey } = require('../../utils/keyConverter');

/**
 * Health Monitor Service
 * Monitors loan health factors and triggers liquidations
 */
class HealthMonitor {
  constructor() {
    this.cronJob = null;
    this.provider = null;
    this.borrowingContract = null;
    this.liquidationThreshold = parseFloat(process.env.LIQUIDATION_THRESHOLD || '1.0');
    this.warningThreshold = parseFloat(process.env.WARNING_THRESHOLD || '1.2');
  }

  async start() {
    try {
      // Check if contract address is configured
      const borrowingAddress = process.env.BORROWING_CONTRACT_ADDRESS;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!borrowingAddress || !privateKey) {
        logger.warn('Health Monitor Service: Contract address not configured - running in disabled mode');
        logger.warn('Deploy contracts and add BORROWING_CONTRACT_ADDRESS to .env to enable this service');
        return;
      }

      // Initialize ethers provider
      const network = process.env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
      const rpcUrl = network === 'mainnet'
        ? 'https://mainnet.hashio.io/api'
        : 'https://testnet.hashio.io/api';

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Convert Hedera DER key to raw format for ethers
      const rawPrivateKey = convertHederaPrivateKey(privateKey);
      const wallet = new ethers.Wallet(rawPrivateKey, this.provider);

      const borrowingAbi = [
        'function calculateHealthFactor(address borrower) external view returns (uint256)',
        'function liquidate(address borrower) external payable',
        'function getLoan(address borrower) external view returns (tuple(uint256 collateralAmount, uint256 borrowedAmountUSD, uint256 borrowedAmountHBAR, uint256 interestRate, uint256 lastInterestUpdate, uint256 accruedInterest, uint256 iScore, address proxyAccountId, bool active, uint256 createdAt))',
      ];

      this.borrowingContract = new ethers.Contract(borrowingAddress, borrowingAbi, wallet);

      // Start health check cron job (every hour)
      this.cronJob = cron.schedule('0 * * * *', async () => {
        await this.checkAllLoans();
      });

      // Initial check
      await this.checkAllLoans();

      logger.info('Health Monitor Service started');
    } catch (error) {
      logger.error('Failed to start Health Monitor Service:', error);
      throw error;
    }
  }

  async stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Health Monitor Service stopped');
    }
  }

  async checkAllLoans() {
    try {
      logger.info('Checking health factors for all active loans...');

      const activeLoans = await database.getActiveLoans();

      logger.info(`Found ${activeLoans.length} active loans`);

      for (const loan of activeLoans) {
        await this.checkLoan(loan.user_wallet);
      }

      logger.info('Health check completed');
    } catch (error) {
      logger.error('Failed to check all loans:', error);
    }
  }

  async checkLoan(borrowerAddress) {
    try {
      // Get health factor from contract
      const healthFactor = await this.borrowingContract.calculateHealthFactor(borrowerAddress);
      const healthFactorValue = Number(healthFactor) / 100; // Convert from scaled value

      logger.info(`Health factor for ${borrowerAddress}: ${healthFactorValue}`);

      // Update database
      await database.client
        .from('loans')
        .update({
          health_factor: healthFactorValue,
          last_health_check: new Date().toISOString(),
        })
        .eq('user_wallet', borrowerAddress)
        .eq('status', 'active');

      // Check thresholds
      if (healthFactorValue < this.liquidationThreshold) {
        logger.warn(`Loan ${borrowerAddress} is liquidatable (HF: ${healthFactorValue})`);
        await this.triggerLiquidation(borrowerAddress);
      } else if (healthFactorValue < this.warningThreshold) {
        logger.warn(`Loan ${borrowerAddress} is in warning zone (HF: ${healthFactorValue})`);
        await this.sendWarning(borrowerAddress, healthFactorValue);
      }

      return healthFactorValue;
    } catch (error) {
      logger.error(`Failed to check loan for ${borrowerAddress}:`, error);
      throw error;
    }
  }

  async triggerLiquidation(borrowerAddress) {
    try {
      logger.warn(`Triggering liquidation for ${borrowerAddress}`);

      // Get loan details
      const loan = await this.borrowingContract.getLoan(borrowerAddress);

      // Calculate total debt
      const totalDebtUSD = loan.borrowedAmountUSD + loan.accruedInterest;

      // Note: In production, this would call a liquidator bot or marketplace
      // For now, we just log and update the database

      await database.client
        .from('loans')
        .update({
          status: 'pending_liquidation',
          liquidation_triggered_at: new Date().toISOString(),
        })
        .eq('user_wallet', borrowerAddress)
        .eq('status', 'active');

      logger.info(`Liquidation triggered for ${borrowerAddress}`);

      return true;
    } catch (error) {
      logger.error(`Failed to trigger liquidation for ${borrowerAddress}:`, error);
      throw error;
    }
  }

  async sendWarning(borrowerAddress, healthFactor) {
    try {
      // Log warning (in production, send email/notification)
      logger.warn(`WARNING: ${borrowerAddress} health factor at ${healthFactor}`);

      await database.client
        .from('loan_warnings')
        .insert({
          user_wallet: borrowerAddress,
          health_factor: healthFactor,
          warning_type: 'low_health_factor',
          created_at: new Date().toISOString(),
        });

      return true;
    } catch (error) {
      logger.error(`Failed to send warning to ${borrowerAddress}:`, error);
    }
  }
}

module.exports = HealthMonitor;
