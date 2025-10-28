const MonitoringService = require('./MonitoringService');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * Main entry point for Monitoring & Emergency Control Service
 */
async function main() {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('   DERA PROTOCOL MONITORING & EMERGENCY CONTROL');
  logger.info('   Real-time monitoring and automated emergency response');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  const service = new MonitoringService();

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
    logger.info('📊 Monitoring Metrics:', metrics);
  }, config.METRICS_LOG_INTERVAL_MS);
}

// Run the service
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
