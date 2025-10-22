const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const hederaClient = require('../utils/hederaClient');
const logger = require('../utils/logger');

/**
 * POST /api/withdrawals/process
 * Process a withdrawal for Tier 1 (instant access)
 *
 * For Tier 2/3, this creates a withdrawal request
 * For Tier 1, this executes the withdrawal immediately
 */
router.post('/process', async (req, res) => {
  try {
    const { depositId, userWallet, tier } = req.body;

    if (!depositId || !userWallet) {
      return res.status(400).json({ error: 'Missing required fields: depositId, userWallet' });
    }

    logger.info(`Processing withdrawal request for deposit ${depositId}, tier ${tier}`);

    // Get deposit details from database
    const deposit = await database.query(
      'SELECT * FROM deposits WHERE id = $1 AND user_wallet = $2 AND status = $3',
      [depositId, userWallet, 'active']
    );

    if (!deposit || deposit.rows.length === 0) {
      return res.status(404).json({ error: 'Deposit not found or already withdrawn' });
    }

    const depositData = deposit.rows[0];
    const withdrawalAmount = parseFloat(depositData.amount);

    if (tier === 1) {
      // Tier 1: Instant withdrawal
      // Check available liquidity (30% of tier total should be available for instant withdrawals)
      const poolStats = await database.query(
        'SELECT tier1_total, tier1_borrowed FROM pool_stats ORDER BY last_update DESC LIMIT 1'
      );

      const stats = poolStats.rows[0];
      const availableLiquidity = parseFloat(stats.tier1_total) * 0.3 - parseFloat(stats.tier1_borrowed);

      if (withdrawalAmount > availableLiquidity) {
        return res.status(400).json({
          error: `Insufficient liquidity. Available: ${availableLiquidity.toFixed(2)} HBAR`
        });
      }

      // Execute Hedera transaction - send HBAR from platform to user
      logger.info(`Executing withdrawal: ${withdrawalAmount} HBAR to ${userWallet}`);

      const platformAccountId = process.env.HEDERA_ACCOUNT_ID;
      const platformPrivateKey = process.env.HEDERA_PRIVATE_KEY;

      const txResult = await hederaClient.transferHbar(
        platformAccountId,
        platformPrivateKey,
        userWallet,
        withdrawalAmount
      );

      logger.info(`Withdrawal transaction successful: ${txResult.transactionId}`);

      // Update deposit status in database
      await database.query(
        'UPDATE deposits SET status = $1, withdrawn_at = $2 WHERE id = $3',
        ['withdrawn', new Date().toISOString(), depositId]
      );

      // Update pool stats
      await database.query(
        `UPDATE pool_stats
         SET tier1_total = tier1_total - $1,
             tier1_utilization = CASE
               WHEN (tier1_total - $1) > 0
               THEN (tier1_borrowed / (tier1_total - $1)) * 100
               ELSE 0
             END,
             total_volume = total_volume + $1,
             last_update = $2
         WHERE id = (SELECT id FROM pool_stats ORDER BY last_update DESC LIMIT 1)`,
        [withdrawalAmount, new Date().toISOString()]
      );

      return res.json({
        success: true,
        message: 'Withdrawal completed successfully',
        transactionId: txResult.transactionId,
        amount: withdrawalAmount,
        tier: 1
      });

    } else if (tier === 2 || tier === 3) {
      // Tier 2/3: Create withdrawal request
      const noticeDays = tier === 2 ? 30 : 90;
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + noticeDays);

      // Update deposit status to pending withdrawal
      await database.query(
        'UPDATE deposits SET status = $1, withdrawal_request_date = $2 WHERE id = $3',
        ['pending_withdrawal', new Date().toISOString(), depositId]
      );

      logger.info(`Withdrawal request created for deposit ${depositId}, available in ${noticeDays} days`);

      return res.json({
        success: true,
        message: `Withdrawal request submitted. Funds will be available in ${noticeDays} days.`,
        availableDate: availableDate.toISOString(),
        amount: withdrawalAmount,
        tier: tier
      });

    } else {
      return res.status(400).json({ error: 'Invalid tier' });
    }

  } catch (error) {
    logger.error('Error processing withdrawal:', error);

    if (error.message?.includes('not initialized')) {
      return res.status(503).json({
        error: 'Hedera service not available. Please ensure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are configured.'
      });
    }

    res.status(500).json({
      error: 'Failed to process withdrawal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/withdrawals/pending/:userWallet
 * Get pending withdrawal requests for a user
 */
router.get('/pending/:userWallet', async (req, res) => {
  try {
    const { userWallet } = req.params;

    const result = await database.query(
      `SELECT d.*,
              d.withdrawal_request_date + INTERVAL '30 days' as tier2_available_date,
              d.withdrawal_request_date + INTERVAL '90 days' as tier3_available_date
       FROM deposits d
       WHERE d.user_wallet = $1
         AND d.status = 'pending_withdrawal'
       ORDER BY d.withdrawal_request_date DESC`,
      [userWallet]
    );

    res.json({
      pendingWithdrawals: result.rows || [],
      count: result.rows?.length || 0
    });

  } catch (error) {
    logger.error('Error fetching pending withdrawals:', error);
    res.status(500).json({ error: 'Failed to fetch pending withdrawals' });
  }
});

module.exports = router;
