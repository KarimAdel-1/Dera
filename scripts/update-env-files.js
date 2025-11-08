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
      POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      POOL_ADDRESS: addresses.POOL,
      POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      ACL_MANAGER: addresses.ACL_MANAGER,
      ORACLE_ADDRESS: addresses.ORACLE,
      RATE_STRATEGY: addresses.RATE_STRATEGY,
      MULTI_ASSET_STAKING_ADDRESS: addresses.MULTI_ASSET_STAKING,
      ANALYTICS_CONTRACT_ADDRESS: addresses.ANALYTICS,
      HCS_SUPPLY_TOPIC: topics.SUPPLY,
      HCS_WITHDRAW_TOPIC: topics.WITHDRAW,
      HCS_BORROW_TOPIC: topics.BORROW,
      HCS_REPAY_TOPIC: topics.REPAY,
      HCS_LIQUIDATION_TOPIC: topics.LIQUIDATION
    },
    'Root .env'
  );

  // 2. Update contracts .env
  log('\n2. Contracts .env:', 'cyan');
  updateEnvFile(
    path.join(rootDir, 'contracts', '.env'),
    {
      POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      POOL_ADDRESS: addresses.POOL,
      POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      ORACLE_ADDRESS: addresses.ORACLE,
      NODE_STAKING_CONTRACT_ADDRESS: addresses.MULTI_ASSET_STAKING,
      HCS_TOPIC_ID: topics.SUPPLY
    },
    'Contracts .env'
  );

  // 3. Update frontend .env.local
  log('\n3. Frontend .env.local:', 'cyan');
  updateEnvFile(
    path.join(rootDir, 'frontend', '.env.local'),
    {
      NEXT_PUBLIC_POOL_ADDRESS: addresses.POOL,
      NEXT_PUBLIC_ORACLE_ADDRESS: addresses.ORACLE,
      NEXT_PUBLIC_ANALYTICS_ADDRESS: addresses.ANALYTICS,
      NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS: addresses.MULTI_ASSET_STAKING,
      NEXT_PUBLIC_POOL_CONFIGURATOR: addresses.POOL_CONFIGURATOR,
      NEXT_PUBLIC_POOL_ADDRESSES_PROVIDER: addresses.POOL_ADDRESSES_PROVIDER,
      NEXT_PUBLIC_ACL_MANAGER: addresses.ACL_MANAGER,
      NEXT_PUBLIC_RATE_STRATEGY: addresses.RATE_STRATEGY,
      NEXT_PUBLIC_HCS_SUPPLY_TOPIC: topics.SUPPLY,
      NEXT_PUBLIC_HCS_WITHDRAW_TOPIC: topics.WITHDRAW,
      NEXT_PUBLIC_HCS_BORROW_TOPIC: topics.BORROW,
      NEXT_PUBLIC_HCS_REPAY_TOPIC: topics.REPAY,
      NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC: topics.LIQUIDATION,
      NEXT_PUBLIC_NETWORK: 'testnet',
      NEXT_PUBLIC_RPC_URL: 'https://testnet.hashio.io/api',
      NEXT_PUBLIC_MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com'
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
        HCS_EVENT_STREAMER_ADDRESS: addresses.HCS_EVENT_STREAMER || '',
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com'
      },
      'hcs-event-service/.env'
    );

    // Liquidation Bot
    updateEnvFile(
      path.join(backendDir, 'liquidation-bot', '.env'),
      {
        POOL_ADDRESS: addresses.POOL,
        LIQUIDATION_DATA_PROVIDER_ADDRESS: addresses.LIQUIDATION_DATA_PROVIDER || '',
        ORACLE_ADDRESS: addresses.ORACLE,
        DEFAULT_COLLATERAL_ASSET: '0x0000000000000000000000000000000000000000',
        DEFAULT_DEBT_ASSET: '0x0000000000000000000000000000000000068cDa',
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api'
      },
      'liquidation-bot/.env'
    );

    // Monitoring Service
    updateEnvFile(
      path.join(backendDir, 'monitoring-service', '.env'),
      {
        POOL_ADDRESS: addresses.POOL,
        ORACLE_ADDRESS: addresses.ORACLE,
        NODE_STAKING_CONTRACT_ADDRESS: addresses.MULTI_ASSET_STAKING,
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api',
        MIRROR_NODE_URL: 'https://testnet.mirrornode.hedera.com'
      },
      'monitoring-service/.env'
    );

    // Node Staking Service
    updateEnvFile(
      path.join(backendDir, 'node-staking-service', '.env'),
      {
        NODE_STAKING_CONTRACT_ADDRESS: addresses.NODE_STAKING || addresses.MULTI_ASSET_STAKING,
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api'
      },
      'node-staking-service/.env'
    );

    // Rate Updater Service
    updateEnvFile(
      path.join(backendDir, 'rate-updater-service', '.env'),
      {
        POOL_ADDRESS: addresses.POOL,
        HEDERA_NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api'
      },
      'rate-updater-service/.env'
    );

    // Rate Limiting Service
    updateEnvFile(
      path.join(backendDir, 'rate-limiting-service', '.env'),
      {
        NETWORK: 'testnet',
        RPC_URL: 'https://testnet.hashio.io/api'
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
