require('dotenv').config();

module.exports = {
  // Hedera Network Configuration
  HEDERA_NETWORK: process.env.HEDERA_NETWORK || 'testnet',
  HEDERA_ACCOUNT_ID: process.env.HEDERA_ACCOUNT_ID,
  HEDERA_PRIVATE_KEY: process.env.HEDERA_PRIVATE_KEY,

  // JSON-RPC Configuration
  RPC_URL: process.env.RPC_URL || 'https://testnet.hashio.io/api',

  // Contract Addresses
  POOL_ADDRESS: process.env.POOL_ADDRESS,

  // Rate Update Configuration
  UPDATE_INTERVAL_MS: parseInt(process.env.UPDATE_INTERVAL_MS) || 60000, // 60 seconds default
  GAS_LIMIT: parseInt(process.env.GAS_LIMIT) || 500000,
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES) || 3,
  RETRY_DELAY_MS: parseInt(process.env.RETRY_DELAY_MS) || 5000,

  // Assets to Update (comma-separated list)
  ASSETS: process.env.ASSETS ? process.env.ASSETS.split(',').map(a => a.trim()) : [],

  // Monitoring
  HEALTH_CHECK_PORT: parseInt(process.env.HEALTH_CHECK_PORT) || 3007,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Alert Configuration
  ALERT_ON_FAILURE: process.env.ALERT_ON_FAILURE === 'true',
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,

  // Performance
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE) || 5, // Process 5 assets at a time

  // Safety
  DRY_RUN: process.env.DRY_RUN === 'true', // Set to true to simulate without actual transactions
};
