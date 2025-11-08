#!/usr/bin/env node

/**
 * Update Environment Files with Deployment Data
 *
 * Updates all .env files with deployed contract addresses and HCS topic IDs
 * Called after successful deployment
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Update or append environment variable in file content
 */
function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'gm');
  if (content.match(regex)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

/**
 * Update environment file with new variables
 */
function updateEnvFile(filePath, updates, description) {
  if (!fs.existsSync(filePath)) {
    log(`  ⚠️  ${description}: File not found at ${filePath}`, 'yellow');
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    Object.entries(updates).forEach(([key, value]) => {
      content = updateEnvVar(content, key, value || '');
    });

    fs.writeFileSync(filePath, content);
    log(`  ✅ ${description}: Updated with ${Object.keys(updates).length} variables`, 'green');
    return true;
  } catch (error) {
    log(`  ❌ ${description}: Failed to update - ${error.message}`, 'red');
    return false;
  }
}

/**
 * Update all environment files with deployment data
 */
function updateAllEnvFiles(deploymentInfo, topicsInfo) {
  log('\n📝 Updating Environment Files with Deployment Data...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..');
  const addresses = deploymentInfo?.addresses || {};
  const topics = topicsInfo?.topics || {};

  // 1. Update root .env
  log('\n1. Root .env:', 'cyan');
  updateEnvFile(
    path.join(rootDir, '.env'),
    {
      // Network Configuration
      HEDERA_NETWORK: 'testnet',
      HEDERA_TESTNET_RPC: 'https://testnet.hashio.io/api',
      HEDERA_MAINNET_RPC: 'https://mainnet.hashio.io/api',
      HEDERA_TESTNET_MIRROR_NODE: 'https://testnet.mirrornode.hedera.com',
      HEDERA_MAINNET_MIRROR_NODE: 'https://mainnet.mirrornode.hedera.com',

      // Core Pool Contracts
      POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      POOL_ADDRESS: addresses.POOL,
      POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      ACL_MANAGER: addresses.ACL_MANAGER,
      ORACLE_ADDRESS: addresses.ORACLE,
      RATE_STRATEGY: addresses.RATE_STRATEGY,

      // Hedera-Specific Contracts
      MULTI_ASSET_STAKING_ADDRESS: addresses.MULTI_ASSET_STAKING,
      ANALYTICS_CONTRACT_ADDRESS: addresses.ANALYTICS,

      // HCS Topics
      HCS_SUPPLY_TOPIC: topics.SUPPLY,
      HCS_WITHDRAW_TOPIC: topics.WITHDRAW,
      HCS_BORROW_TOPIC: topics.BORROW,
      HCS_REPAY_TOPIC: topics.REPAY,
      HCS_LIQUIDATION_TOPIC: topics.LIQUIDATION,

      // Token Addresses
      TOKEN_HBAR: '0x0000000000000000000000000000000000000000',
      TOKEN_USDC_TESTNET: '0.0.429274',
      TOKEN_USDC_MAINNET: '0.0.456858'
    },
    'Root .env'
  );

  // 2. Update contracts .env
  log('\n2. Contracts .env:', 'cyan');
  updateEnvFile(
    path.join(rootDir, 'contracts', '.env'),
    {
      // Network Configuration
      HEDERA_TESTNET_RPC: 'https://testnet.hashio.io/api',
      HEDERA_MAINNET_RPC: 'https://mainnet.hashio.io/api',

      // Contract Addresses (deployment fills these)
      POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      POOL_ADDRESS: addresses.POOL,
      POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      ORACLE_ADDRESS: addresses.ORACLE,
      TREASURY_ADDRESS: addresses.TREASURY || '',
      NODE_STAKING_CONTRACT_ADDRESS: addresses.MULTI_ASSET_STAKING,
      HCS_EVENT_STREAMER_ADDRESS: addresses.HCS_EVENT_STREAMER || '',

      // Pyth Oracle Configuration
      PYTH_CONTRACT_ADDRESS: '0x0708325268dF9F66270F1401206434524814508b',

      // HCS Configuration
      HCS_TOPIC_ID: topics.SUPPLY || '',

      // Frontend Configuration
      FRONTEND_URL: 'http://localhost:3000',

      // Gas Reporting
      REPORT_GAS: 'false'
    },
    'Contracts .env'
  );

  // 3. Update frontend .env.local
  log('\n3. Frontend .env.local:', 'cyan');
  updateEnvFile(
    path.join(rootDir, 'frontend', '.env.local'),
    {
      // Network Configuration
      NEXT_PUBLIC_NETWORK: 'testnet',
      NEXT_PUBLIC_RPC_URL: 'https://testnet.hashio.io/api',
      NEXT_PUBLIC_MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',

      // Contract Addresses
      NEXT_PUBLIC_POOL_ADDRESS: addresses.POOL,
      NEXT_PUBLIC_ORACLE_ADDRESS: addresses.ORACLE,
      NEXT_PUBLIC_ANALYTICS_ADDRESS: addresses.ANALYTICS,
      NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS: addresses.MULTI_ASSET_STAKING,
      NEXT_PUBLIC_NODE_STAKING_ADDRESS: addresses.MULTI_ASSET_STAKING,
      NEXT_PUBLIC_POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      NEXT_PUBLIC_POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      NEXT_PUBLIC_ACL_MANAGER: addresses.ACL_MANAGER,
      NEXT_PUBLIC_RATE_STRATEGY: addresses.RATE_STRATEGY,
      NEXT_PUBLIC_HCS_STREAMER_ADDRESS: addresses.HCS_EVENT_STREAMER || '',

      // HCS Topics
      NEXT_PUBLIC_HCS_SUPPLY_TOPIC: topics.SUPPLY,
      NEXT_PUBLIC_HCS_WITHDRAW_TOPIC: topics.WITHDRAW,
      NEXT_PUBLIC_HCS_BORROW_TOPIC: topics.BORROW,
      NEXT_PUBLIC_HCS_REPAY_TOPIC: topics.REPAY,
      NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC: topics.LIQUIDATION,

      // Asset Addresses
      NEXT_PUBLIC_USDC_ADDRESS: '0.0.456789', // Default testnet USDC (update with real address)
      NEXT_PUBLIC_HBAR_ADDRESS: '0.0.000000', // Native HBAR

      // HashPack Configuration
      NEXT_PUBLIC_HASHPACK_APP_NAME: 'Dera Protocol',
      NEXT_PUBLIC_HASHPACK_APP_DESCRIPTION: 'Hedera-native DeFi lending protocol',
      NEXT_PUBLIC_HASHPACK_APP_ICON: 'https://dera.fi/icon.png'
    },
    'Frontend .env.local'
  );

  // 4. Update backend services
  log('\n4. Backend Services:', 'cyan');
  const backendDir = path.join(rootDir, 'backend');

  if (fs.existsSync(backendDir)) {
    // HCS Event Service
    updateEnvFile(
      path.join(backendDir, 'hcs-event-service', '.env'),
      {
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
        HCS_EVENT_STREAMER_ADDRESS: addresses.HCS_EVENT_STREAMER || '',
        BATCH_SIZE: '10',
        PROCESS_INTERVAL_MS: '5000',
        MAX_RETRIES: '10',
        DB_PATH: './data/events.db',
        CONFIRM_ON_CHAIN: 'false',
        METRICS_LOG_INTERVAL_MS: '60000',
        LOG_LEVEL: 'info'
      },
      'hcs-event-service/.env'
    );

    // Liquidation Bot
    updateEnvFile(
      path.join(backendDir, 'liquidation-bot', '.env'),
      {
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        POOL_ADDRESS: addresses.POOL,
        LIQUIDATION_DATA_PROVIDER_ADDRESS: addresses.LIQUIDATION_DATA_PROVIDER || '',
        ORACLE_ADDRESS: addresses.ORACLE,
        DEFAULT_COLLATERAL_ASSET: '0x0000000000000000000000000000000000000000',
        DEFAULT_DEBT_ASSET: '0x0000000000000000000000000000000000068cDa',
        CHECK_INTERVAL_MS: '30000',
        MIN_PROFIT_USD: '10',
        ESTIMATED_GAS_COST_USD: '5',
        MAX_LIQUIDATIONS_PER_CYCLE: '10',
        MAX_DEBT_TO_COVER_USD: '100000',
        METRICS_LOG_INTERVAL_MS: '300000',
        LOG_LEVEL: 'info'
      },
      'liquidation-bot/.env'
    );

    // Monitoring Service
    updateEnvFile(
      path.join(backendDir, 'monitoring-service', '.env'),
      {
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
        POOL_ADDRESS: addresses.POOL,
        POOL_CONFIGURATOR_ADDRESS: addresses.POOL_CONFIGURATOR || '',
        ORACLE_ADDRESS: addresses.ORACLE,
        NODE_STAKING_CONTRACT_ADDRESS: addresses.MULTI_ASSET_STAKING,
        HEALTH_CHECK_INTERVAL_MS: '30000',
        METRICS_COLLECTION_INTERVAL_MS: '60000',
        MIN_HEALTH_FACTOR_THRESHOLD: '1.2',
        MAX_UTILIZATION_THRESHOLD: '0.95',
        MAX_PENDING_LIQUIDATIONS: '50',
        LARGE_LIQUIDATION_THRESHOLD: '10000',
        AUTO_PAUSE_ENABLED: 'false',
        METRICS_LOG_INTERVAL_MS: '300000',
        LOG_LEVEL: 'info'
      },
      'monitoring-service/.env'
    );

    // Node Staking Service
    updateEnvFile(
      path.join(backendDir, 'node-staking-service', '.env'),
      {
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com',
        NODE_STAKING_CONTRACT_ADDRESS: addresses.NODE_STAKING || addresses.MULTI_ASSET_STAKING,
        DEFAULT_NODE_ID: '3',
        MIN_STAKE_AMOUNT: '1000',
        ESTIMATED_APY: '700',
        REWARD_CLAIM_CRON: '0 0 * * *',
        DISTRIBUTION_CRON: '0 12 * * *',
        METRICS_LOG_INTERVAL_MS: '300000',
        LOG_LEVEL: 'info'
      },
      'node-staking-service/.env'
    );

    // Rate Updater Service
    updateEnvFile(
      path.join(backendDir, 'rate-updater-service', '.env'),
      {
        HEDERA_NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        POOL_ADDRESS: addresses.POOL,
        UPDATE_INTERVAL_MS: '60000',
        GAS_LIMIT: '500000',
        MAX_RETRIES: '3',
        RETRY_DELAY_MS: '5000',
        HEALTH_CHECK_PORT: '3007',
        LOG_LEVEL: 'info',
        ALERT_ON_FAILURE: 'false',
        BATCH_SIZE: '5',
        DRY_RUN: 'false'
      },
      'rate-updater-service/.env'
    );

    // Rate Limiting Service
    updateEnvFile(
      path.join(backendDir, 'rate-limiting-service', '.env'),
      {
        PORT: '3005',
        NODE_ENV: 'development',
        REDIS_ENABLED: 'true',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_DB: '0',
        GLOBAL_RATE_LIMIT: '1000',
        GLOBAL_RATE_WINDOW_MS: '900000',
        TRANSACTION_COOLDOWN_MS: '30000',
        SUPPLY_COOLDOWN_MS: '30000',
        BORROW_COOLDOWN_MS: '60000',
        WITHDRAW_COOLDOWN_MS: '30000',
        REPAY_COOLDOWN_MS: '30000',
        MAX_OPERATIONS_PER_MINUTE: '10',
        MAX_PRICE_IMPACT_PERCENT: '5',
        MAX_ORACLE_AGE_SECONDS: '300',
        MAX_TRANSACTION_SIZE_PERCENT: '25',
        MAX_SLIPPAGE_PERCENT: '1',
        LOG_LEVEL: 'info',
        LOG_DIR: './logs'
      },
      'rate-limiting-service/.env'
    );
  }

  log('\n━'.repeat(60), 'cyan');
  log('\n✅ All Environment Files Updated!', 'green');
  log('');
}

// Run if executed directly
if (require.main === module) {
  const deploymentInfoPath = path.join(__dirname, '..', 'contracts', 'deployment-info.json');
  const topicsPath = path.join(__dirname, '..', 'contracts', 'hcs-topics.json');

  if (!fs.existsSync(deploymentInfoPath)) {
    log('❌ deployment-info.json not found. Run deployment first.', 'red');
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));
  const topicsInfo = fs.existsSync(topicsPath)
    ? JSON.parse(fs.readFileSync(topicsPath, 'utf8'))
    : {};

  updateAllEnvFiles(deploymentInfo, topicsInfo);
}

module.exports = { updateAllEnvFiles, updateEnvFile, updateEnvVar };
