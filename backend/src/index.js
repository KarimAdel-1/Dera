require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');

// Import services
const ProxyAccountManager = require('./services/proxyAccountManager');
const PriceOracleService = require('./services/priceOracleService');
const HealthMonitor = require('./services/healthMonitor');
const IScoreCalculator = require('./services/iScoreCalculator');
const EventListener = require('./services/eventListener');

// Import routes
const iScoreRouter = require('./routes/iScore');
const loansRouter = require('./routes/loans');
const poolsRouter = require('./routes/pools');
const withdrawalsRouter = require('./routes/withdrawals');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Routes
app.use('/api/iscore', iScoreRouter);
app.use('/api/loans', loansRouter);
app.use('/api/pools', poolsRouter);
app.use('/api/withdrawals', withdrawalsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      proxyAccountManager: 'running',
      priceOracle: 'running',
      healthMonitor: 'running',
      iScoreCalculator: 'running',
      eventListener: 'running'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing Dera backend services...');

    // Initialize Proxy Account Manager
    const proxyAccountManager = new ProxyAccountManager();
    await proxyAccountManager.initialize();
    logger.info('✓ Proxy Account Manager initialized');

    // Initialize Price Oracle Service
    const priceOracleService = new PriceOracleService();
    await priceOracleService.start();
    logger.info('✓ Price Oracle Service started');

    // Initialize Health Monitor
    const healthMonitor = new HealthMonitor();
    await healthMonitor.start();
    logger.info('✓ Health Monitor started');

    // Initialize iScore Calculator
    const iScoreCalculator = new IScoreCalculator();
    await iScoreCalculator.initialize();
    logger.info('✓ iScore Calculator initialized');

    // Initialize Event Listener
    const eventListener = new EventListener();
    await eventListener.start();
    logger.info('✓ Event Listener started');

    // Make services available globally
    global.services = {
      proxyAccountManager,
      priceOracleService,
      healthMonitor,
      iScoreCalculator,
      eventListener
    };

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await initializeServices();

    app.listen(PORT, () => {
      logger.info(`Dera backend server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Network: ${process.env.HEDERA_NETWORK || 'testnet'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  if (global.services) {
    await global.services.priceOracleService?.stop();
    await global.services.healthMonitor?.stop();
    await global.services.eventListener?.stop();
  }

  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');

  if (global.services) {
    await global.services.priceOracleService?.stop();
    await global.services.healthMonitor?.stop();
    await global.services.eventListener?.stop();
  }

  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
