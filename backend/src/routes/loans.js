const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const logger = require('../utils/logger');

/**
 * GET /api/loans/:wallet
 * Get loans for a wallet address
 */
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const loans = await database.getUserLoanHistory(wallet);

    res.json({
      wallet,
      loans,
      count: loans.length,
    });
  } catch (error) {
    logger.error('Error getting loans:', error);
    res.status(500).json({ error: 'Failed to get loans' });
  }
});

/**
 * GET /api/loans/:wallet/active
 * Get active loan for a wallet
 */
router.get('/:wallet/active', async (req, res) => {
  try {
    const { wallet } = req.params;

    const loan = await database.getLoan(wallet);

    res.json({
      wallet,
      loan: loan || null,
    });
  } catch (error) {
    logger.error('Error getting active loan:', error);
    res.status(500).json({ error: 'Failed to get active loan' });
  }
});

module.exports = router;
