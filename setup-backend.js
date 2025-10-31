#!/usr/bin/env node

/**
 * DERA PROTOCOL - BACKEND SERVICES SETUP
 * ======================================
 *
 * This script sets up all backend services for the Dera Protocol:
 * - HCS Event Service (event logging to HCS topics)
 * - Node Staking Service (automated staking and reward distribution)
 * - Liquidation Bot (position monitoring and liquidations)
 * - Monitoring Service (health checks and alerts)
 * - Rate Limiting Service (API rate limiting)
 *
 * Prerequisites:
 * - Contracts must be deployed (run npm run deploy:hackathon first)
 * - Environment variables configured in contracts/.env
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, cwd = process.cwd(), silent = false) {
  try {
    const output = execSync(command, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function checkPrerequisites() {
  log('\n📋 Checking Prerequisites...', 'cyan');
  log('━'.repeat(60), 'cyan');

  // Check if contracts are deployed
  const deploymentInfoPath = path.join(__dirname, 'contracts', 'deployment-info.json');
  if (!fs.existsSync(deploymentInfoPath)) {
    log('❌ Contracts not deployed. Run "npm run deploy:hackathon" first', 'red');
    return false;
  }
  log('✅ Contracts deployed', 'green');

  // Check if HCS topics exist
  const topicsPath = path.join(__dirname, 'contracts', 'hcs-topics.json');
  if (!fs.existsSync(topicsPath)) {
    log('❌ HCS topics not created. Run "npm run deploy:hackathon" first', 'red');
    return false;
  }
  log('✅ HCS topics created', 'green');

  // Check main .env file
  const envPath = path.join(__dirname, 'contracts', '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ Main .env file not found in contracts directory', 'red');
    return false;
  }
  log('✅ Main environment file found', 'green');

  return true;
}

function loadDeploymentInfo() {
  const deploymentInfoPath = path.join(__dirname, 'contracts', 'deployment-info.json');
  const topicsPath = path.join(__dirname, 'contracts', 'hcs-topics.json');
  const envPath = path.join(__dirname, 'contracts', '.env');

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));
  const topicsInfo = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
  
  // Load environment variables
  require('dotenv').config({ path: envPath });

  return {
    contracts: deploymentInfo.addresses || {},
    topics: topicsInfo.topics || {},
    env: process.env
  };
}

async function setupHCSEventService(deploymentData) {
  log('\n📡 Setting up HCS Event Service...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const servicePath = path.join(__dirname, 'backend', 'hcs-event-service');
  const envPath = path.join(servicePath, '.env');
  const envExamplePath = path.join(servicePath, '.env.example');

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  const install = execCommand('npm install', servicePath, true);
  if (!install.success) {
    log('❌ Failed to install HCS Event Service dependencies', 'red');
    return false;
  }

  // Always create fresh .env file with new addresses
  log('Creating fresh .env with new addresses...', 'yellow');

  // Update environment variables
  const envVars = {
    'HEDERA_NETWORK': 'testnet',
    'HEDERA_OPERATOR_ID': deploymentData.env.HEDERA_OPERATOR_ID,
    'HEDERA_OPERATOR_KEY': deploymentData.env.HEDERA_OPERATOR_KEY,
    'HEDERA_TESTNET_RPC': deploymentData.env.HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api',
    'HEDERA_TESTNET_MIRROR_NODE': deploymentData.env.HEDERA_TESTNET_MIRROR_NODE || 'https://testnet.mirrornode.hedera.com',
    'POOL_ADDRESS': deploymentData.contracts.POOL_ADDRESS || deploymentData.contracts.Pool,
    'HCS_SUPPLY_TOPIC': deploymentData.topics.SUPPLY || deploymentData.topics.supply,
    'HCS_WITHDRAW_TOPIC': deploymentData.topics.WITHDRAW || deploymentData.topics.withdraw,
    'HCS_BORROW_TOPIC': deploymentData.topics.BORROW || deploymentData.topics.borrow,
    'HCS_REPAY_TOPIC': deploymentData.topics.REPAY || deploymentData.topics.repay,
    'HCS_LIQUIDATION_TOPIC': deploymentData.topics.LIQUIDATION || deploymentData.topics.liquidation,
    'PORT': '3001',
    'LOG_LEVEL': 'info'
  };

  // Generate fresh .env content
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ HCS Event Service configured with new addresses', 'green');
  return true;
}

async function setupNodeStakingService(deploymentData) {
  log('\n🏦 Setting up Node Staking Service...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const servicePath = path.join(__dirname, 'backend', 'node-staking-service');
  const envPath = path.join(servicePath, '.env');

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  const install = execCommand('npm install', servicePath, true);
  if (!install.success) {
    log('❌ Failed to install Node Staking Service dependencies', 'red');
    return false;
  }

  // Create .env file
  const envVars = {
    'HEDERA_NETWORK': 'testnet',
    'HEDERA_OPERATOR_ID': deploymentData.env.HEDERA_OPERATOR_ID,
    'HEDERA_OPERATOR_KEY': deploymentData.env.HEDERA_OPERATOR_KEY,
    'HEDERA_TESTNET_RPC': deploymentData.env.HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api',
    'HEDERA_TESTNET_MIRROR_NODE': deploymentData.env.HEDERA_TESTNET_MIRROR_NODE || 'https://testnet.mirrornode.hedera.com',
    'POOL_ADDRESS': deploymentData.contracts.POOL_ADDRESS || deploymentData.contracts.Pool,
    'STAKING_CONTRACT_ADDRESS': deploymentData.contracts.MULTI_ASSET_STAKING_ADDRESS || deploymentData.contracts.MultiAssetStaking,
    'STAKING_NODE_ID': '3', // Default to node 3, can be changed
    'REWARD_DISTRIBUTION_INTERVAL': '24', // hours
    'PORT': '3003',
    'LOG_LEVEL': 'info'
  };

  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ Node Staking Service configured', 'green');
  return true;
}

async function setupLiquidationBot(deploymentData) {
  log('\n🤖 Setting up Liquidation Bot...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const servicePath = path.join(__dirname, 'backend', 'liquidation-bot');
  const envPath = path.join(servicePath, '.env');

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  const install = execCommand('npm install', servicePath, true);
  if (!install.success) {
    log('❌ Failed to install Liquidation Bot dependencies', 'red');
    return false;
  }

  // Create .env file
  const envVars = {
    'HEDERA_NETWORK': 'testnet',
    'HEDERA_OPERATOR_ID': deploymentData.env.HEDERA_OPERATOR_ID,
    'HEDERA_OPERATOR_KEY': deploymentData.env.HEDERA_OPERATOR_KEY,
    'PRIVATE_KEY': deploymentData.env.PRIVATE_KEY,
    'HEDERA_TESTNET_RPC': deploymentData.env.HEDERA_TESTNET_RPC || 'https://testnet.hashio.io/api',
    'POOL_ADDRESS': deploymentData.contracts.POOL_ADDRESS || deploymentData.contracts.Pool,
    'ORACLE_ADDRESS': deploymentData.contracts.ORACLE_ADDRESS || deploymentData.contracts.Oracle,
    'LIQUIDATION_THRESHOLD': '0.85', // 85% health factor threshold
    'CHECK_INTERVAL': '60', // seconds
    'LOG_LEVEL': 'info'
  };

  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ Liquidation Bot configured', 'green');
  return true;
}

async function setupMonitoringService(deploymentData) {
  log('\n📊 Setting up Monitoring Service...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const servicePath = path.join(__dirname, 'backend', 'monitoring-service');
  const envPath = path.join(servicePath, '.env');

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  const install = execCommand('npm install', servicePath, true);
  if (!install.success) {
    log('❌ Failed to install Monitoring Service dependencies', 'red');
    return false;
  }

  // Create .env file
  const envVars = {
    'HEDERA_NETWORK': 'testnet',
    'HEDERA_TESTNET_MIRROR_NODE': deploymentData.env.HEDERA_TESTNET_MIRROR_NODE || 'https://testnet.mirrornode.hedera.com',
    'POOL_ADDRESS': deploymentData.contracts.POOL_ADDRESS || deploymentData.contracts.Pool,
    'HCS_EVENT_SERVICE_URL': 'http://localhost:3001',
    'NODE_STAKING_SERVICE_URL': 'http://localhost:3003',
    'CHECK_INTERVAL': '300', // 5 minutes
    'PORT': '3004',
    'LOG_LEVEL': 'info'
  };

  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ Monitoring Service configured', 'green');
  return true;
}

async function setupRateLimitingService(deploymentData) {
  log('\n🚦 Setting up Rate Limiting Service...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const servicePath = path.join(__dirname, 'backend', 'rate-limiting-service');
  const envPath = path.join(servicePath, '.env');

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  const install = execCommand('npm install', servicePath, true);
  if (!install.success) {
    log('❌ Failed to install Rate Limiting Service dependencies', 'red');
    return false;
  }

  // Create .env file
  const envVars = {
    'PORT': '3005',
    'REDIS_URL': 'redis://localhost:6379',
    'RATE_LIMIT_WINDOW': '900', // 15 minutes
    'RATE_LIMIT_MAX': '100', // 100 requests per window
    'LOG_LEVEL': 'info'
  };

  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  log('✅ Rate Limiting Service configured', 'green');
  return true;
}

function displaySetupSummary() {
  log('\n🎉 BACKEND SETUP COMPLETE!', 'green');
  log('━'.repeat(60), 'green');

  log('\n📋 CONFIGURED SERVICES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   ✅ HCS Event Service      (Port 3001)', 'white');
  log('   ✅ Node Staking Service   (Port 3003)', 'white');
  log('   ✅ Liquidation Bot        (Background)', 'white');
  log('   ✅ Monitoring Service     (Port 3004)', 'white');
  log('   ✅ Rate Limiting Service  (Port 3005)', 'white');

  log('\n🚀 START SERVICES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   Start all services:', 'yellow');
  log('   npm run start:backend:all', 'white');
  log('', 'white');
  log('   Or start individually:', 'yellow');
  log('   npm run start:hcs         # HCS Event Service', 'white');
  log('   npm run start:staking     # Node Staking Service', 'white');
  log('   npm run start:liquidation # Liquidation Bot', 'white');

  log('\n📊 SERVICE ENDPOINTS:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   HCS Event Service:    http://localhost:3001/health', 'white');
  log('   Node Staking Service: http://localhost:3003/health', 'white');
  log('   Monitoring Service:   http://localhost:3004/health', 'white');
  log('   Rate Limiting:        http://localhost:3005/health', 'white');

  log('\n💡 WHAT EACH SERVICE DOES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   🔸 HCS Event Service: Logs all protocol events to HCS topics', 'white');
  log('   🔸 Node Staking Service: Stakes HBAR and distributes rewards', 'white');
  log('   🔸 Liquidation Bot: Monitors and liquidates risky positions', 'white');
  log('   🔸 Monitoring Service: Health checks and system monitoring', 'white');
  log('   🔸 Rate Limiting: API rate limiting and DDoS protection', 'white');

  log('\n📄 CONFIGURATION FILES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   - backend/hcs-event-service/.env', 'white');
  log('   - backend/node-staking-service/.env', 'white');
  log('   - backend/liquidation-bot/.env', 'white');
  log('   - backend/monitoring-service/.env', 'white');
  log('   - backend/rate-limiting-service/.env', 'white');

  log('\n✅ BACKEND SERVICES READY TO START!', 'green');
  log('━'.repeat(60), 'green');
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                                                            ║', 'magenta');
  log('║           DERA PROTOCOL - BACKEND SERVICES SETUP          ║', 'magenta');
  log('║                                                            ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  log('\n🎯 This script will configure all backend services for Dera Protocol', 'yellow');
  log('⏱️  Expected time: 2-3 minutes', 'yellow');
  log('📋 Prerequisites: Contracts must be deployed first', 'yellow');

  // Check prerequisites
  if (!checkPrerequisites()) {
    log('\n❌ Prerequisites check failed. Please fix the issues above and try again.', 'red');
    process.exit(1);
  }

  const answer = await promptUser('\n▶️  Ready to setup backend services? (y/n): ');
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    log('\n❌ Setup cancelled by user', 'yellow');
    process.exit(0);
  }

  const startTime = Date.now();

  // Load deployment information
  log('\n📖 Loading deployment information...', 'cyan');
  const deploymentData = loadDeploymentInfo();
  log('✅ Deployment data loaded', 'green');

  // Setup each service
  const services = [
    { name: 'HCS Event Service', setup: setupHCSEventService },
    { name: 'Node Staking Service', setup: setupNodeStakingService },
    { name: 'Liquidation Bot', setup: setupLiquidationBot },
    { name: 'Monitoring Service', setup: setupMonitoringService },
    { name: 'Rate Limiting Service', setup: setupRateLimitingService }
  ];

  for (const service of services) {
    if (!await service.setup(deploymentData)) {
      log(`\n❌ Failed to setup ${service.name}`, 'red');
      process.exit(1);
    }
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  // Display summary
  displaySetupSummary();

  log(`\n⏱️  Total setup time: ${duration} seconds`, 'cyan');
  log('\n🎉 Backend services are ready to start!', 'magenta');
}

// Run main function
main().catch((error) => {
  log('\n❌ Fatal error during backend setup:', 'red');
  console.error(error);
  process.exit(1);
});