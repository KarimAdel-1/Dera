require('dotenv').config();

/**
 * Configuration for HCS Event Service
 */
module.exports = {
  // Network Configuration
  NETWORK: process.env.NETWORK || 'testnet',
  RPC_URL: process.env.RPC_URL || 'https://testnet.hashio.io/api',
  MIRROR_NODE_URL: process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',

  // Hedera Configuration
  HEDERA_OPERATOR_ID: process.env.HEDERA_OPERATOR_ID,
  HEDERA_OPERATOR_KEY: process.env.HEDERA_OPERATOR_KEY,

  // Contract Addresses
  HCS_EVENT_STREAMER_ADDRESS: process.env.HCS_EVENT_STREAMER_ADDRESS,

  // Processing Configuration
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE || '10'),
  PROCESS_INTERVAL_MS: parseInt(process.env.PROCESS_INTERVAL_MS || '5000'), // 5 seconds
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '10'),

  // Database
  DB_PATH: process.env.DB_PATH || './data/events.db',

  // Optional: Confirm submissions on-chain (costs gas)
  CONFIRM_ON_CHAIN: process.env.CONFIRM_ON_CHAIN === 'true',
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,

  // Metrics
  METRICS_LOG_INTERVAL_MS: parseInt(process.env.METRICS_LOG_INTERVAL_MS || '60000'), // 1 minute

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
