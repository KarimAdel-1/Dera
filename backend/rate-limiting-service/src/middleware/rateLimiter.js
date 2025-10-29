/**
 * Rate Limiter Middleware
 *
 * Provides configurable rate limiting for API endpoints
 * Supports both in-memory and Redis-based rate limiting
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import config from '../config.js';
import logger from '../utils/logger.js';

// Initialize Redis client if enabled
let redisClient = null;
if (config.REDIS_ENABLED) {
  try {
    redisClient = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      db: config.REDIS_DB,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected for rate limiting');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    redisClient = null;
  }
}

/**
 * Create rate limiter middleware
 * @param {object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
export function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  const limiterOptions = { ...defaultOptions, ...options };

  // Use Redis store if available, otherwise use in-memory
  if (redisClient && config.REDIS_ENABLED) {
    limiterOptions.store = new RedisStore({
      client: redisClient,
      prefix: 'rl:', // Rate limit key prefix
    });
    logger.info('Rate limiter using Redis store');
  } else {
    logger.warn('Rate limiter using in-memory store (not suitable for production cluster)');
  }

  // Add custom key generator to support wallet address-based limiting
  limiterOptions.keyGenerator = (req) => {
    // Try to get wallet address from various sources
    const walletAddress =
      req.headers['x-wallet-address'] ||
      req.body?.walletAddress ||
      req.query?.walletAddress ||
      req.ip;

    return walletAddress;
  };

  // Custom handler for rate limit exceeded
  limiterOptions.handler = (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: limiterOptions.message,
      retryAfter: res.getHeader('Retry-After'),
    });
  };

  return rateLimit(limiterOptions);
}

/**
 * Strict rate limiter for sensitive operations (borrow, liquidation)
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many sensitive operations, please wait before trying again.',
});

/**
 * Standard rate limiter for read operations
 */
export const standardRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please slow down.',
});

/**
 * Lenient rate limiter for public endpoints
 */
export const lenientRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  message: 'Rate limit exceeded, please try again shortly.',
});

/**
 * Transaction rate limiter - prevents rapid successive transactions
 */
export const transactionRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 transactions per minute per wallet
  message: 'Transaction rate limit exceeded. Please wait before submitting another transaction.',
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed transactions
});

/**
 * Supply/Borrow rate limiter
 */
export const supplyBorrowRateLimiter = createRateLimiter({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 10, // 10 operations per 2 minutes
  message: 'Supply/Borrow rate limit exceeded.',
});

/**
 * Liquidation rate limiter (more lenient for liquidators)
 */
export const liquidationRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 liquidations per minute
  message: 'Liquidation rate limit exceeded.',
});

/**
 * Oracle price query rate limiter
 */
export const oracleRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 price queries per minute
  skipSuccessfulRequests: true, // Only count failed requests
  message: 'Oracle query rate limit exceeded.',
});

/**
 * Global rate limiter for all endpoints
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: 'Global rate limit exceeded.',
});

/**
 * Cleanup function to close Redis connection
 */
export async function closeRateLimiter() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

export default {
  createRateLimiter,
  strictRateLimiter,
  standardRateLimiter,
  lenientRateLimiter,
  transactionRateLimiter,
  supplyBorrowRateLimiter,
  liquidationRateLimiter,
  oracleRateLimiter,
  globalRateLimiter,
  closeRateLimiter,
};
