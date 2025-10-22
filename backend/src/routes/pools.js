const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const logger = require('../utils/logger');

/**
 * GET /api/pools/stats
 * Get pool statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await database.getPoolStats();

    res.json({
      stats: stats || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting pool stats:', error);
    res.status(500).json({ error: 'Failed to get pool stats' });
  }
});

module.exports = router;
