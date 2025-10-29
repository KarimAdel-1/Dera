/**
 * Rate Limiting & Anti-MEV Protection Service
 *
 * Provides rate limiting and anti-MEV protection as a service
 * Can be used as:
 * 1. Standalone Express server (middleware for other services)
 * 2. Importable middleware module
 * 3. Validation endpoint for smart contract calls
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import logger from './utils/logger.js';
import {
  globalRateLimiter,
  transactionRateLimiter,
  supplyBorrowRateLimiter,
  liquidationRateLimiter,
  oracleRateLimiter,
  closeRateLimiter,
} from './middleware/rateLimiter.js';
import {
  transactionCooldown,
  rapidOperationDetection,
  priceImpactProtection,
  oracleStalenessCheck,
  transactionSizeLimit,
  sameBlockPrevention,
  slippageProtection,
  flashLoanDetection,
  closeAntiMEV,
} from './middleware/antiMEV.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use(globalRateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Rate Limiting & Anti-MEV Protection',
    status: 'healthy',
    timestamp: Date.now(),
    redis: config.REDIS_ENABLED ? 'enabled' : 'disabled',
  });
});

// ============================================================================
// VALIDATION ENDPOINTS
// These endpoints validate if a transaction should be allowed
// ============================================================================

/**
 * Validate supply operation
 */
app.post(
  '/validate/supply',
  supplyBorrowRateLimiter,
  transactionCooldown,
  rapidOperationDetection,
  sameBlockPrevention,
  transactionSizeLimit(config.MAX_TRANSACTION_SIZE_PERCENT),
  oracleStalenessCheck(config.MAX_ORACLE_AGE_SECONDS),
  (req, res) => {
    res.json({
      success: true,
      message: 'Supply operation validated',
      timestamp: Date.now(),
    });
  }
);

/**
 * Validate borrow operation
 */
app.post(
  '/validate/borrow',
  supplyBorrowRateLimiter,
  transactionCooldown,
  rapidOperationDetection,
  sameBlockPrevention,
  priceImpactProtection(config.MAX_PRICE_IMPACT_PERCENT),
  oracleStalenessCheck(config.MAX_ORACLE_AGE_SECONDS),
  slippageProtection,
  (req, res) => {
    res.json({
      success: true,
      message: 'Borrow operation validated',
      timestamp: Date.now(),
    });
  }
);

/**
 * Validate withdraw operation
 */
app.post(
  '/validate/withdraw',
  supplyBorrowRateLimiter,
  transactionCooldown,
  rapidOperationDetection,
  sameBlockPrevention,
  (req, res) => {
    res.json({
      success: true,
      message: 'Withdraw operation validated',
      timestamp: Date.now(),
    });
  }
);

/**
 * Validate repay operation
 */
app.post(
  '/validate/repay',
  supplyBorrowRateLimiter,
  transactionCooldown,
  rapidOperationDetection,
  sameBlockPrevention,
  flashLoanDetection,
  (req, res) => {
    const warning = req.flashLoanDetected
      ? 'Flash loan pattern detected - transaction flagged for review'
      : null;

    res.json({
      success: true,
      message: 'Repay operation validated',
      warning,
      timestamp: Date.now(),
    });
  }
);

/**
 * Validate liquidation operation
 */
app.post(
  '/validate/liquidation',
  liquidationRateLimiter,
  rapidOperationDetection,
  oracleStalenessCheck(config.MAX_ORACLE_AGE_SECONDS),
  priceImpactProtection(config.MAX_PRICE_IMPACT_PERCENT * 2), // More lenient for liquidations
  (req, res) => {
    res.json({
      success: true,
      message: 'Liquidation operation validated',
      timestamp: Date.now(),
    });
  }
);

/**
 * Validate oracle query
 */
app.post('/validate/oracle', oracleRateLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Oracle query validated',
    timestamp: Date.now(),
  });
});

/**
 * Generic transaction validation
 */
app.post(
  '/validate/transaction',
  transactionRateLimiter,
  transactionCooldown,
  rapidOperationDetection,
  (req, res) => {
    res.json({
      success: true,
      message: 'Transaction validated',
      timestamp: Date.now(),
    });
  }
);

// ============================================================================
// METRICS & MONITORING
// ============================================================================

/**
 * Get rate limiting metrics for a wallet
 */
app.get('/metrics/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;

  // In a production system, you would query Redis for detailed metrics
  res.json({
    success: true,
    walletAddress,
    metrics: {
      recentOperations: 0,
      cooldownStatus: 'none',
      flagged: false,
    },
    timestamp: Date.now(),
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: 'The requested endpoint does not exist.',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(config.PORT, () => {
  logger.info('='.repeat(60));
  logger.info('🛡️  Dera Protocol - Rate Limiting & Anti-MEV Service');
  logger.info('='.repeat(60));
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`Server running on port: ${config.PORT}`);
  logger.info(`Redis: ${config.REDIS_ENABLED ? 'Enabled' : 'Disabled (In-Memory)'}`);
  logger.info(`Global rate limit: ${config.GLOBAL_RATE_LIMIT} req/${config.GLOBAL_RATE_WINDOW_MS}ms`);
  logger.info(`Transaction cooldown: ${config.TRANSACTION_COOLDOWN_MS}ms`);
  logger.info(`Max operations/minute: ${config.MAX_OPERATIONS_PER_MINUTE}`);
  logger.info('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing server');
  server.close(async () => {
    await closeRateLimiter();
    await closeAntiMEV();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing server');
  server.close(async () => {
    await closeRateLimiter();
    await closeAntiMEV();
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
