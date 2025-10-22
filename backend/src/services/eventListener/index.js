const axios = require('axios');
const { ethers } = require('ethers');
const database = require('../../utils/database');
const logger = require('../../utils/logger');

/**
 * Event Listener Service
 * Monitors blockchain events and triggers backend actions
 */
class EventListener {
  constructor() {
    this.mirrorNodeUrl = process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';
    this.pollingInterval = parseInt(process.env.EVENT_POLLING_INTERVAL || '5000');
    this.lastProcessedTimestamp = Date.now();
    this.isRunning = false;
    this.pollTimer = null;
  }

  async start() {
    try {
      this.isRunning = true;
      this.poll();
      logger.info('Event Listener Service started');
    } catch (error) {
      logger.error('Failed to start Event Listener Service:', error);
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    logger.info('Event Listener Service stopped');
  }

  async poll() {
    if (!this.isRunning) return;

    try {
      await this.processEvents();
    } catch (error) {
      logger.error('Error processing events:', error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.pollingInterval);
  }

  async processEvents() {
    try {
      // Query mirror node for recent contract transactions
      const lendingPoolAddress = process.env.LENDING_POOL_ADDRESS;
      const borrowingAddress = process.env.BORROWING_CONTRACT_ADDRESS;

      if (!lendingPoolAddress || !borrowingAddress) {
        return;
      }

      // Fetch recent transactions for both contracts
      const [lendingPoolTxs, borrowingTxs] = await Promise.all([
        this.fetchContractTransactions(lendingPoolAddress),
        this.fetchContractTransactions(borrowingAddress),
      ]);

      // Process events
      for (const tx of lendingPoolTxs) {
        await this.processLendingPoolEvent(tx);
      }

      for (const tx of borrowingTxs) {
        await this.processBorrowingEvent(tx);
      }
    } catch (error) {
      logger.error('Failed to process events:', error);
    }
  }

  async fetchContractTransactions(contractAddress) {
    try {
      const response = await axios.get(
        `${this.mirrorNodeUrl}/api/v1/contracts/${contractAddress}/results`,
        {
          params: {
            limit: 25,
            order: 'desc',
          },
        }
      );

      return response.data.results || [];
    } catch (error) {
      logger.error(`Failed to fetch transactions for ${contractAddress}:`, error);
      return [];
    }
  }

  async processLendingPoolEvent(tx) {
    try {
      // Parse transaction logs for events
      if (!tx.logs || tx.logs.length === 0) return;

      for (const log of tx.logs) {
        const eventSignature = log.topics[0];

        // Event signatures (keccak256 hashes)
        const DEPOSIT_EVENT = ethers.utils.id('Deposited(address,uint8,uint256,uint256)');
        const WITHDRAW_EVENT = ethers.utils.id('Withdrawn(address,uint8,uint256,uint256)');

        if (eventSignature === DEPOSIT_EVENT) {
          await this.handleDepositEvent(log, tx);
        } else if (eventSignature === WITHDRAW_EVENT) {
          await this.handleWithdrawEvent(log, tx);
        }
      }
    } catch (error) {
      logger.error('Failed to process lending pool event:', error);
    }
  }

  async processBorrowingEvent(tx) {
    try {
      if (!tx.logs || tx.logs.length === 0) return;

      for (const log of tx.logs) {
        const eventSignature = log.topics[0];

        // Event signatures
        const COLLATERAL_DEPOSITED = ethers.utils.id('CollateralDeposited(address,uint256,uint256)');
        const LOAN_CREATED = ethers.utils.id('LoanCreated(address,uint256,uint256,uint256,uint256)');
        const LOAN_REPAID = ethers.utils.id('LoanRepaid(address,uint256,uint256)');
        const LOAN_LIQUIDATED = ethers.utils.id('LoanLiquidated(address,address,uint256,uint256)');

        if (eventSignature === COLLATERAL_DEPOSITED) {
          await this.handleCollateralDepositedEvent(log, tx);
        } else if (eventSignature === LOAN_CREATED) {
          await this.handleLoanCreatedEvent(log, tx);
        } else if (eventSignature === LOAN_REPAID) {
          await this.handleLoanRepaidEvent(log, tx);
        } else if (eventSignature === LOAN_LIQUIDATED) {
          await this.handleLoanLiquidatedEvent(log, tx);
        }
      }
    } catch (error) {
      logger.error('Failed to process borrowing event:', error);
    }
  }

  async handleDepositEvent(log, tx) {
    try {
      // Decode event data
      const [user, tier, amount, lpTokens] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Deposit event: ${user} deposited ${ethers.utils.formatEther(amount)} HBAR to tier ${tier}`);

      // Create deposit record
      await database.createDeposit({
        user_wallet: user,
        tier,
        amount: ethers.utils.formatEther(amount),
        lp_tokens: ethers.utils.formatEther(lpTokens),
        transaction_id: tx.hash,
        status: 'active',
        created_at: new Date(tx.timestamp).toISOString(),
      });

      // Log event
      await database.createEventLog({
        event_type: 'deposit',
        user_wallet: user,
        transaction_id: tx.hash,
        data: { tier, amount: amount.toString(), lpTokens: lpTokens.toString() },
        processed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to handle deposit event:', error);
    }
  }

  async handleWithdrawEvent(log, tx) {
    try {
      const [user, tier, amount, lpTokens] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'uint8', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Withdraw event: ${user} withdrew ${ethers.utils.formatEther(amount)} HBAR from tier ${tier}`);

      // Log event
      await database.createEventLog({
        event_type: 'withdraw',
        user_wallet: user,
        transaction_id: tx.hash,
        data: { tier, amount: amount.toString(), lpTokens: lpTokens.toString() },
        processed_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to handle withdraw event:', error);
    }
  }

  async handleCollateralDepositedEvent(log, tx) {
    try {
      const [borrower, collateralAmount, iScore] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Collateral deposited: ${borrower} deposited ${ethers.utils.formatEther(collateralAmount)} HBAR`);

      // Trigger proxy account creation
      if (global.services && global.services.proxyAccountManager) {
        const proxyAccount = await global.services.proxyAccountManager.createProxyAccount(
          borrower,
          parseFloat(ethers.utils.formatEther(collateralAmount))
        );

        logger.info(`Proxy account created: ${proxyAccount.accountId} for ${borrower}`);
      }
    } catch (error) {
      logger.error('Failed to handle collateral deposited event:', error);
    }
  }

  async handleLoanCreatedEvent(log, tx) {
    try {
      const [borrower, borrowedUSD, borrowedHBAR, interestRate, iScore] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'uint256', 'uint256', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Loan created: ${borrower} borrowed $${ethers.utils.formatUnits(borrowedUSD, 8)}`);

      // Create loan record
      await database.createLoan({
        user_wallet: borrower,
        collateral_amount: 0, // Will be updated
        borrowed_amount_usd: parseFloat(ethers.utils.formatUnits(borrowedUSD, 8)),
        borrowed_amount_hbar: parseFloat(ethers.utils.formatEther(borrowedHBAR)),
        interest_rate: interestRate.toNumber() / 100,
        iscore: iScore.toNumber(),
        status: 'active',
        transaction_id: tx.hash,
        created_at: new Date(tx.timestamp).toISOString(),
      });

      // Update iScore
      if (global.services && global.services.iScoreCalculator) {
        await global.services.iScoreCalculator.updateScoreAfterEvent(borrower, 'loan_created', {});
      }
    } catch (error) {
      logger.error('Failed to handle loan created event:', error);
    }
  }

  async handleLoanRepaidEvent(log, tx) {
    try {
      const [borrower, repaidAmount, interestPaid] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Loan repaid: ${borrower} repaid ${ethers.utils.formatEther(repaidAmount)} HBAR`);

      // Update loan status
      const loan = await database.getLoan(borrower);
      if (loan) {
        await database.updateLoan(loan.id, {
          status: 'repaid',
          repaid_at: new Date().toISOString(),
        });

        // Trigger proxy account actions
        if (global.services && global.services.proxyAccountManager && loan.proxy_account_id) {
          await global.services.proxyAccountManager.returnCollateral(
            loan.proxy_account_id,
            borrower
          );
        }

        // Update iScore
        if (global.services && global.services.iScoreCalculator) {
          await global.services.iScoreCalculator.updateScoreAfterEvent(borrower, 'loan_repaid', {
            amount: parseFloat(ethers.utils.formatEther(repaidAmount)),
            onTime: true,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to handle loan repaid event:', error);
    }
  }

  async handleLoanLiquidatedEvent(log, tx) {
    try {
      const [borrower, liquidator, debtPaid, collateralSeized] = ethers.utils.defaultAbiCoder.decode(
        ['address', 'address', 'uint256', 'uint256'],
        log.data
      );

      logger.info(`Loan liquidated: ${borrower} by ${liquidator}`);

      // Update loan status
      const loan = await database.getLoan(borrower);
      if (loan) {
        await database.updateLoan(loan.id, {
          status: 'liquidated',
          liquidated_at: new Date().toISOString(),
          liquidator: liquidator,
        });

        // Update iScore
        if (global.services && global.services.iScoreCalculator) {
          await global.services.iScoreCalculator.updateScoreAfterEvent(borrower, 'loan_liquidated', {});
        }
      }
    } catch (error) {
      logger.error('Failed to handle loan liquidated event:', error);
    }
  }
}

module.exports = EventListener;
