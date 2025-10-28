const HCSEventService = require('./HCSEventService');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * Main entry point for HCS Event Submission Service
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   DERA PROTOCOL HCS EVENT SERVICE');
  logger.info('   Immutable event logging to Hedera Consensus Service');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  const service = new HCSEventService();

  // Initialize service
  try {
    await service.initialize();
  } catch (error) {
    logger.error('Failed to initialize service. Exiting.');
    process.exit(1);
  }

  // Start service
  await service.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('');
    logger.info('Received SIGINT signal...');
    await service.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('');
    logger.info('Received SIGTERM signal...');
    await service.shutdown();
    process.exit(0);
  });

  // Log metrics periodically
  setInterval(() => {
    const metrics = service.getMetrics();
    logger.info('📊 Metrics:', metrics);
  }, config.METRICS_LOG_INTERVAL_MS);

  // Cleanup old events daily
  setInterval(async () => {
    logger.info('🧹 Running cleanup...');
    await service.eventQueue.cleanup(30); // Keep 30 days
  }, 24 * 60 * 60 * 1000); // Daily
}

// Run the service
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
