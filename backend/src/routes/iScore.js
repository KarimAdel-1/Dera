const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/iscore/:wallet
 * Get iScore for a wallet address
 */
router.get('/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!wallet || !wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const iScoreCalculator = global.services?.iScoreCalculator;
    if (!iScoreCalculator) {
      return res.status(503).json({ error: 'iScore service not available' });
    }

    const score = await iScoreCalculator.calculateScore(wallet);

    res.json({
      wallet,
      iscore: score,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting iScore:', error);
    res.status(500).json({ error: 'Failed to calculate iScore' });
  }
});

module.exports = router;
