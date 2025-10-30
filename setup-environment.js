#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupEnvironment() {
  console.log('🚀 Dera Protocol Environment Setup\n');

  // Get user inputs
  const accountId = await question('Enter your Hedera Account ID (e.g., 0.0.123456): ');
  const privateKey = await question('Enter your Private Key: ');
  const walletConnectId = await question('Enter WalletConnect Project ID (optional): ');

  // Validate inputs
  if (!accountId.match(/^0\.0\.\d+$/)) {
    console.error('❌ Invalid Account ID format. Expected: 0.0.123456');
    process.exit(1);
  }

  if (!privateKey || privateKey.length < 64) {
    console.error('❌ Invalid private key');
    process.exit(1);
  }

  // Create contracts/.env
  const contractsEnv = `# Hedera Network Configuration
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_MAINNET_RPC=https://mainnet.hashio.io/api

# Deployment Account
PRIVATE_KEY=${privateKey}
HEDERA_OPERATOR_ID=${accountId}
HEDERA_OPERATOR_KEY=${privateKey}

# Gas Reporting
REPORT_GAS=false

# Reward Token (HBAR)
REWARD_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
`;

  // Create frontend/.env.local
  const frontendEnv = `# Hedera Network Configuration
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Contract Addresses (Will be updated after deployment)
NEXT_PUBLIC_POOL_ADDRESS=
NEXT_PUBLIC_ORACLE_ADDRESS=
NEXT_PUBLIC_ANALYTICS_ADDRESS=
NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=
NEXT_PUBLIC_NODE_STAKING_ADDRESS=
NEXT_PUBLIC_HCS_STREAMER_ADDRESS=

# HCS Topic IDs (Will be updated after HCS topic creation)
NEXT_PUBLIC_HCS_SUPPLY_TOPIC=
NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=
NEXT_PUBLIC_HCS_BORROW_TOPIC=
NEXT_PUBLIC_HCS_REPAY_TOPIC=
NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=

# Asset Addresses
NEXT_PUBLIC_USDC_ADDRESS=0.0.456789
NEXT_PUBLIC_HBAR_ADDRESS=0.0.000000

# HashPack Configuration
NEXT_PUBLIC_HASHPACK_APP_NAME=Dera Protocol
NEXT_PUBLIC_HASHPACK_APP_DESCRIPTION=Hedera-native DeFi lending protocol
NEXT_PUBLIC_HASHPACK_APP_ICON=https://your-domain.com/icon.png
${walletConnectId ? `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${walletConnectId}` : ''}
`;

  // Write files
  fs.writeFileSync(path.join(__dirname, 'contracts', '.env'), contractsEnv);
  fs.writeFileSync(path.join(__dirname, 'frontend', '.env.local'), frontendEnv);

  console.log('\n✅ Environment files created:');
  console.log('   - contracts/.env');
  console.log('   - frontend/.env.local');
  
  console.log('\n🔧 Next steps:');
  console.log('   1. cd contracts && npm install');
  console.log('   2. npm run deploy');
  
  rl.close();
}

setupEnvironment().catch(console.error);