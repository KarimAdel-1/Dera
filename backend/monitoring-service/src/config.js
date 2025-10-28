require('dotenv').config();

/**
 * Configuration for Monitoring Service
 */
module.exports = {
  // Network Configuration
  NETWORK: process.env.NETWORK || 'testnet',
  RPC_URL: process.env.RPC_URL || 'https://testnet.hashio.io/api',
  MIRROR_NODE_URL: process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',

  // Admin Private Key (for emergency pause)
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,

  // Contract Addresses
  POOL_ADDRESS: process.env.POOL_ADDRESS,
  POOL_CONFIGURATOR_ADDRESS: process.env.POOL_CONFIGURATOR_ADDRESS,
  ORACLE_ADDRESS: process.env.ORACLE_ADDRESS,
  NODE_STAKING_CONTRACT_ADDRESS: process.env.NODE_STAKING_CONTRACT_ADDRESS,

  // Health Check Configuration
  HEALTH_CHECK_INTERVAL_MS: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '30000'), // 30 seconds
  METRICS_COLLECTION_INTERVAL_MS: parseInt(process.env.METRICS_COLLECTION_INTERVAL_MS || '60000'), // 1 minute

  // Service Health Endpoints (if services expose health checks)
  LIQUIDATION_BOT_HEALTH_URL: process.env.LIQUIDATION_BOT_HEALTH_URL,
  HCS_SERVICE_HEALTH_URL: process.env.HCS_SERVICE_HEALTH_URL,
  STAKING_SERVICE_HEALTH_URL: process.env.STAKING_SERVICE_HEALTH_URL,

  // Alert Thresholds
  MIN_HEALTH_FACTOR_THRESHOLD: parseFloat(process.env.MIN_HEALTH_FACTOR_THRESHOLD || '1.2'),
  MAX_UTILIZATION_THRESHOLD: parseFloat(process.env.MAX_UTILIZATION_THRESHOLD || '0.95'), // 95%
  MAX_PENDING_LIQUIDATIONS: parseInt(process.env.MAX_PENDING_LIQUIDATIONS || '50'),
  LARGE_LIQUIDATION_THRESHOLD: parseFloat(process.env.LARGE_LIQUIDATION_THRESHOLD || '10000'), // $10k

  // Emergency Controls
  AUTO_PAUSE_ENABLED: process.env.AUTO_PAUSE_ENABLED === 'true',

  // Email Alerts
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'alerts@dera.fi',
  EMAIL_TO: process.env.EMAIL_TO,

  // Telegram Alerts
  TELEGRAM_ENABLED: process.env.TELEGRAM_ENABLED === 'true',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,

  // Webhook Alerts
  WEBHOOK_URL: process.env.WEBHOOK_URL,

  // Metrics
  METRICS_LOG_INTERVAL_MS: parseInt(process.env.METRICS_LOG_INTERVAL_MS || '300000'), // 5 minutes

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
