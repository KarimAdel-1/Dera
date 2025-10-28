require('dotenv').config();

/**
 * Configuration for Node Staking Service
 */
module.exports = {
  // Network Configuration
  NETWORK: process.env.NETWORK || 'testnet',
  RPC_URL: process.env.RPC_URL || 'https://testnet.hashio.io/api',
  MIRROR_NODE_URL: process.env.MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com',

  // Hedera Configuration
  HEDERA_OPERATOR_ID: process.env.HEDERA_OPERATOR_ID,
  HEDERA_OPERATOR_KEY: process.env.HEDERA_OPERATOR_KEY,

  // Admin Private Key (for calling contract functions)
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,

  // Contract Addresses
  NODE_STAKING_CONTRACT_ADDRESS: process.env.NODE_STAKING_CONTRACT_ADDRESS,

  // Staking Configuration
  DEFAULT_NODE_ID: parseInt(process.env.DEFAULT_NODE_ID || '3'), // Node 0.0.3 by default
  MIN_STAKE_AMOUNT: process.env.MIN_STAKE_AMOUNT || '1000', // 1000 HBAR minimum
  ESTIMATED_APY: parseInt(process.env.ESTIMATED_APY || '700'), // 7% APY in basis points

  // Reward Claiming Schedule (cron format)
  REWARD_CLAIM_CRON: process.env.REWARD_CLAIM_CRON || '0 0 * * *', // Daily at midnight UTC

  // Distribution Schedule (cron format)
  DISTRIBUTION_CRON: process.env.DISTRIBUTION_CRON || '0 12 * * *', // Daily at noon UTC

  // Assets to distribute rewards to (comma-separated addresses)
  DISTRIBUTION_ASSETS: process.env.DISTRIBUTION_ASSETS
    ? process.env.DISTRIBUTION_ASSETS.split(',')
    : [],

  // Metrics
  METRICS_LOG_INTERVAL_MS: parseInt(process.env.METRICS_LOG_INTERVAL_MS || '300000'), // 5 minutes

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
