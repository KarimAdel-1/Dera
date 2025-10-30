# Quick Deployment Guide - Dera Protocol

**Status:** Ready to Deploy ✅  
**Time Required:** 2-3 hours  
**Network:** Hedera Testnet

---

## Prerequisites

### 1. Hedera Account Setup
```bash
# Get testnet account from: https://portal.hedera.com/
# You'll receive:
# - Account ID (e.g., 0.0.123456)
# - Private Key (DER format)
# - 100 HBAR initial balance
```

### 2. WalletConnect Project
```bash
# Get project ID from: https://cloud.walletconnect.com/
# Required for HashPack wallet integration
```

### 3. System Requirements
```bash
node --version  # v18+
npm --version   # v9+
```

---

## Phase 1: Compile Contracts (5 mins)

```bash
cd contracts

# Install dependencies
npm install

# Compile contracts
npm run compile

# Verify compilation
ls artifacts/contracts/contracts/protocol/pool/Pool.sol/Pool.json
ls artifacts/contracts/contracts/hedera/DeraHCSEventStreamer.sol/DeraHCSEventStreamer.json
```

**Expected Output:**
```
✓ Compiled 60 Solidity files successfully
```

---

## Phase 2: Deploy Core Contracts (30 mins)

### Step 1: Configure Environment
```bash
# Create contracts/.env
cat > .env << EOF
DEPLOYER_PRIVATE_KEY=your_private_key_here
DEPLOYER_ACCOUNT_ID=0.0.123456
HEDERA_NETWORK=testnet
EOF
```

### Step 2: Deploy Core Contracts
```bash
# Create deployment script
cat > scripts/deploy-all.js << 'EOF'
const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Deploying Dera Protocol to Hedera Testnet\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const addresses = {};

  // 1. Deploy PoolAddressesProvider
  console.log('📍 Deploying PoolAddressesProvider...');
  const PoolAddressesProvider = await ethers.getContractFactory('PoolAddressesProvider');
  const addressesProvider = await PoolAddressesProvider.deploy('DERA_MARKET', deployer.address);
  await addressesProvider.waitForDeployment();
  addresses.POOL_ADDRESSES_PROVIDER = await addressesProvider.getAddress();
  console.log('✅ PoolAddressesProvider:', addresses.POOL_ADDRESSES_PROVIDER);

  // 2. Deploy ACLManager
  console.log('📍 Deploying ACLManager...');
  const ACLManager = await ethers.getContractFactory('ACLManager');
  const aclManager = await ACLManager.deploy(addresses.POOL_ADDRESSES_PROVIDER);
  await aclManager.waitForDeployment();
  addresses.ACL_MANAGER = await aclManager.getAddress();
  console.log('✅ ACLManager:', addresses.ACL_MANAGER);

  // Set ACLManager
  await addressesProvider.setACLManager(addresses.ACL_MANAGER);

  // 3. Deploy Oracle
  console.log('📍 Deploying DeraOracle...');
  const DeraOracle = await ethers.getContractFactory('DeraOracle');
  const oracle = await DeraOracle.deploy();
  await oracle.waitForDeployment();
  addresses.ORACLE = await oracle.getAddress();
  console.log('✅ Oracle:', addresses.ORACLE);

  // Set Oracle
  await addressesProvider.setPriceOracle(addresses.ORACLE);

  // 4. Deploy Interest Rate Strategy
  console.log('📍 Deploying Interest Rate Strategy...');
  const InterestRateStrategy = await ethers.getContractFactory('DefaultReserveInterestRateStrategy');
  const rateStrategy = await InterestRateStrategy.deploy(
    addresses.POOL_ADDRESSES_PROVIDER,
    ethers.parseUnits('0.8', 27), // 80% optimal utilization
    ethers.parseUnits('0', 27),   // 0% base rate
    ethers.parseUnits('0.04', 27), // 4% slope 1
    ethers.parseUnits('1.0', 27)   // 100% slope 2
  );
  await rateStrategy.waitForDeployment();
  addresses.RATE_STRATEGY = await rateStrategy.getAddress();
  console.log('✅ Rate Strategy:', addresses.RATE_STRATEGY);

  // 5. Deploy Pool
  console.log('📍 Deploying Pool...');
  const Pool = await ethers.getContractFactory('Pool');
  const pool = await Pool.deploy(addresses.POOL_ADDRESSES_PROVIDER);
  await pool.waitForDeployment();
  addresses.POOL = await pool.getAddress();
  console.log('✅ Pool:', addresses.POOL);

  // Initialize Pool
  await pool.initialize(addresses.POOL_ADDRESSES_PROVIDER);
  await addressesProvider.setPool(addresses.POOL);

  // 6. Deploy PoolConfigurator
  console.log('📍 Deploying PoolConfigurator...');
  const PoolConfigurator = await ethers.getContractFactory('PoolConfigurator');
  const poolConfigurator = await PoolConfigurator.deploy();
  await poolConfigurator.waitForDeployment();
  addresses.POOL_CONFIGURATOR = await poolConfigurator.getAddress();
  console.log('✅ PoolConfigurator:', addresses.POOL_CONFIGURATOR);

  await addressesProvider.setPoolConfigurator(addresses.POOL_CONFIGURATOR);

  // Save addresses
  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2));
  
  console.log('\n✅ Core contracts deployed successfully!');
  console.log('📄 Addresses saved to deployed-addresses.json');
  
  return addresses;
}

main().catch(console.error);
EOF

# Run deployment
npx hardhat run scripts/deploy-all.js --network testnet
```

**Save the output addresses!** You'll need them for the next steps.

---

## Phase 3: Create HCS Topics (15 mins)

```bash
# Install Hedera SDK
npm install --save-dev @hashgraph/sdk

# Create HCS topics script
cat > scripts/create-hcs-topics.js << 'EOF'
const { Client, TopicCreateTransaction, PrivateKey, AccountId } = require('@hashgraph/sdk');
require('dotenv').config();
const fs = require('fs');

async function main() {
  console.log('🚀 Creating HCS Topics\n');

  const accountId = AccountId.fromString(process.env.DEPLOYER_ACCOUNT_ID);
  const privateKey = PrivateKey.fromString(process.env.DEPLOYER_PRIVATE_KEY);

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  const topics = {};
  const eventTypes = ['SUPPLY', 'WITHDRAW', 'BORROW', 'REPAY', 'LIQUIDATION'];

  for (const eventType of eventTypes) {
    console.log(`📍 Creating ${eventType} topic...`);
    
    const createTx = new TopicCreateTransaction()
      .setTopicMemo(`Dera Protocol - ${eventType} events`)
      .setAdminKey(privateKey.publicKey)
      .setSubmitKey(privateKey.publicKey);

    const response = await createTx.execute(client);
    const receipt = await response.getReceipt(client);
    const topicId = receipt.topicId.toString();
    
    topics[eventType] = topicId;
    console.log(`✅ ${eventType} Topic: ${topicId}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync('./hcs-topics.json', JSON.stringify(topics, null, 2));
  console.log('\n✅ HCS topics created and saved to hcs-topics.json');
  
  client.close();
}

main().catch(console.error);
EOF

# Run HCS topic creation
node scripts/create-hcs-topics.js
```

---

## Phase 4: Deploy Hedera Contracts (20 mins)

```bash
# Create Hedera contracts deployment script
cat > scripts/deploy-hedera-contracts.js << 'EOF'
const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Deploying Hedera-Specific Contracts\n');

  const coreAddresses = JSON.parse(fs.readFileSync('./deployed-addresses.json', 'utf8'));
  const hcsTopics = JSON.parse(fs.readFileSync('./hcs-topics.json', 'utf8'));

  const [deployer] = await ethers.getSigners();
  const addresses = { ...coreAddresses };

  // 1. Deploy HCS Event Streamer
  console.log('📍 Deploying DeraHCSEventStreamer...');
  const HCSStreamer = await ethers.getContractFactory('DeraHCSEventStreamer');
  const hcsStreamer = await HCSStreamer.deploy(addresses.POOL, deployer.address);
  await hcsStreamer.waitForDeployment();
  addresses.HCS_STREAMER = await hcsStreamer.getAddress();
  console.log('✅ HCS Streamer:', addresses.HCS_STREAMER);

  // 2. Deploy Analytics
  console.log('📍 Deploying DeraMirrorNodeAnalytics...');
  const Analytics = await ethers.getContractFactory('DeraMirrorNodeAnalytics');
  const analytics = await Analytics.deploy(addresses.POOL, deployer.address);
  await analytics.waitForDeployment();
  addresses.ANALYTICS = await analytics.getAddress();
  console.log('✅ Analytics:', addresses.ANALYTICS);

  // 3. Deploy Node Staking
  console.log('📍 Deploying DeraNodeStaking...');
  const NodeStaking = await ethers.getContractFactory('DeraNodeStaking');
  const nodeStaking = await NodeStaking.deploy(addresses.POOL, deployer.address);
  await nodeStaking.waitForDeployment();
  addresses.NODE_STAKING = await nodeStaking.getAddress();
  console.log('✅ Node Staking:', addresses.NODE_STAKING);

  // 4. Deploy Protocol Integration
  console.log('📍 Deploying DeraProtocolIntegration...');
  const ProtocolIntegration = await ethers.getContractFactory('DeraProtocolIntegration');
  const protocolIntegration = await ProtocolIntegration.deploy(addresses.POOL, deployer.address);
  await protocolIntegration.waitForDeployment();
  addresses.PROTOCOL_INTEGRATION = await protocolIntegration.getAddress();
  console.log('✅ Protocol Integration:', addresses.PROTOCOL_INTEGRATION);

  // Save all addresses
  fs.writeFileSync('./deployed-addresses-final.json', JSON.stringify(addresses, null, 2));
  
  console.log('\n✅ Hedera contracts deployed successfully!');
  console.log('📄 Final addresses saved to deployed-addresses-final.json');
}

main().catch(console.error);
EOF

# Run Hedera contracts deployment
npx hardhat run scripts/deploy-hedera-contracts.js --network testnet
```

---

## Phase 5: Configure Integration (10 mins)

```bash
# Create integration configuration script
cat > scripts/configure-integration.js << 'EOF'
const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Configuring Contract Integration\n');

  const addresses = JSON.parse(fs.readFileSync('./deployed-addresses-final.json', 'utf8'));
  const [deployer] = await ethers.getSigners();

  // Get contract instances
  const pool = await ethers.getContractAt('Pool', addresses.POOL);

  console.log('📍 Setting integrations in Pool contract...');
  
  // Set HCS Event Streamer
  await pool.setHCSEventStreamer(addresses.HCS_STREAMER);
  console.log('✅ HCS Event Streamer set');

  // Set Protocol Integration
  await pool.setProtocolIntegration(addresses.PROTOCOL_INTEGRATION);
  console.log('✅ Protocol Integration set');

  // Set Analytics Contract
  await pool.setAnalyticsContract(addresses.ANALYTICS);
  console.log('✅ Analytics Contract set');

  // Set Node Staking Contract
  await pool.setNodeStakingContract(addresses.NODE_STAKING);
  console.log('✅ Node Staking Contract set');

  console.log('\n✅ Integration configured successfully!');
}

main().catch(console.error);
EOF

# Run integration configuration
npx hardhat run scripts/configure-integration.js --network testnet
```

---

## Phase 6: Setup Backend Services (20 mins)

### Step 1: Copy ABIs
```bash
# Create ABI directories
mkdir -p ../backend/shared/abis
mkdir -p ../backend/liquidation-bot/abis

# Copy ABIs
cp artifacts/contracts/contracts/protocol/pool/Pool.sol/Pool.json ../backend/shared/abis/
cp artifacts/contracts/contracts/hedera/DeraHCSEventStreamer.sol/DeraHCSEventStreamer.json ../backend/shared/abis/
cp artifacts/contracts/contracts/hedera/DeraMirrorNodeAnalytics.sol/DeraMirrorNodeAnalytics.json ../backend/shared/abis/
cp artifacts/contracts/contracts/misc/DeraOracle.sol/DeraOracle.json ../backend/shared/abis/

# Copy to liquidation bot
cp ../backend/shared/abis/* ../backend/liquidation-bot/abis/

echo "✅ ABIs copied to backend services"
```

### Step 2: Configure Backend Services
```bash
cd ../backend

# Read deployed addresses
POOL_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"POOL": "[^"]*"' | cut -d'"' -f4)
ORACLE_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"ORACLE": "[^"]*"' | cut -d'"' -f4)
HCS_STREAMER_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"HCS_STREAMER": "[^"]*"' | cut -d'"' -f4)

# HCS Event Service
cd hcs-event-service
cat > .env << EOF
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your_private_key_here
HCS_SUPPLY_TOPIC=$(cat ../../contracts/hcs-topics.json | grep -o '"SUPPLY": "[^"]*"' | cut -d'"' -f4)
HCS_WITHDRAW_TOPIC=$(cat ../../contracts/hcs-topics.json | grep -o '"WITHDRAW": "[^"]*"' | cut -d'"' -f4)
HCS_BORROW_TOPIC=$(cat ../../contracts/hcs-topics.json | grep -o '"BORROW": "[^"]*"' | cut -d'"' -f4)
HCS_REPAY_TOPIC=$(cat ../../contracts/hcs-topics.json | grep -o '"REPAY": "[^"]*"' | cut -d'"' -f4)
HCS_LIQUIDATION_TOPIC=$(cat ../../contracts/hcs-topics.json | grep -o '"LIQUIDATION": "[^"]*"' | cut -d'"' -f4)
POOL_ADDRESS=$POOL_ADDRESS
HCS_STREAMER_ADDRESS=$HCS_STREAMER_ADDRESS
RPC_URL=https://testnet.hashio.io/api
POLL_INTERVAL_MS=5000
EOF

# Install and start
npm install
npm install -g pm2
pm2 start ecosystem.config.js
cd ..

# Liquidation Bot
cd liquidation-bot
cat > .env << EOF
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.123456
HEDERA_PRIVATE_KEY=your_private_key_here
LIQUIDATOR_PRIVATE_KEY=0xYOUR_EVM_PRIVATE_KEY
POOL_ADDRESS=$POOL_ADDRESS
ORACLE_ADDRESS=$ORACLE_ADDRESS
RPC_URL=https://testnet.hashio.io/api
CHECK_INTERVAL_MS=30000
MIN_HEALTH_FACTOR=1.0
MIN_PROFIT_USD=10
EOF

npm install
pm2 start ecosystem.config.js
cd ..

echo "✅ Backend services configured and started"
```

---

## Phase 7: Configure Frontend (10 mins)

```bash
cd ../frontend

# Create environment file
cat > .env.local << EOF
# Contract Addresses
NEXT_PUBLIC_POOL_ADDRESS=$POOL_ADDRESS
NEXT_PUBLIC_ORACLE_ADDRESS=$ORACLE_ADDRESS
NEXT_PUBLIC_HCS_STREAMER_ADDRESS=$HCS_STREAMER_ADDRESS
NEXT_PUBLIC_ANALYTICS_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"ANALYTICS": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_NODE_STAKING_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"NODE_STAKING": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_PROTOCOL_INTEGRATION_ADDRESS=$(cat ../contracts/deployed-addresses-final.json | grep -o '"PROTOCOL_INTEGRATION": "[^"]*"' | cut -d'"' -f4)

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=0.0.456789  # Replace with actual USDC token ID
NEXT_PUBLIC_HBAR_ADDRESS=0.0.0

# HCS Topics
NEXT_PUBLIC_HCS_SUPPLY_TOPIC=$(cat ../contracts/hcs-topics.json | grep -o '"SUPPLY": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=$(cat ../contracts/hcs-topics.json | grep -o '"WITHDRAW": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_HCS_BORROW_TOPIC=$(cat ../contracts/hcs-topics.json | grep -o '"BORROW": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_HCS_REPAY_TOPIC=$(cat ../contracts/hcs-topics.json | grep -o '"REPAY": "[^"]*"' | cut -d'"' -f4)
NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=$(cat ../contracts/hcs-topics.json | grep -o '"LIQUIDATION": "[^"]*"' | cut -d'"' -f4)

# Hedera Network
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
NEXT_PUBLIC_RPC_URL=https://testnet.hashio.io/api

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EOF

# Install dependencies and build
npm install
npm run build
npm run dev
```

---

## Phase 8: Test Functionality (30 mins)

### Step 1: Verify Deployment
```bash
# Check contract deployment
echo "Pool Address: $POOL_ADDRESS"
echo "Oracle Address: $ORACLE_ADDRESS"

# Verify on HashScan
echo "View Pool on HashScan: https://hashscan.io/testnet/contract/$POOL_ADDRESS"
echo "View Oracle on HashScan: https://hashscan.io/testnet/contract/$ORACLE_ADDRESS"
```

### Step 2: Check Backend Services
```bash
# Check PM2 status
pm2 status

# Should show:
# dera-hcs-event-service    | online
# dera-liquidation-bot      | online

# Check logs
pm2 logs --lines 20
```

### Step 3: Test Frontend
```bash
# Frontend should be running at http://localhost:3000
# Open browser and navigate to:
echo "Frontend URL: http://localhost:3000"

# Test checklist:
# 1. ✅ Page loads without errors
# 2. ✅ Connect HashPack wallet
# 3. ✅ View dashboard
# 4. ✅ See HBAR and USDC assets (no USDT)
# 5. ✅ Navigate between tabs
```

### Step 4: Test Transactions

**Prerequisites:**
- HashPack wallet installed
- Testnet HBAR in wallet (get from portal.hedera.com)
- USDC tokens (if testing USDC supply)

**Test Supply:**
1. Go to Supply tab
2. Select HBAR
3. Enter amount (e.g., 10 HBAR)
4. Click "Supply"
5. Confirm in HashPack
6. Wait for confirmation
7. Check transaction on HashScan

**Test Borrow:**
1. Go to Borrow tab
2. Select asset to borrow
3. Enter amount
4. Click "Borrow"
5. Confirm in HashPack
6. Verify borrowed amount appears

**Test HCS Events:**
1. Go to HCS Event History tab
2. Should see your supply/borrow events
3. Click "View on HashScan" to verify

---

## Troubleshooting

### Contract Deployment Issues
```bash
# If deployment fails:
# 1. Check HBAR balance (need ~20 HBAR for deployment)
# 2. Verify private key format
# 3. Check network connectivity

# Get account balance:
# Visit: https://hashscan.io/testnet/account/0.0.YOUR_ACCOUNT_ID
```

### Backend Service Issues
```bash
# If services won't start:
pm2 logs dera-hcs-event-service

# Common issues:
# 1. Missing .env file
# 2. Wrong contract addresses
# 3. Invalid private keys
# 4. Network connectivity

# Restart services:
pm2 restart all
```

### Frontend Issues
```bash
# If frontend shows errors:
# 1. Check .env.local exists and has correct addresses
# 2. Verify contract addresses are valid
# 3. Check browser console for errors

# Common fixes:
npm run build  # Rebuild if needed
rm -rf .next   # Clear Next.js cache
npm run dev    # Restart dev server
```

### Transaction Failures
```bash
# If transactions fail:
# 1. Check wallet has sufficient HBAR for gas
# 2. Verify contract addresses are correct
# 3. Check if tokens are associated (HTS requirement)
# 4. Verify network is testnet in all configs
```

---

## Post-Deployment Setup

### 1. Configure Assets
```bash
# Add USDC to pool (via hardhat console)
cd contracts
npx hardhat console --network testnet

# In console:
const poolConfigurator = await ethers.getContractAt("PoolConfigurator", "YOUR_CONFIGURATOR_ADDRESS");
// Configure USDC asset...
```

### 2. Set Oracle Prices
```bash
# In hardhat console:
const oracle = await ethers.getContractAt("DeraOracle", "YOUR_ORACLE_ADDRESS");
await oracle.setAssetPrice("0.0.USDC_TOKEN", ethers.parseUnits("1", 8)); // $1 USD
await oracle.setAssetPrice("0.0.0", ethers.parseUnits("0.08", 8)); // $0.08 HBAR
```

### 3. Monitor Services
```bash
# Set up monitoring
pm2 monit

# View logs
tail -f backend/hcs-event-service/logs/combined.log
tail -f backend/liquidation-bot/logs/combined.log
```

---

## Success Criteria

### ✅ Deployment Complete When:
- [ ] All contracts deployed to Hedera testnet
- [ ] HCS topics created and visible on HashScan
- [ ] Backend services running (pm2 status shows "online")
- [ ] Frontend loads at http://localhost:3000
- [ ] HashPack wallet connects successfully
- [ ] Can view assets (HBAR, USDC only)
- [ ] Supply transaction works end-to-end
- [ ] HCS events appear in event history
- [ ] Transaction appears on HashScan

### 🎯 Ready for Users When:
- [ ] Oracle prices set for all assets
- [ ] Assets configured in pool
- [ ] Liquidation bot funded and monitoring
- [ ] All tests pass
- [ ] Documentation updated with deployed addresses

---

## Next Steps

1. **Add More Assets:** Configure additional HTS tokens
2. **Set Up Monitoring:** Add alerts and dashboards
3. **Scale Backend:** Add load balancing and redundancy
4. **Security Audit:** Review contracts and configurations
5. **Mainnet Preparation:** Plan mainnet deployment

---

**Total Deployment Time:** ~2-3 hours  
**Difficulty:** Intermediate  
**Support:** Check existing documentation for detailed troubleshooting

**🎉 You're ready to deploy Dera Protocol on Hedera!**