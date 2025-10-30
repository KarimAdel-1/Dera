#!/usr/bin/env node

/**
 * DERA PROTOCOL - ENVIRONMENT SETUP WIZARD
 * =========================================
 *
 * Interactive wizard to help set up your .env file with proper credentials.
 *
 * Usage: npm run setup-env
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function validatePrivateKey(key) {
  if (!key) return false;

  // Remove 0x prefix if present
  const cleanKey = key.startsWith('0x') ? key.slice(2) : key;

  // Must be 64 hex characters (32 bytes)
  if (cleanKey.length !== 64) return false;
  if (!/^[0-9a-fA-F]+$/.test(cleanKey)) return false;

  return true;
}

function validateHederaAccountId(id) {
  if (!id) return false;
  // Format: 0.0.xxxxx
  return /^0\.0\.\d+$/.test(id);
}

function validateHederaPrivateKey(key) {
  if (!key) return false;
  // DER format starts with 302e
  return key.startsWith('302e') && key.length >= 64;
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                                                            ║', 'magenta');
  log('║        DERA PROTOCOL - ENVIRONMENT SETUP WIZARD           ║', 'magenta');
  log('║                                                            ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  log('\nThis wizard will help you set up your .env file for deployment.\n', 'cyan');

  const envPath = path.join(__dirname, 'contracts', '.env');
  const envExamplePath = path.join(__dirname, 'contracts', '.env.example');

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    log('⚠️  .env file already exists!', 'yellow');
    const overwrite = await question('Do you want to overwrite it? (yes/no): ');
    if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
      log('\n❌ Setup cancelled. Existing .env file kept.', 'yellow');
      rl.close();
      return;
    }
  }

  log('\n📋 REQUIRED CREDENTIALS', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('\nYou need a Hedera testnet account. If you don\'t have one:', 'white');
  log('   1. Visit: https://portal.hedera.com/', 'blue');
  log('   2. Create account and get credentials', 'blue');
  log('   3. Request 100 HBAR from faucet\n', 'blue');

  const proceed = await question('Do you have your Hedera credentials ready? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
    log('\n⚠️  Please get your Hedera credentials first, then run this wizard again.', 'yellow');
    log('   npm run setup-env\n', 'cyan');
    rl.close();
    return;
  }

  log('\n━'.repeat(60), 'cyan');
  log('📝 STEP 1: Hedera Account ID', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('Format: 0.0.xxxxx (example: 0.0.1234567)\n', 'white');

  let accountId;
  while (true) {
    accountId = await question('Enter your Hedera Account ID: ');
    if (validateHederaAccountId(accountId)) {
      log('✅ Valid account ID', 'green');
      break;
    } else {
      log('❌ Invalid format. Must be like: 0.0.1234567', 'red');
    }
  }

  log('\n━'.repeat(60), 'cyan');
  log('📝 STEP 2: Hedera Private Key (DER format)', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('This is the key from Hedera Portal (starts with 302e)', 'white');
  log('Example: 302e020100300506032b65700422042012345...', 'white');
  log('', 'white');

  let hederaKey;
  while (true) {
    hederaKey = await question('Enter your Hedera Private Key (DER): ');
    if (validateHederaPrivateKey(hederaKey)) {
      log('✅ Valid Hedera private key', 'green');
      break;
    } else {
      log('❌ Invalid format. Must start with 302e and be at least 64 chars', 'red');
    }
  }

  log('\n━'.repeat(60), 'cyan');
  log('📝 STEP 3: Private Key (Hex format for ethers.js)', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('This is the same key but in hex format (64 characters)', 'white');
  log('You can add 0x prefix or not - both work', 'white');
  log('Example: 0x1234567890abcdef...', 'white');
  log('', 'white');

  let privateKey;
  while (true) {
    privateKey = await question('Enter your Private Key (hex): ');
    if (validatePrivateKey(privateKey)) {
      // Ensure it has 0x prefix
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      log('✅ Valid private key', 'green');
      break;
    } else {
      log('❌ Invalid format. Must be 64 hex characters (32 bytes)', 'red');
      log('   Example: 0x1234567890abcdef... (64 chars after 0x)', 'yellow');
    }
  }

  // Create .env file
  log('\n━'.repeat(60), 'cyan');
  log('💾 Creating .env file...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const envContent = `# Hedera Network Configuration
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_MAINNET_RPC=https://mainnet.hashio.io/api

# Private key for deployment (NEVER commit the actual .env file)
PRIVATE_KEY=${privateKey}

# Hedera Account IDs
HEDERA_OPERATOR_ID=${accountId}
HEDERA_OPERATOR_KEY=${hederaKey}

# API Keys
COINMARKETCAP_API_KEY=

# Gas Reporting
REPORT_GAS=false

# Contract Addresses (after deployment)
POOL_ADDRESSES_PROVIDER=
POOL_ADDRESS=
POOL_CONFIGURATOR=
ORACLE_ADDRESS=
TREASURY_ADDRESS=

# Pyth Oracle Configuration
PYTH_CONTRACT_ADDRESS=0x0708325268dF9F66270F1401206434524814508b
PYTH_PRICE_FEED_IDS_HBAR=
PYTH_PRICE_FEED_IDS_USDC=

# HCS Configuration
HCS_TOPIC_ID=
HCS_EVENT_STREAMER_ADDRESS=

# Node Staking Configuration
NODE_STAKING_CONTRACT_ADDRESS=
STAKING_NODE_ID=

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Admin Addresses
POOL_ADMIN=
EMERGENCY_ADMIN=
RISK_ADMIN=
`;

  fs.writeFileSync(envPath, envContent, 'utf8');

  log('\n✅ SUCCESS! Your .env file has been created!', 'green');
  log('\n📄 File location: contracts/.env', 'cyan');
  log('\n🔐 IMPORTANT SECURITY NOTES:', 'yellow');
  log('   • NEVER commit .env file to git', 'white');
  log('   • NEVER share your private keys', 'white');
  log('   • The .env file is already in .gitignore', 'white');

  log('\n🚀 NEXT STEPS:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   1. Verify your setup:', 'yellow');
  log('      npm run verify-setup', 'white');
  log('', 'white');
  log('   2. Deploy the protocol:', 'yellow');
  log('      npm run deploy:hackathon', 'white');
  log('', 'white');
  log('   3. Start the frontend:', 'yellow');
  log('      cd frontend && npm run dev', 'white');

  log('\n✅ Setup complete! You\'re ready to deploy!\n', 'green');

  rl.close();
}

main().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});
