require('dotenv').config();

/**
 * Configuration for Liquidation Bot
 */
module.exports = {
  // Network Configuration
  NETWORK: process.env.NETWORK || 'testnet',
  RPC_URL: process.env.RPC_URL || 'https://testnet.hashio.io/api',

  // Hedera Configuration
  HEDERA_OPERATOR_ID: process.env.HEDERA_OPERATOR_ID,
  HEDERA_OPERATOR_KEY: process.env.HEDERA_OPERATOR_KEY,

  // Private Key for Liquidator Account
  PRIVATE_KEY: process.env.LIQUIDATOR_PRIVATE_KEY,

  // Contract Addresses
  POOL_ADDRESS: process.env.POOL_ADDRESS,
  LIQUIDATION_DATA_PROVIDER_ADDRESS: process.env.LIQUIDATION_DATA_PROVIDER_ADDRESS,
  ORACLE_ADDRESS: process.env.ORACLE_ADDRESS,

  // Asset Addresses (default for calculations)
  DEFAULT_COLLATERAL_ASSET: process.env.DEFAULT_COLLATERAL_ASSET, // e.g., HBAR
  DEFAULT_DEBT_ASSET: process.env.DEFAULT_DEBT_ASSET, // e.g., USDC

  // Bot Parameters
  CHECK_INTERVAL_MS: parseInt(process.env.CHECK_INTERVAL_MS || '30000'), // 30 seconds
  MIN_PROFIT_USD: parseFloat(process.env.MIN_PROFIT_USD || '10'), // $10 minimum profit
  ESTIMATED_GAS_COST_USD: parseFloat(process.env.ESTIMATED_GAS_COST_USD || '5'), // $5 gas estimate

  // Monitoring
  MONITORED_ADDRESSES: process.env.MONITORED_ADDRESSES
    ? process.env.MONITORED_ADDRESSES.split(',')
    : [],

  // Metrics
  METRICS_LOG_INTERVAL_MS: parseInt(process.env.METRICS_LOG_INTERVAL_MS || '300000'), // 5 minutes

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Safety Limits
  MAX_LIQUIDATIONS_PER_CYCLE: parseInt(process.env.MAX_LIQUIDATIONS_PER_CYCLE || '10'),
  MAX_DEBT_TO_COVER_USD: parseFloat(process.env.MAX_DEBT_TO_COVER_USD || '100000'), // $100k max
};
