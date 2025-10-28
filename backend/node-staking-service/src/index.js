const NodeStakingService = require('./NodeStakingService');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * Main entry point for Node Staking Service
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   DERA PROTOCOL NODE STAKING SERVICE');
  logger.info('   Automated HBAR staking for dual yield distribution');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');
  logger.info('💎 DUAL YIELD FOR LENDERS:');
  logger.info('   1. Lending APY - Interest from borrowers');
  logger.info('   2. Staking APY - Hedera node rewards (~6-8%)');
  logger.info('');

  const service = new NodeStakingService();

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
    logger.info('📊 Current Metrics:', metrics);
  }, config.METRICS_LOG_INTERVAL_MS);
}

// Run the service
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
