/**
 * Anti-MEV Protection Middleware
 *
 * Implements various protections against MEV (Miner Extractable Value) attacks
 * While Hedera's consensus mechanism prevents traditional MEV, we still protect against:
 * - Rapid successive operations (sandwich-like attacks)
 * - Oracle price manipulation
 * - Flash loan-like behavior
 * - Large transaction impacts
 */

import Redis from 'ioredis';
import config from '../config.js';
import logger from '../utils/logger.js';

// Initialize Redis for tracking transaction history
let redisClient = null;
if (config.REDIS_ENABLED) {
  redisClient = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    db: config.REDIS_DB,
  });
}

// In-memory fallback for transaction tracking
const transactionHistory = new Map();

/**
 * Transaction Cooldown Protection
 * Prevents rapid successive transactions from the same wallet
 */
export async function transactionCooldown(req, res, next) {
  try {
    const walletAddress = req.headers['x-wallet-address'] || req.body?.walletAddress;
    const operationType = req.body?.operationType || 'unknown';

    if (!walletAddress) {
      return next();
    }

    const cooldownKey = `cooldown:${walletAddress}:${operationType}`;
    const cooldownPeriod = config.TRANSACTION_COOLDOWN_MS || 30000; // 30 seconds default

    // Check cooldown
    if (redisClient) {
      const lastTx = await redisClient.get(cooldownKey);
      if (lastTx) {
        const timeSinceLastTx = Date.now() - parseInt(lastTx);
        if (timeSinceLastTx < cooldownPeriod) {
          const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastTx) / 1000);
          logger.warn(`Cooldown active for ${walletAddress}, ${remainingCooldown}s remaining`);
          return res.status(429).json({
            success: false,
            error: 'Transaction cooldown active',
            message: `Please wait ${remainingCooldown} seconds before performing this operation again.`,
            remainingCooldown,
          });
        }
      }

      // Set new cooldown
      await redisClient.set(cooldownKey, Date.now().toString(), 'EX', Math.ceil(cooldownPeriod / 1000));
    } else {
      // In-memory fallback
      const lastTx = transactionHistory.get(cooldownKey);
      if (lastTx) {
        const timeSinceLastTx = Date.now() - lastTx;
        if (timeSinceLastTx < cooldownPeriod) {
          const remainingCooldown = Math.ceil((cooldownPeriod - timeSinceLastTx) / 1000);
          return res.status(429).json({
            success: false,
            error: 'Transaction cooldown active',
            message: `Please wait ${remainingCooldown} seconds before performing this operation again.`,
            remainingCooldown,
          });
        }
      }

      transactionHistory.set(cooldownKey, Date.now());

      // Cleanup old entries (keep last 1000)
      if (transactionHistory.size > 1000) {
        const oldestKeys = Array.from(transactionHistory.keys()).slice(0, 100);
        oldestKeys.forEach(key => transactionHistory.delete(key));
      }
    }

    next();
  } catch (error) {
    logger.error('Error in transaction cooldown middleware:', error);
    next(); // Don't block on errors
  }
}

/**
 * Rapid Operation Detection
 * Detects and blocks suspicious patterns of rapid operations
 */
export async function rapidOperationDetection(req, res, next) {
  try {
    const walletAddress = req.headers['x-wallet-address'] || req.body?.walletAddress;

    if (!walletAddress) {
      return next();
    }

    const operationKey = `ops:${walletAddress}`;
    const timeWindow = 60000; // 1 minute window
    const maxOperations = config.MAX_OPERATIONS_PER_MINUTE || 10;

    if (redisClient) {
      const now = Date.now();
      const windowStart = now - timeWindow;

      // Add current operation
      await redisClient.zadd(operationKey, now, `${now}-${Math.random()}`);

      // Remove old operations outside the window
      await redisClient.zremrangebyscore(operationKey, 0, windowStart);

      // Count operations in window
      const operationCount = await redisClient.zcard(operationKey);

      if (operationCount > maxOperations) {
        logger.warn(`Rapid operations detected for ${walletAddress}: ${operationCount} ops/min`);
        return res.status(429).json({
          success: false,
          error: 'Too many rapid operations',
          message: 'Suspicious activity detected. Please slow down your operations.',
        });
      }

      // Set expiry on the key
      await redisClient.expire(operationKey, 120);
    }

    next();
  } catch (error) {
    logger.error('Error in rapid operation detection:', error);
    next(); // Don't block on errors
  }
}

/**
 * Price Impact Protection
 * Prevents transactions with excessive price impact
 */
export function priceImpactProtection(maxImpactPercent = 5) {
  return (req, res, next) => {
    try {
      const { amount, asset, priceImpact } = req.body;

      if (priceImpact !== undefined) {
        if (priceImpact > maxImpactPercent) {
          logger.warn(`High price impact detected: ${priceImpact}%`);
          return res.status(400).json({
            success: false,
            error: 'Price impact too high',
            message: `This transaction would cause ${priceImpact.toFixed(2)}% price impact, which exceeds the ${maxImpactPercent}% limit.`,
            priceImpact,
            maxImpact: maxImpactPercent,
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in price impact protection:', error);
      next(); // Don't block on errors
    }
  };
}

/**
 * Oracle Staleness Check
 * Ensures oracle prices are fresh
 */
export function oracleStalenessCheck(maxAgeSeconds = 300) {
  return (req, res, next) => {
    try {
      const { oracleTimestamp } = req.body;

      if (oracleTimestamp) {
        const age = Date.now() / 1000 - oracleTimestamp;

        if (age > maxAgeSeconds) {
          logger.warn(`Stale oracle price detected: ${age}s old`);
          return res.status(400).json({
            success: false,
            error: 'Stale oracle price',
            message: `Oracle price is ${Math.floor(age)}s old, which exceeds the ${maxAgeSeconds}s limit. Please wait for a fresh price update.`,
            priceAge: age,
            maxAge: maxAgeSeconds,
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in oracle staleness check:', error);
      next(); // Don't block on errors
    }
  };
}

/**
 * Transaction Size Limit
 * Prevents excessively large transactions that could impact liquidity
 */
export function transactionSizeLimit(maxPercentOfLiquidity = 25) {
  return (req, res, next) => {
    try {
      const { amount, availableLiquidity, totalSupply } = req.body;

      if (amount && availableLiquidity) {
        const percentOfLiquidity = (amount / availableLiquidity) * 100;

        if (percentOfLiquidity > maxPercentOfLiquidity) {
          logger.warn(`Large transaction detected: ${percentOfLiquidity.toFixed(2)}% of liquidity`);
          return res.status(400).json({
            success: false,
            error: 'Transaction size too large',
            message: `This transaction would use ${percentOfLiquidity.toFixed(2)}% of available liquidity, which exceeds the ${maxPercentOfLiquidity}% limit.`,
            percentOfLiquidity,
            maxPercent: maxPercentOfLiquidity,
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in transaction size limit:', error);
      next(); // Don't block on errors
    }
  };
}

/**
 * Same-Block Operation Prevention
 * Prevents multiple operations in rapid succession (Hedera-specific)
 * Uses consensus timestamp to detect same-second operations
 */
export async function sameBlockPrevention(req, res, next) {
  try {
    const walletAddress = req.headers['x-wallet-address'] || req.body?.walletAddress;
    const operationType = req.body?.operationType;

    if (!walletAddress || !operationType) {
      return next();
    }

    const blockKey = `block:${walletAddress}:${operationType}`;
    const blockDuration = 3000; // 3 seconds (multiple Hedera consensus rounds)

    if (redisClient) {
      const lastBlock = await redisClient.get(blockKey);
      if (lastBlock) {
        const timeSinceLastBlock = Date.now() - parseInt(lastBlock);
        if (timeSinceLastBlock < blockDuration) {
          logger.warn(`Same-block operation attempted by ${walletAddress}`);
          return res.status(429).json({
            success: false,
            error: 'Same-block operation prevented',
            message: 'Please wait a few seconds between operations.',
          });
        }
      }

      await redisClient.set(blockKey, Date.now().toString(), 'EX', 10);
    }

    next();
  } catch (error) {
    logger.error('Error in same-block prevention:', error);
    next(); // Don't block on errors
  }
}

/**
 * Slippage Protection
 * Ensures actual execution price is within user's slippage tolerance
 */
export function slippageProtection(req, res, next) {
  try {
    const { expectedPrice, currentPrice, slippageTolerance } = req.body;

    if (expectedPrice && currentPrice && slippageTolerance) {
      const priceDifference = Math.abs((currentPrice - expectedPrice) / expectedPrice) * 100;

      if (priceDifference > slippageTolerance) {
        logger.warn(`Slippage exceeds tolerance: ${priceDifference.toFixed(2)}%`);
        return res.status(400).json({
          success: false,
          error: 'Slippage exceeded',
          message: `Price has moved ${priceDifference.toFixed(2)}%, which exceeds your ${slippageTolerance}% slippage tolerance.`,
          expectedPrice,
          currentPrice,
          slippage: priceDifference,
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error in slippage protection:', error);
    next(); // Don't block on errors
  }
}

/**
 * Flash Loan Detection
 * Detects patterns similar to flash loans (borrow + repay in quick succession)
 */
export async function flashLoanDetection(req, res, next) {
  try {
    const walletAddress = req.headers['x-wallet-address'] || req.body?.walletAddress;
    const operationType = req.body?.operationType;

    if (!walletAddress || !operationType) {
      return next();
    }

    // Track borrow/repay patterns
    if (operationType === 'repay' && redisClient) {
      const borrowKey = `borrow:${walletAddress}`;
      const lastBorrow = await redisClient.get(borrowKey);

      if (lastBorrow) {
        const timeSinceBorrow = Date.now() - parseInt(lastBorrow);

        // If repay happens within 30 seconds of borrow, flag as suspicious
        if (timeSinceBorrow < 30000) {
          logger.warn(`Flash loan pattern detected for ${walletAddress}`);
          // Note: We don't block this, just log it for monitoring
          req.flashLoanDetected = true;
        }
      }
    }

    if (operationType === 'borrow' && redisClient) {
      const borrowKey = `borrow:${walletAddress}`;
      await redisClient.set(borrowKey, Date.now().toString(), 'EX', 60);
    }

    next();
  } catch (error) {
    logger.error('Error in flash loan detection:', error);
    next(); // Don't block on errors
  }
}

/**
 * Cleanup function
 */
export async function closeAntiMEV() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Anti-MEV Redis connection closed');
  }
}

export default {
  transactionCooldown,
  rapidOperationDetection,
  priceImpactProtection,
  oracleStalenessCheck,
  transactionSizeLimit,
  sameBlockPrevention,
  slippageProtection,
  flashLoanDetection,
  closeAntiMEV,
};
