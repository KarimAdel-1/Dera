const express = require('express');
const RateUpdater = require('./rateUpdater');
const config = require('./config');

const app = express();
app.use(express.json());

// Initialize Rate Updater
const rateUpdater = new RateUpdater();
let isInitialized = false;

/**
 * Initialize and start the service
 */
async function startService() {
  try {
    console.log('🚀 Starting Rate Updater Service...');
    console.log('═'.repeat(50));
    console.log(`Network: ${config.HEDERA_NETWORK}`);
    console.log(`Pool Address: ${config.POOL_ADDRESS}`);
    console.log(`Update Interval: ${config.UPDATE_INTERVAL_MS}ms`);
    console.log(`Health Check Port: ${config.HEALTH_CHECK_PORT}`);
    console.log('═'.repeat(50));

    // Initialize rate updater
    await rateUpdater.initialize();
    isInitialized = true;

    // Start updating rates
    rateUpdater.start();

    // Start health check server
    app.listen(config.HEALTH_CHECK_PORT, () => {
      console.log(`\n✅ Rate Updater Service running on port ${config.HEALTH_CHECK_PORT}`);
      console.log(`📊 Health Check: http://localhost:${config.HEALTH_CHECK_PORT}/health`);
      console.log(`📈 Status: http://localhost:${config.HEALTH_CHECK_PORT}/status\n`);
    });

  } catch (error) {
    console.error('❌ Failed to start Rate Updater Service:', error);
    process.exit(1);
  }
}

// ============ API Endpoints ============

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({
      status: 'initializing',
      message: 'Service is still initializing'
    });
  }

  res.json({
    status: 'healthy',
    service: 'rate-updater-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Get service status
 */
app.get('/status', (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({
      status: 'initializing',
      message: 'Service is still initializing'
    });
  }

  const status = rateUpdater.getStatus();
  res.json({
    service: 'rate-updater-service',
    timestamp: new Date().toISOString(),
    ...status
  });
});

/**
 * Trigger manual rate update
 */
app.post('/update', async (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({
      error: 'Service is still initializing'
    });
  }

  try {
    console.log('📢 Manual rate update triggered via API');

    // Trigger update (don't await to return response quickly)
    rateUpdater.updateRates().catch(error => {
      console.error('Manual update failed:', error);
    });

    res.json({
      message: 'Rate update triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to trigger update',
      message: error.message
    });
  }
});

/**
 * Get metrics (Prometheus format)
 */
app.get('/metrics', (req, res) => {
  if (!isInitialized) {
    return res.status(503).send('# Service initializing\n');
  }

  const status = rateUpdater.getStatus();

  const metrics = `
# HELP rate_updater_updates_total Total number of update cycles
# TYPE rate_updater_updates_total counter
rate_updater_updates_total ${status.updateCount}

# HELP rate_updater_failures_total Total number of failed update cycles
# TYPE rate_updater_failures_total counter
rate_updater_failures_total ${status.failureCount}

# HELP rate_updater_running Service running status (1=running, 0=stopped)
# TYPE rate_updater_running gauge
rate_updater_running ${status.isRunning ? 1 : 0}

# HELP rate_updater_update_interval_ms Update interval in milliseconds
# TYPE rate_updater_update_interval_ms gauge
rate_updater_update_interval_ms ${config.UPDATE_INTERVAL_MS}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

/**
 * Stop the service gracefully
 */
app.post('/stop', (req, res) => {
  console.log('📢 Stop requested via API');

  rateUpdater.stop();

  res.json({
    message: 'Service stopped',
    timestamp: new Date().toISOString()
  });

  // Shutdown server after 1 second
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

/**
 * Start the service gracefully
 */
app.post('/start', (req, res) => {
  if (!isInitialized) {
    return res.status(503).json({
      error: 'Service not initialized'
    });
  }

  console.log('📢 Start requested via API');

  rateUpdater.start();

  res.json({
    message: 'Service started',
    timestamp: new Date().toISOString()
  });
});

// ============ Error Handling ============

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Give time to log before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  rateUpdater.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  rateUpdater.stop();
  process.exit(0);
});

// ============ Start Service ============

startService();
