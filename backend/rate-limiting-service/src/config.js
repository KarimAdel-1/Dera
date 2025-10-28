/**
 * Rate Limiting Service Configuration
 */

import dotenv from 'dotenv';
dotenv.config();

const config = {
  // Server
  PORT: process.env.PORT || 3005,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Redis Configuration
  REDIS_ENABLED: process.env.REDIS_ENABLED === 'true',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB || '0'),

  // Rate Limiting Settings
  GLOBAL_RATE_LIMIT: parseInt(process.env.GLOBAL_RATE_LIMIT || '1000'),
  GLOBAL_RATE_WINDOW_MS: parseInt(process.env.GLOBAL_RATE_WINDOW_MS || '900000'), // 15 minutes

  // Transaction Cooldowns (in milliseconds)
  TRANSACTION_COOLDOWN_MS: parseInt(process.env.TRANSACTION_COOLDOWN_MS || '30000'), // 30 seconds
  SUPPLY_COOLDOWN_MS: parseInt(process.env.SUPPLY_COOLDOWN_MS || '30000'),
  BORROW_COOLDOWN_MS: parseInt(process.env.BORROW_COOLDOWN_MS || '60000'), // 1 minute
  WITHDRAW_COOLDOWN_MS: parseInt(process.env.WITHDRAW_COOLDOWN_MS || '30000'),
  REPAY_COOLDOWN_MS: parseInt(process.env.REPAY_COOLDOWN_MS || '30000'),

  // Anti-MEV Settings
  MAX_OPERATIONS_PER_MINUTE: parseInt(process.env.MAX_OPERATIONS_PER_MINUTE || '10'),
  MAX_PRICE_IMPACT_PERCENT: parseFloat(process.env.MAX_PRICE_IMPACT_PERCENT || '5'),
  MAX_ORACLE_AGE_SECONDS: parseInt(process.env.MAX_ORACLE_AGE_SECONDS || '300'), // 5 minutes
  MAX_TRANSACTION_SIZE_PERCENT: parseFloat(process.env.MAX_TRANSACTION_SIZE_PERCENT || '25'),
  MAX_SLIPPAGE_PERCENT: parseFloat(process.env.MAX_SLIPPAGE_PERCENT || '1'),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_DIR: process.env.LOG_DIR || './logs',
};

export default config;
