# Dera Protocol Complete Deployment Guide
## Step-by-Step Deployment for Hedera Testnet/Mainnet

**Last Updated:** October 29, 2025
**Version:** 1.0
**Network:** Hedera Testnet (can be adapted for Mainnet)

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Hedera Tools Used](#hedera-tools-used)
4. [Pre-Deployment Setup](#pre-deployment-setup)
5. [Phase 1: Deploy Core Contracts](#phase-1-deploy-core-contracts)
6. [Phase 2: Create HCS Topics](#phase-2-create-hcs-topics)
7. [Phase 3: Deploy Hedera-Specific Contracts](#phase-3-deploy-hedera-specific-contracts)
8. [Phase 4: Configure Contract Integration](#phase-4-configure-contract-integration)
9. [Phase 5: Deploy Backend Services](#phase-5-deploy-backend-services)
10. [Phase 6: Configure Frontend](#phase-6-configure-frontend)
11. [Phase 7: Testing & Verification](#phase-7-testing--verification)
12. [Post-Deployment Checklist](#post-deployment-checklist)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts & Keys

1. **Hedera Account**
   - Testnet account with sufficient HBAR (get from [https://portal.hedera.com/](https://portal.hedera.com/))
   - Account ID (e.g., `0.0.123456`)
   - Private key (ED25519 or ECDSA secp256k1)
   - Minimum balance: 100 HBAR for testnet deployment

2. **Node.js Environment**
   ```bash
   node --version  # v18 or higher
   npm --version   # v9 or higher
   ```

3. **Required Tools**
   ```bash
   # Install globally
   npm install -g hardhat
   npm install -g pm2  # For backend services
   ```

4. **WalletConnect Project ID**
   - Get from [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/)
   - Required for HashPack wallet integration

### Environment Variables Template

Create these files now (we'll fill them in during deployment):
```bash
# Create config files
touch contracts/.env
touch frontend/.env.local
touch backend/hcs-event-service/.env
touch backend/liquidation-bot/.env
touch backend/node-staking-service/.env
touch backend/monitoring-service/.env
touch backend/rate-updater-service/.env
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
│  - DeraProtocolDashboard                                    │
│  - Wallet Integration (HashPack via WalletConnect)         │
│  - Real-time HCS Event Display                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓ (JSON-RPC Relay)
┌─────────────────────────────────────────────────────────────┐
│                    SMART CONTRACTS                           │
│  ┌────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │    Pool    │→ │ ProtocolIntegration│→ │ HCS Streamer   │ │
│  │  (Core)    │  │    (Coordinator)   │  │ (Events)       │ │
│  └────────────┘  └──────────────────┘  └─────────────────┘ │
│         │                │                       │           │
│         ↓                ↓                       ↓           │
│  ┌────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │   Oracle   │  │  NodeStaking     │  │   Analytics     │ │
│  │            │  │  (Dual Yield)    │  │  (MirrorNode)   │ │
│  └────────────┘  └──────────────────┘  └─────────────────┘ │
└────────────────┬─────────────────────────────────┬──────────┘
                 │                                  │
                 ↓                                  ↓
┌────────────────────────────────┐   ┌────────────────────────┐
│     HEDERA CONSENSUS SERVICE   │   │   HEDERA TOKEN SERVICE │
│  - Supply Topic (0.0.X)        │   │  - USDC (0.0.Y)        │
│  - Withdraw Topic (0.0.X+1)    │   │  - HBAR (native)       │
│  - Borrow Topic (0.0.X+2)      │   │  - dTokens (HTS)       │
│  - Repay Topic (0.0.X+3)       │   │  - Debt Tokens (HTS)   │
│  - Liquidation Topic (0.0.X+4) │   └────────────────────────┘
└────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                          │
│  - HCS Event Service (listens → publishes to HCS)          │
│  - Liquidation Bot (monitors health factors)                │
│  - Node Staking Service (manages HBAR staking)             │
│  - Rate Updater (updates interest rates)                   │
│  - Monitoring Service (health checks & alerts)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Hedera Tools Used

### ✅ Contracts Use Hedera-Native Tools

1. **HTS (Hedera Token Service)**
   - Location: `Pool.sol:73` - `IHTS private constant HTS = IHTS(address(0x167))`
   - Purpose: All token operations (supply, withdraw, borrow, repay)
   - Functions: `transferToken()`, `approve()`, `balanceOf()`
   - **No ERC20 transfers** - everything goes through HTS precompile

2. **HCS (Hedera Consensus Service)**
   - Location: `DeraHCSEventStreamer.sol`
   - Purpose: Immutable event logging with consensus timestamps
   - Topics: Supply, Withdraw, Borrow, Repay, Liquidation
   - Query: Mirror Node REST API `/api/v1/topics/{topicId}/messages`

3. **Mirror Nodes**
   - Purpose: Historical data, analytics, transaction queries
   - API: `https://testnet.mirrornode.hedera.com/api/v1/`
   - Used by: Frontend (HCS events), Analytics contract, Backend services

### ⚠️ Also Uses (for contract interaction)

4. **ethers.js**
   - Purpose: Contract calls via JSON-RPC Relay (Hedera's EVM compatibility layer)
   - Location: Frontend (`deraProtocolServiceV2.js`), Backend services
   - **Note:** This is correct - Hedera supports EVM via JSON-RPC Relay

5. **Hedera SDK (`@hashgraph/sdk`)**
   - Purpose: Native Hedera operations (HCS submission, HBAR transfers, account management)
   - Location: All backend services
   - **This is the PRIMARY tool for Hedera-specific operations**

### ❌ NOT Using (Good!)

- ✅ No Web3.js
- ✅ No Ethereum-specific libraries
- ✅ No Infura/Alchemy endpoints
- ✅ No Layer 2 solutions

---

## Pre-Deployment Setup

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project
cd /home/user/Dera

# Install contract dependencies
cd contracts
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend service dependencies
cd backend/hcs-event-service && npm install && cd ../..
cd backend/liquidation-bot && npm install && cd ../..
cd backend/node-staking-service && npm install && cd ../..
cd backend/monitoring-service && npm install && cd ../..
cd backend/rate-updater-service && npm install && cd ../..
```

### Step 2: Prepare Deployment Account

```bash
# Set environment variables for deployment
export DEPLOYER_ACCOUNT_ID="0.0.YOUR_ACCOUNT_ID"
export DEPLOYER_PRIVATE_KEY="your_private_key_here"
export HEDERA_NETWORK="testnet"  # or "mainnet"

# Verify account balance
# Use Hedera portal or run:
# hedera-cli account balance $DEPLOYER_ACCOUNT_ID
```

### Step 3: Configure Hardhat for Hedera

Edit `contracts/hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 296  // Hedera testnet chain ID
    },
    mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 295  // Hedera mainnet chain ID
    }
  }
};
```

Create `contracts/.env`:
```bash
DEPLOYER_PRIVATE_KEY=your_private_key_here
DEPLOYER_ACCOUNT_ID=0.0.123456
```

---

## Phase 1: Deploy Core Contracts

### Deployment Order (CRITICAL - Do not change)

The order matters because contracts depend on each other:

```
1. PoolAddressesProvider (registry)
2. ACLManager (access control)
3. Oracle (price feeds)
4. Interest Rate Strategy
5. Pool (main contract)
6. PoolConfigurator (admin functions)
7. dTokens & Debt Tokens (created per asset)
```

### Step 1.1: Compile Contracts

```bash
cd contracts
npm run compile

# Verify compilation succeeded
ls artifacts/contracts/contracts/protocol/pool/Pool.sol/Pool.json
ls artifacts/contracts/contracts/hedera/DeraHCSEventStreamer.sol/DeraHCSEventStreamer.json
```

### Step 1.2: Create Deployment Script

Create `contracts/scripts/01-deploy-core.js`:

```javascript
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Dera Protocol Core Contracts to Hedera Testnet\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const deployedAddresses = {};

  // 1. Deploy PoolAddressesProvider
  console.log("\n📍 Deploying PoolAddressesProvider...");
  const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
  const addressesProvider = await PoolAddressesProvider.deploy("DERA_MARKET", deployer.address);
  await addressesProvider.waitForDeployment();
  const addressesProviderAddress = await addressesProvider.getAddress();
  console.log("✅ PoolAddressesProvider deployed:", addressesProviderAddress);
  deployedAddresses.POOL_ADDRESSES_PROVIDER = addressesProviderAddress;

  // 2. Deploy ACLManager
  console.log("\n📍 Deploying ACLManager...");
  const ACLManager = await ethers.getContractFactory("ACLManager");
  const aclManager = await ACLManager.deploy(addressesProviderAddress);
  await aclManager.waitForDeployment();
  const aclManagerAddress = await aclManager.getAddress();
  console.log("✅ ACLManager deployed:", aclManagerAddress);
  deployedAddresses.ACL_MANAGER = aclManagerAddress;

  // Set ACLManager in AddressesProvider
  await addressesProvider.setACLManager(aclManagerAddress);
  console.log("✅ ACLManager set in AddressesProvider");

  // 3. Deploy DeraOracle
  console.log("\n📍 Deploying DeraOracle...");
  const DeraOracle = await ethers.getContractFactory("DeraOracle");
  const oracle = await DeraOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ DeraOracle deployed:", oracleAddress);
  deployedAddresses.ORACLE = oracleAddress;

  // Set Oracle in AddressesProvider
  await addressesProvider.setPriceOracle(oracleAddress);
  console.log("✅ Oracle set in AddressesProvider");

  // 4. Deploy Default Interest Rate Strategy
  console.log("\n📍 Deploying DefaultReserveInterestRateStrategy...");
  const InterestRateStrategy = await ethers.getContractFactory("DefaultReserveInterestRateStrategy");

  // Interest rate model parameters (example values - adjust as needed)
  const optimalUsageRatio = ethers.parseUnits("0.8", 27); // 80% optimal utilization
  const baseVariableBorrowRate = ethers.parseUnits("0", 27); // 0% base rate
  const variableRateSlope1 = ethers.parseUnits("0.04", 27); // 4% slope 1
  const variableRateSlope2 = ethers.parseUnits("1.0", 27); // 100% slope 2

  const rateStrategy = await InterestRateStrategy.deploy(
    addressesProviderAddress,
    optimalUsageRatio,
    baseVariableBorrowRate,
    variableRateSlope1,
    variableRateSlope2
  );
  await rateStrategy.waitForDeployment();
  const rateStrategyAddress = await rateStrategy.getAddress();
  console.log("✅ Interest Rate Strategy deployed:", rateStrategyAddress);
  deployedAddresses.RATE_STRATEGY = rateStrategyAddress;

  // 5. Deploy Pool Implementation
  console.log("\n📍 Deploying Pool...");
  const Pool = await ethers.getContractFactory("Pool");
  const poolImpl = await Pool.deploy(addressesProviderAddress, rateStrategyAddress);
  await poolImpl.waitForDeployment();
  const poolImplAddress = await poolImpl.getAddress();
  console.log("✅ Pool Implementation deployed:", poolImplAddress);
  deployedAddresses.POOL_IMPL = poolImplAddress;

  // 6. Deploy PoolInstance (proxy initializer)
  console.log("\n📍 Deploying PoolInstance...");
  const PoolInstance = await ethers.getContractFactory("PoolInstance");
  const poolInstance = await PoolInstance.deploy(addressesProviderAddress, rateStrategyAddress);
  await poolInstance.waitForDeployment();
  const poolAddress = await poolInstance.getAddress();
  console.log("✅ PoolInstance deployed:", poolAddress);
  deployedAddresses.POOL = poolAddress;

  // Initialize Pool
  await poolInstance.initialize(addressesProviderAddress);
  console.log("✅ Pool initialized");

  // Set Pool in AddressesProvider
  await addressesProvider.setPool(poolAddress);
  console.log("✅ Pool set in AddressesProvider");

  // 7. Deploy PoolConfigurator
  console.log("\n📍 Deploying PoolConfigurator...");
  const PoolConfigurator = await ethers.getContractFactory("PoolConfigurator");
  const poolConfigurator = await PoolConfigurator.deploy();
  await poolConfigurator.waitForDeployment();
  const poolConfiguratorAddress = await poolConfigurator.getAddress();
  console.log("✅ PoolConfigurator deployed:", poolConfiguratorAddress);
  deployedAddresses.POOL_CONFIGURATOR = poolConfiguratorAddress;

  // Set PoolConfigurator in AddressesProvider
  await addressesProvider.setPoolConfigurator(poolConfiguratorAddress);
  console.log("✅ PoolConfigurator set in AddressesProvider");

  // Save addresses to file
  const addressesJson = JSON.stringify(deployedAddresses, null, 2);
  fs.writeFileSync('./deployed-addresses-core.json', addressesJson);
  console.log("\n💾 Addresses saved to deployed-addresses-core.json");

  console.log("\n" + "=".repeat(60));
  console.log("✅ PHASE 1 COMPLETE - Core Contracts Deployed");
  console.log("=".repeat(60));
  console.log("\n📋 Deployed Addresses:");
  console.log(addressesJson);
  console.log("\n🔜 Next: Phase 2 - Create HCS Topics");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Step 1.3: Deploy Core Contracts

```bash
cd contracts

# Deploy to testnet
npx hardhat run scripts/01-deploy-core.js --network testnet

# IMPORTANT: Save the output! You'll need these addresses.
# They will be saved in contracts/deployed-addresses-core.json
```

**Expected Output:**
```
✅ PHASE 1 COMPLETE - Core Contracts Deployed
📋 Deployed Addresses:
{
  "POOL_ADDRESSES_PROVIDER": "0xABC...123",
  "ACL_MANAGER": "0xDEF...456",
  "ORACLE": "0xGHI...789",
  "RATE_STRATEGY": "0xJKL...012",
  "POOL_IMPL": "0xMNO...345",
  "POOL": "0xPQR...678",
  "POOL_CONFIGURATOR": "0xSTU...901"
}
```

---

## Phase 2: Create HCS Topics

### Why HCS Topics?

HCS (Hedera Consensus Service) provides immutable, consensus-timestamped event logging that is:
- Queryable via Mirror Node API (no custom indexer needed)
- Tamper-proof and auditable
- **Unique to Hedera - cannot be replicated on Ethereum or other chains**

### Step 2.1: Install Hedera SDK

```bash
cd contracts
npm install --save-dev @hashgraph/sdk
```

### Step 2.2: Create HCS Topics Script

Create `contracts/scripts/02-create-hcs-topics.js`:

```javascript
const {
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId
} = require("@hashgraph/sdk");
require("dotenv").config();
const fs = require('fs');

async function main() {
  console.log("🚀 Creating HCS Topics for Dera Protocol\n");

  // Initialize Hedera client
  const accountId = AccountId.fromString(process.env.DEPLOYER_ACCOUNT_ID);
  const privateKey = PrivateKey.fromString(process.env.DEPLOYER_PRIVATE_KEY);

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  console.log("Using account:", accountId.toString());

  const topics = {};

  // Create topics for each event type
  const eventTypes = [
    { name: 'SUPPLY', description: 'Supply events' },
    { name: 'WITHDRAW', description: 'Withdraw events' },
    { name: 'BORROW', description: 'Borrow events' },
    { name: 'REPAY', description: 'Repay events' },
    { name: 'LIQUIDATION', description: 'Liquidation events' },
    { name: 'CONFIG', description: 'Configuration change events' },
    { name: 'GOVERNANCE', description: 'Governance events' }
  ];

  for (const eventType of eventTypes) {
    console.log(`\n📍 Creating HCS topic for ${eventType.name}...`);

    // Create topic
    const createTx = new TopicCreateTransaction()
      .setTopicMemo(`Dera Protocol - ${eventType.description}`)
      .setAdminKey(privateKey.publicKey)
      .setSubmitKey(privateKey.publicKey);

    const createResponse = await createTx.execute(client);
    const receipt = await createResponse.getReceipt(client);
    const topicId = receipt.topicId;

    console.log(`✅ ${eventType.name} Topic ID: ${topicId.toString()}`);
    topics[eventType.name] = topicId.toString();

    // Submit initial message to verify topic works
    const testMessage = JSON.stringify({
      type: 'TOPIC_INITIALIZED',
      eventType: eventType.name,
      timestamp: Date.now(),
      protocol: 'Dera Protocol'
    });

    const submitTx = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(testMessage);

    await submitTx.execute(client);
    console.log(`✅ Test message submitted to ${eventType.name} topic`);

    // Wait a bit to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save topic IDs
  const topicsJson = JSON.stringify(topics, null, 2);
  fs.writeFileSync('./hcs-topics.json', topicsJson);
  console.log("\n💾 Topic IDs saved to hcs-topics.json");

  console.log("\n" + "=".repeat(60));
  console.log("✅ PHASE 2 COMPLETE - HCS Topics Created");
  console.log("=".repeat(60));
  console.log("\n📋 Topic IDs:");
  console.log(topicsJson);
  console.log("\n🔜 Next: Phase 3 - Deploy Hedera-Specific Contracts");

  client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Step 2.3: Create HCS Topics

```bash
cd contracts
node scripts/02-create-hcs-topics.js

# Save the output! You'll need these topic IDs.
# They will be saved in contracts/hcs-topics.json
```

**Expected Output:**
```
✅ PHASE 2 COMPLETE - HCS Topics Created
📋 Topic IDs:
{
  "SUPPLY": "0.0.200001",
  "WITHDRAW": "0.0.200002",
  "BORROW": "0.0.200003",
  "REPAY": "0.0.200004",
  "LIQUIDATION": "0.0.200005",
  "CONFIG": "0.0.200006",
  "GOVERNANCE": "0.0.200007"
}
```

### Step 2.4: Verify Topics on HashScan

Visit: `https://hashscan.io/testnet/topic/0.0.200001` (replace with your topic ID)

You should see:
- Topic info
- Your test message
- Topic memo: "Dera Protocol - Supply events"

---

## Phase 3: Deploy Hedera-Specific Contracts

These contracts are **unique to Hedera** and use HTS, HCS, and Mirror Node features.

### Step 3.1: Load Previous Deployment Data

Create `contracts/scripts/03-deploy-hedera-contracts.js`:

```javascript
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying Dera Protocol Hedera-Specific Contracts\n");

  // Load previous deployment data
  const coreAddresses = JSON.parse(fs.readFileSync('./deployed-addresses-core.json', 'utf8'));
  const hcsTopics = JSON.parse(fs.readFileSync('./hcs-topics.json', 'utf8'));

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const deployedAddresses = { ...coreAddresses };

  // 1. Deploy DeraHCSEventStreamer
  console.log("\n📍 Deploying DeraHCSEventStreamer...");
  const DeraHCSEventStreamer = await ethers.getContractFactory("DeraHCSEventStreamer");
  const hcsStreamer = await DeraHCSEventStreamer.deploy(
    coreAddresses.POOL,
    deployer.address
  );
  await hcsStreamer.waitForDeployment();
  const hcsStreamerAddress = await hcsStreamer.getAddress();
  console.log("✅ DeraHCSEventStreamer deployed:", hcsStreamerAddress);
  deployedAddresses.HCS_STREAMER = hcsStreamerAddress;

  // Initialize HCS topics
  console.log("📍 Initializing HCS topics...");
  await hcsStreamer.initializeTopics(
    hcsTopics.SUPPLY.split('.').pop(),      // Extract topic ID number
    hcsTopics.WITHDRAW.split('.').pop(),
    hcsTopics.BORROW.split('.').pop(),
    hcsTopics.REPAY.split('.').pop(),
    hcsTopics.LIQUIDATION.split('.').pop(),
    hcsTopics.CONFIG.split('.').pop()
  );
  console.log("✅ HCS topics initialized");

  // 2. Deploy DeraMirrorNodeAnalytics
  console.log("\n📍 Deploying DeraMirrorNodeAnalytics...");
  const DeraMirrorNodeAnalytics = await ethers.getContractFactory("DeraMirrorNodeAnalytics");
  const analytics = await DeraMirrorNodeAnalytics.deploy(
    coreAddresses.POOL,
    deployer.address
  );
  await analytics.waitForDeployment();
  const analyticsAddress = await analytics.getAddress();
  console.log("✅ DeraMirrorNodeAnalytics deployed:", analyticsAddress);
  deployedAddresses.ANALYTICS = analyticsAddress;

  // 3. Deploy DeraNodeStaking
  console.log("\n📍 Deploying DeraNodeStaking...");
  const DeraNodeStaking = await ethers.getContractFactory("DeraNodeStaking");
  const nodeStaking = await DeraNodeStaking.deploy(
    coreAddresses.POOL,
    deployer.address
  );
  await nodeStaking.waitForDeployment();
  const nodeStakingAddress = await nodeStaking.getAddress();
  console.log("✅ DeraNodeStaking deployed:", nodeStakingAddress);
  deployedAddresses.NODE_STAKING = nodeStakingAddress;

  // 4. Deploy DeraProtocolIntegration
  console.log("\n📍 Deploying DeraProtocolIntegration...");
  const DeraProtocolIntegration = await ethers.getContractFactory("DeraProtocolIntegration");
  const protocolIntegration = await DeraProtocolIntegration.deploy(
    coreAddresses.POOL,
    deployer.address
  );
  await protocolIntegration.waitForDeployment();
  const protocolIntegrationAddress = await protocolIntegration.getAddress();
  console.log("✅ DeraProtocolIntegration deployed:", protocolIntegrationAddress);
  deployedAddresses.PROTOCOL_INTEGRATION = protocolIntegrationAddress;

  // 5. Deploy DeraInterestRateModel
  console.log("\n📍 Deploying DeraInterestRateModel...");
  const DeraInterestRateModel = await ethers.getContractFactory("DeraInterestRateModel");
  const rateModel = await DeraInterestRateModel.deploy(deployer.address);
  await rateModel.waitForDeployment();
  const rateModelAddress = await rateModel.getAddress();
  console.log("✅ DeraInterestRateModel deployed:", rateModelAddress);
  deployedAddresses.RATE_MODEL = rateModelAddress;

  // Save all addresses
  const addressesJson = JSON.stringify(deployedAddresses, null, 2);
  fs.writeFileSync('./deployed-addresses-all.json', addressesJson);
  console.log("\n💾 All addresses saved to deployed-addresses-all.json");

  console.log("\n" + "=".repeat(60));
  console.log("✅ PHASE 3 COMPLETE - Hedera Contracts Deployed");
  console.log("=".repeat(60));
  console.log("\n📋 New Deployments:");
  console.log(JSON.stringify({
    HCS_STREAMER: hcsStreamerAddress,
    ANALYTICS: analyticsAddress,
    NODE_STAKING: nodeStakingAddress,
    PROTOCOL_INTEGRATION: protocolIntegrationAddress,
    RATE_MODEL: rateModelAddress
  }, null, 2));
  console.log("\n🔜 Next: Phase 4 - Configure Contract Integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Step 3.2: Deploy Hedera Contracts

```bash
cd contracts
npx hardhat run scripts/03-deploy-hedera-contracts.js --network testnet
```

---

## Phase 4: Configure Contract Integration

Now we need to connect all the contracts together.

### Step 4.1: Create Integration Script

Create `contracts/scripts/04-configure-integration.js`:

```javascript
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Configuring Dera Protocol Contract Integration\n");

  const addresses = JSON.parse(fs.readFileSync('./deployed-addresses-all.json', 'utf8'));

  const [deployer] = await ethers.getSigners();
  console.log("Configuring with account:", deployer.address);

  // Get contract instances
  const pool = await ethers.getContractAt("Pool", addresses.POOL);
  const protocolIntegration = await ethers.getContractAt("DeraProtocolIntegration", addresses.PROTOCOL_INTEGRATION);

  // 1. Set HCS Event Streamer in Pool
  console.log("\n📍 Setting HCS Event Streamer in Pool...");
  await pool.setHCSEventStreamer(addresses.HCS_STREAMER);
  console.log("✅ HCS Event Streamer set");

  // 2. Set Protocol Integration in Pool
  console.log("\n📍 Setting Protocol Integration in Pool...");
  await pool.setProtocolIntegration(addresses.PROTOCOL_INTEGRATION);
  console.log("✅ Protocol Integration set");

  // 3. Set Analytics Contract in Pool
  console.log("\n📍 Setting Analytics Contract in Pool...");
  await pool.setAnalyticsContract(addresses.ANALYTICS);
  console.log("✅ Analytics Contract set");

  // 4. Set Node Staking Contract in Pool
  console.log("\n📍 Setting Node Staking Contract in Pool...");
  await pool.setNodeStakingContract(addresses.NODE_STAKING);
  console.log("✅ Node Staking Contract set");

  // 5. Configure Protocol Integration
  console.log("\n📍 Configuring Protocol Integration...");
  await protocolIntegration.setHCSEventStreamer(addresses.HCS_STREAMER);
  console.log("✅ HCS Streamer set in Protocol Integration");

  await protocolIntegration.setAnalyticsContract(addresses.ANALYTICS);
  console.log("✅ Analytics set in Protocol Integration");

  await protocolIntegration.setNodeStakingContract(addresses.NODE_STAKING);
  console.log("✅ Node Staking set in Protocol Integration");

  console.log("\n" + "=".repeat(60));
  console.log("✅ PHASE 4 COMPLETE - Integration Configured");
  console.log("=".repeat(60));
  console.log("\n🔜 Next: Phase 5 - Deploy Backend Services");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Step 4.2: Run Configuration

```bash
cd contracts
npx hardhat run scripts/04-configure-integration.js --network testnet
```

---

## Phase 5: Deploy Backend Services

### Step 5.1: Copy ABIs to Backend

```bash
cd contracts

# Run the copy script
chmod +x scripts/copy-abis.sh
./scripts/copy-abis.sh

# Verify ABIs copied
ls -la ../backend/shared/abis/
ls -la ../backend/liquidation-bot/abis/
```

### Step 5.2: Configure Backend Services

Load deployment data and create .env files for each service:

```bash
# Read deployed addresses
POOL_ADDRESS=$(cat contracts/deployed-addresses-all.json | grep POOL | head -1 | cut -d'"' -f4)
ORACLE_ADDRESS=$(cat contracts/deployed-addresses-all.json | grep ORACLE | head -1 | cut -d'"' -f4)
HCS_STREAMER_ADDRESS=$(cat contracts/deployed-addresses-all.json | grep HCS_STREAMER | cut -d'"' -f4)
# ... etc

# Create backend/.env files
# (See detailed .env templates in next section)
```

### Step 5.3: Backend Service .env Templates

#### A. HCS Event Service

Create `backend/hcs-event-service/.env`:
```bash
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_PRIVATE_KEY=your_private_key_here

# HCS Topic IDs (from Phase 2)
HCS_SUPPLY_TOPIC=0.0.200001
HCS_WITHDRAW_TOPIC=0.0.200002
HCS_BORROW_TOPIC=0.0.200003
HCS_REPAY_TOPIC=0.0.200004
HCS_LIQUIDATION_TOPIC=0.0.200005

# Contract Addresses (from Phase 1 & 3)
POOL_ADDRESS=0xYOUR_POOL_ADDRESS
HCS_STREAMER_ADDRESS=0xYOUR_HCS_STREAMER_ADDRESS

# JSON-RPC Relay
RPC_URL=https://testnet.hashio.io/api

# Service Config
POLL_INTERVAL_MS=5000
MAX_BATCH_SIZE=50
```

#### B. Liquidation Bot

Create `backend/liquidation-bot/.env`:
```bash
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_LIQUIDATION_BOT_ACCOUNT
HEDERA_PRIVATE_KEY=your_liquidation_bot_private_key

# Contract Addresses
POOL_ADDRESS=0xYOUR_POOL_ADDRESS
ORACLE_ADDRESS=0xYOUR_ORACLE_ADDRESS

# JSON-RPC Relay
RPC_URL=https://testnet.hashio.io/api

# Bot Config
CHECK_INTERVAL_MS=30000
MIN_HEALTH_FACTOR=1.0
LIQUIDATION_THRESHOLD=0.95
MIN_PROFIT_USD=10
GAS_LIMIT=500000
```

#### C. Node Staking Service

Create `backend/node-staking-service/.env`:
```bash
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.YOUR_STAKING_ACCOUNT
HEDERA_PRIVATE_KEY=your_staking_private_key

# Contract Addresses
POOL_ADDRESS=0xYOUR_POOL_ADDRESS
NODE_STAKING_ADDRESS=0xYOUR_NODE_STAKING_ADDRESS

# Staking Config
NODE_ID=3  # Hedera node to stake with
MIN_STAKE_AMOUNT=10
AUTO_COMPOUND=true
COMPOUND_INTERVAL_HOURS=24
```

#### D. Monitoring Service

Create `backend/monitoring-service/.env`:
```bash
# Hedera Network
HEDERA_NETWORK=testnet

# Contract Addresses
POOL_ADDRESS=0xYOUR_POOL_ADDRESS

# JSON-RPC Relay
RPC_URL=https://testnet.hashio.io/api

# Monitoring Config
CHECK_INTERVAL_MS=60000
ALERT_WEBHOOK_URL=https://your-webhook-url.com
ENABLE_ALERTS=true
```

### Step 5.4: Start Backend Services

```bash
# Install PM2 globally if not already installed
npm install -g pm2

# Start all services
cd backend

# HCS Event Service
cd hcs-event-service
pm2 start ecosystem.config.js
cd ..

# Liquidation Bot
cd liquidation-bot
pm2 start ecosystem.config.js
cd ..

# Node Staking Service
cd node-staking-service
pm2 start ecosystem.config.js
cd ..

# Monitoring Service
cd monitoring-service
pm2 start ecosystem.config.js
cd ..

# View all services
pm2 list

# View logs
pm2 logs dera-hcs-event-service
pm2 logs dera-liquidation-bot
pm2 logs dera-node-staking-service
pm2 logs dera-monitoring-service
```

### Step 5.5: Verify Backend Services

```bash
# Check service status
pm2 status

# Should show all services with status "online"

# Check logs for errors
pm2 logs --lines 50
```

---

## Phase 6: Configure Frontend

### Step 6.1: Create Frontend .env.local

Create `frontend/.env.local`:

```bash
# Contract Addresses (from deployment)
NEXT_PUBLIC_POOL_ADDRESS=0xYOUR_POOL_ADDRESS
NEXT_PUBLIC_ORACLE_ADDRESS=0xYOUR_ORACLE_ADDRESS
NEXT_PUBLIC_HCS_STREAMER_ADDRESS=0xYOUR_HCS_STREAMER_ADDRESS
NEXT_PUBLIC_NODE_STAKING_ADDRESS=0xYOUR_NODE_STAKING_ADDRESS
NEXT_PUBLIC_ANALYTICS_ADDRESS=0xYOUR_ANALYTICS_ADDRESS
NEXT_PUBLIC_PROTOCOL_INTEGRATION_ADDRESS=0xYOUR_PROTOCOL_INTEGRATION_ADDRESS

# Token Addresses
NEXT_PUBLIC_USDC_ADDRESS=0.0.YOUR_USDC_TOKEN_ID  # HTS token ID
NEXT_PUBLIC_HBAR_ADDRESS=0.0.0  # Native HBAR

# HCS Topic IDs
NEXT_PUBLIC_HCS_SUPPLY_TOPIC=0.0.200001
NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=0.0.200002
NEXT_PUBLIC_HCS_BORROW_TOPIC=0.0.200003
NEXT_PUBLIC_HCS_REPAY_TOPIC=0.0.200004
NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=0.0.200005

# Hedera Network Config
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
NEXT_PUBLIC_RPC_URL=https://testnet.hashio.io/api

# WalletConnect (HashPack)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### Step 6.2: Build and Start Frontend

```bash
cd frontend

# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# Start production server
npm run start

# OR for development:
npm run dev
```

### Step 6.3: Verify Frontend

1. Open browser: `http://localhost:3000`
2. Navigate to Dera Protocol Dashboard
3. Check browser console for any errors
4. Verify contract addresses are loaded (check console logs)

---

## Phase 7: Testing & Verification

### Step 7.1: Contract Verification

```bash
# Test Pool contract
cd contracts
npx hardhat console --network testnet

# In console:
const pool = await ethers.getContractAt("Pool", "YOUR_POOL_ADDRESS");
const paused = await pool.paused();
console.log("Pool paused:", paused);  // Should be false

const hcsStreamer = await pool.hcsEventStreamer();
console.log("HCS Streamer:", hcsStreamer);  // Should match your deployed address
```

### Step 7.2: HCS Topic Verification

Visit HashScan:
- Supply topic: `https://hashscan.io/testnet/topic/0.0.YOUR_SUPPLY_TOPIC`
- Should show your test message from Phase 2

### Step 7.3: End-to-End Test

1. **Connect Wallet**
   - Open frontend
   - Click "Connect Wallet"
   - Select HashPack
   - Approve connection

2. **Test Supply**
   - Navigate to "Supply" tab
   - Select USDC
   - Enter amount (e.g., 10 USDC)
   - Click "Supply"
   - Sign transaction in HashPack
   - Wait for confirmation
   - Verify transaction on HashScan

3. **Verify HCS Event**
   - Go to Supply topic on HashScan
   - Should see new message with your supply event
   - Message should contain: user address, asset, amount, timestamp

4. **Check Analytics**
   - Navigate to "Analytics" tab
   - Should show updated TVL
   - Should show your supply

5. **Test Borrow**
   - Navigate to "Borrow" tab
   - Select asset to borrow
   - Enter amount
   - Sign transaction
   - Verify on HashScan and HCS topic

---

## Post-Deployment Checklist

### ✅ Contracts

- [ ] All contracts deployed successfully
- [ ] All contracts verified on HashScan (optional but recommended)
- [ ] Integration configured (Pool → ProtocolIntegration → HCS/Analytics/Staking)
- [ ] Test transactions work (supply, withdraw, borrow, repay)

### ✅ HCS Topics

- [ ] All 5+ topics created
- [ ] Test messages visible on HashScan
- [ ] Frontend can query topics via Mirror Node API

### ✅ Backend Services

- [ ] All services running (pm2 status shows "online")
- [ ] No errors in logs (pm2 logs)
- [ ] HCS Event Service submitting events
- [ ] Liquidation Bot monitoring positions

### ✅ Frontend

- [ ] Build succeeds without errors
- [ ] All environment variables set
- [ ] Wallet connection works (HashPack)
- [ ] Contract addresses correct
- [ ] HCS events display correctly
- [ ] Analytics tab loads (or disabled if not implemented)

### ✅ Assets

- [ ] USDC token associated with Pool contract
- [ ] HBAR native support configured
- [ ] Oracle prices set for all assets
- [ ] Interest rate parameters configured

---

## Troubleshooting

### Common Issues

#### 1. "HTS Error: TOKEN_NOT_ASSOCIATED"

**Problem:** User or contract not associated with HTS token

**Solution:**
```bash
# Associate user with USDC token
hedera-cli token associate --account YOUR_ACCOUNT --token 0.0.USDC_TOKEN_ID

# OR in frontend, handle association automatically
```

#### 2. "Transaction Reverted: Insufficient Balance"

**Problem:** Account doesn't have enough HBAR for gas or enough tokens

**Solution:**
- Check HBAR balance: [https://hashscan.io/testnet/account/YOUR_ACCOUNT](https://hashscan.io/testnet/account/YOUR_ACCOUNT)
- Get testnet HBAR: [https://portal.hedera.com/](https://portal.hedera.com/)

#### 3. "Cannot connect to RPC"

**Problem:** JSON-RPC Relay URL incorrect or network down

**Solution:**
- Verify RPC URL: `https://testnet.hashio.io/api`
- Check Hedera status: [https://status.hedera.com/](https://status.hedera.com/)
- Try alternative relay: [https://testnet.hashio.io/api](https://testnet.hashio.io/api)

#### 4. "HCS Topic not found"

**Problem:** Topic ID incorrect or not created

**Solution:**
- Verify topic on HashScan: `https://hashscan.io/testnet/topic/YOUR_TOPIC_ID`
- Check `hcs-topics.json` for correct IDs
- Re-create topic if needed (Phase 2)

#### 5. "Frontend shows wrong contract addresses"

**Problem:** .env.local not loaded or incorrect

**Solution:**
```bash
# Check .env.local exists
ls frontend/.env.local

# Verify addresses match deployment
cat frontend/.env.local | grep POOL_ADDRESS
cat contracts/deployed-addresses-all.json | grep POOL

# Restart frontend
cd frontend
npm run dev
```

#### 6. "Analytics not working"

**Problem:** Analytics methods not implemented (known issue from integration analysis)

**Solution:**
- Disable analytics tab temporarily (see DEPLOYMENT_INTEGRATION_ANALYSIS.md)
- OR implement analytics methods (see issue #2 in integration analysis)

---

## Next Steps After Deployment

### 1. Configure Assets

Add USDC and HBAR to the pool:

```javascript
// In hardhat console
const poolConfigurator = await ethers.getContractAt("PoolConfigurator", "YOUR_CONFIGURATOR_ADDRESS");

// Add USDC
await poolConfigurator.initAsset({
  asset: "0.0.YOUR_USDC_TOKEN",
  dTokenImpl: "YOUR_D_TOKEN_IMPL",
  variableDebtTokenImpl: "YOUR_DEBT_TOKEN_IMPL",
  interestRateStrategy: "YOUR_RATE_STRATEGY",
  treasury: "YOUR_TREASURY",
  assetName: "USDC",
  assetSymbol: "USDC",
  params: {
    baseLTV: 8000,  // 80%
    liquidationThreshold: 8500,  // 85%
    liquidationBonus: 10500,  // 105%
    decimals: 6,
    active: true,
    frozen: false,
    borrowable: true
  }
});
```

### 2. Set Oracle Prices

```javascript
const oracle = await ethers.getContractAt("DeraOracle", "YOUR_ORACLE_ADDRESS");

// Set USDC price (1 USD = 1e8 base units)
await oracle.setAssetPrice("0.0.USDC_TOKEN", ethers.parseUnits("1", 8));

// Set HBAR price (e.g., 0.08 USD)
await oracle.setAssetPrice("0.0.0", ethers.parseUnits("0.08", 8));
```

### 3. Fund Liquidation Bot

```bash
# Send HBAR to liquidation bot account
hedera-cli account transfer --from YOUR_ACCOUNT --to LIQUIDATION_BOT_ACCOUNT --amount 100
```

### 4. Monitor

```bash
# Watch backend services
pm2 monit

# Watch frontend logs
tail -f frontend/.next/trace

# Watch Hedera transactions
# Visit: https://hashscan.io/testnet/account/YOUR_POOL_CONTRACT
```

---

## Production Deployment (Mainnet)

When ready for mainnet:

1. **Change network to mainnet in all configs:**
   ```bash
   HEDERA_NETWORK=mainnet
   NEXT_PUBLIC_HEDERA_NETWORK=mainnet
   NEXT_PUBLIC_MIRROR_NODE_URL=https://mainnet-public.mirrornode.hedera.com
   NEXT_PUBLIC_RPC_URL=https://mainnet.hashio.io/api
   ```

2. **Fund mainnet account** with real HBAR

3. **Re-run all deployment phases** with `--network mainnet`

4. **Security audit** recommended before mainnet

5. **Test with small amounts** first

---

## Support & Resources

### Hedera Documentation
- Hedera Docs: [https://docs.hedera.com/](https://docs.hedera.com/)
- HTS Guide: [https://docs.hedera.com/guides/tokens/](https://docs.hedera.com/guides/tokens/)
- HCS Guide: [https://docs.hedera.com/guides/consensus/](https://docs.hedera.com/guides/consensus/)
- Mirror Node API: [https://docs.hedera.com/mirror-node-api/](https://docs.hedera.com/mirror-node-api/)

### Tools
- HashScan Explorer: [https://hashscan.io/](https://hashscan.io/)
- Hedera Portal: [https://portal.hedera.com/](https://portal.hedera.com/)
- JSON-RPC Relay: [https://github.com/hashgraph/hedera-json-rpc-relay](https://github.com/hashgraph/hedera-json-rpc-relay)

### Dera Protocol
- Integration Analysis: See `DEPLOYMENT_INTEGRATION_ANALYSIS.md`
- Known Issues: See integration analysis for list of issues to address

---

**🎉 Congratulations! You've deployed Dera Protocol on Hedera!**

For questions or issues, refer to:
- `DEPLOYMENT_INTEGRATION_ANALYSIS.md` - Comprehensive integration analysis
- `FIXES_COMPLETED.md` - Status of fixes applied
- `MISSING_INTEGRATIONS_ANALYSIS.md` - Additional integration details
