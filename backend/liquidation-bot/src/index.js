const LiquidationMonitor = require('./LiquidationMonitor');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * Main entry point for Dera Liquidation Bot
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   DERA PROTOCOL LIQUIDATION BOT');
  logger.info('   Automated liquidation service for Hedera');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  const bot = new LiquidationMonitor();

  // Initialize bot
  try {
    await bot.initialize();
  } catch (error) {
    logger.error('Failed to initialize bot. Exiting.');
    process.exit(1);
  }

  // Start monitoring
  await bot.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('');
    logger.info('Received SIGINT signal...');
    await bot.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('');
    logger.info('Received SIGTERM signal...');
    await bot.shutdown();
    process.exit(0);
  });

  // Log metrics periodically
  setInterval(() => {
    const metrics = bot.getMetrics();
    logger.info('📊 Current Metrics:', metrics);
  }, config.METRICS_LOG_INTERVAL_MS);
}

// Run the bot
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
