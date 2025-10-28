# Dera Protocol - Deployment Guide

## 🚀 Complete Deployment Guide for Hedera Mainnet/Testnet

This guide covers the full deployment of Dera Protocol including all Phase 2 Hedera-exclusive features.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Steps](#deployment-steps)
4. [HCS Topic Creation](#hcs-topic-creation)
5. [Configuration](#configuration)
6. [Integration](#integration)
7. [Testing](#testing)
8. [Maintenance](#maintenance)

---

## Prerequisites

### Required Tools

```bash
# Hedera SDK
npm install @hashgraph/sdk

# Solidity compiler
npm install solc

# Deployment framework (choose one)
npm install hardhat
# OR
npm install @hashgraph/hardhat-hethers

# Environment variables
npm install dotenv
```

### Required Accounts

1. **Protocol Admin Account** - Manages protocol configuration
2. **Emergency Admin Account** - Emergency pause/unpause
3. **HCS Admin Account** - Manages HCS topics
4. **Staking Admin Account** - Manages node staking
5. **Treasury Account** - Receives protocol fees

### Required Hedera Resources

- **HBAR Balance**: ~100 HBAR for deployment and gas
- **Hedera Account**: Mainnet or Testnet account
- **HCS Topics**: 8 topics to be created (see HCS section)
- **Node Access**: For staking integration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Dera Protocol                             │
├─────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐       ┌──────────────────────┐            │
│  │  Pool.sol    │───────│  PoolConfigurator    │            │
│  └──────┬───────┘       └──────────────────────┘            │
│         │                                                     │
│         │ ┌──────────────────────────────────────────────┐  │
│         └─│  DeraProtocolIntegration                      │  │
│           └───┬──────────────────────┬───────────┬────────┘  │
│               │                      │           │            │
│      ┌────────▼────────┐   ┌────────▼──────┐   │            │
│      │ HCS Event       │   │ Node Staking  │   │            │
│      │ Streamer        │   │ Contract      │   │            │
│      └─────────────────┘   └───────────────┘   │            │
│                                                  │            │
│      ┌────────────────────┐   ┌────────────────▼──────────┐ │
│      │ Dera Interest      │   │ Mirror Node Analytics     │ │
│      │ Rate Model         │   │                            │ │
│      └────────────────────┘   └────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Steps

### Step 1: Deploy Core Contracts

```javascript
// deploy-core.js
const { Client, ContractCreateFlow } = require("@hashgraph/sdk");

async function deployCoreContracts() {
  const client = Client.forTestnet(); // or forMainnet()
  client.setOperator(accountId, privateKey);

  // 1. Deploy AddressesProvider
  const addressesProvider = await deployContract(
    client,
    "PoolAddressesProvider",
    []
  );

  // 2. Deploy Pool Implementation
  const poolImpl = await deployContract(
    client,
    "Pool",
    [addressesProvider.contractId, interestRateStrategy]
  );

  // 3. Deploy PoolConfigurator
  const configurator = await deployContract(
    client,
    "PoolConfigurator",
    []
  );

  // 4. Deploy Oracle
  const oracle = await deployContract(
    client,
    "DeraOracle",
    [pythContractAddress]
  );

  console.log("Core contracts deployed:");
  console.log("AddressesProvider:", addressesProvider.contractId.toString());
  console.log("Pool:", poolImpl.contractId.toString());
  console.log("PoolConfigurator:", configurator.contractId.toString());
  console.log("Oracle:", oracle.contractId.toString());

  return {
    addressesProvider,
    pool: poolImpl,
    configurator,
    oracle
  };
}
```

### Step 2: Create HCS Topics

```javascript
// create-hcs-topics.js
const { TopicCreateTransaction } = require("@hashgraph/sdk");

async function createHCSTopics(client, adminKey) {
  const topics = {};

  // Create topics for each event type
  const topicTypes = [
    "supply",
    "withdraw",
    "borrow",
    "repay",
    "liquidation",
    "config",
    "governance",
    "analytics"
  ];

  for (const type of topicTypes) {
    const transaction = await new TopicCreateTransaction()
      .setAdminKey(adminKey)
      .setSubmitKey(adminKey)
      .setTopicMemo(`Dera Protocol - ${type.toUpperCase()} Events`)
      .execute(client);

    const receipt = await transaction.getReceipt(client);
    topics[type] = receipt.topicId;

    console.log(`${type} topic created:`, topics[type].toString());
  }

  return topics;
}
```

### Step 3: Deploy Phase 2 Contracts

```javascript
// deploy-phase2.js
async function deployPhase2Contracts(client, poolAddress, adminAddress) {
  // 1. Deploy HCS Event Streamer
  const hcsStreamer = await deployContract(
    client,
    "DeraHCSEventStreamer",
    [poolAddress, adminAddress]
  );

  // 2. Deploy Node Staking Contract
  const nodeStaking = await deployContract(
    client,
    "DeraNodeStaking",
    [poolAddress, addressesProviderAddress, adminAddress]
  );

  // 3. Deploy Mirror Node Analytics
  const analytics = await deployContract(
    client,
    "DeraMirrorNodeAnalytics",
    [poolAddress, adminAddress]
  );

  // 4. Deploy Dera Interest Rate Model
  const rateModel = await deployContract(
    client,
    "DeraInterestRateModel",
    [
      optimalUtilization,   // e.g., 0.8e27 (80%)
      baseRate,              // e.g., 0.02e27 (2%)
      slope1,                // e.g., 0.04e27 (4%)
      slope2,                // e.g., 0.75e27 (75%)
      assetFactor,           // e.g., 0.1e4 (10%)
      adminAddress
    ]
  );

  // 5. Deploy Protocol Integration
  const integration = await deployContract(
    client,
    "DeraProtocolIntegration",
    [poolAddress, adminAddress]
  );

  console.log("Phase 2 contracts deployed:");
  console.log("HCS Streamer:", hcsStreamer.contractId.toString());
  console.log("Node Staking:", nodeStaking.contractId.toString());
  console.log("Analytics:", analytics.contractId.toString());
  console.log("Rate Model:", rateModel.contractId.toString());
  console.log("Integration:", integration.contractId.toString());

  return {
    hcsStreamer,
    nodeStaking,
    analytics,
    rateModel,
    integration
  };
}
```

### Step 4: Deploy Configuration Contract

```javascript
// deploy-config.js
async function deployConfigContract(client, adminAddress) {
  const config = await deployContract(
    client,
    "DeraDeploymentConfig",
    [adminAddress]
  );

  console.log("Deployment Config:", config.contractId.toString());
  return config;
}
```

---

## HCS Topic Creation

### Topic Structure

| Topic Type | Purpose | Memo |
|------------|---------|------|
| Supply | All supply operations | Dera Protocol - SUPPLY Events |
| Withdraw | All withdraw operations | Dera Protocol - WITHDRAW Events |
| Borrow | All borrow operations | Dera Protocol - BORROW Events |
| Repay | All repay operations | Dera Protocol - REPAY Events |
| Liquidation | All liquidation events | Dera Protocol - LIQUIDATION Events |
| Config | Configuration changes | Dera Protocol - CONFIG Events |
| Governance | Governance votes | Dera Protocol - GOVERNANCE Events |
| Analytics | Protocol metrics | Dera Protocol - ANALYTICS Events |

### Topic Permissions

```javascript
const topicKeys = {
  adminKey: adminKeyPair.publicKey,  // Can update topic
  submitKey: submitKeyPair.publicKey // Can submit messages
};
```

---

## Configuration

### Step 1: Configure Core Contracts

```javascript
// configure-core.js
async function configureCoreContracts(deploymentConfig, coreContracts) {
  // Set core contract addresses in deployment config
  await executeContractFunction(
    deploymentConfig,
    "setCoreContracts",
    [
      coreContracts.pool.contractId,
      coreContracts.configurator.contractId,
      coreContracts.addressesProvider.contractId,
      coreContracts.oracle.contractId
    ]
  );
}
```

### Step 2: Configure Phase 2 Contracts

```javascript
// configure-phase2.js
async function configurePhase2Contracts(deploymentConfig, phase2Contracts) {
  // Set Phase 2 contract addresses
  await executeContractFunction(
    deploymentConfig,
    "setPhase2Contracts",
    [
      phase2Contracts.hcsStreamer.contractId,
      phase2Contracts.nodeStaking.contractId,
      phase2Contracts.analytics.contractId,
      phase2Contracts.rateModel.contractId,
      phase2Contracts.integration.contractId
    ]
  );
}
```

### Step 3: Configure HCS Topics

```javascript
// configure-hcs.js
async function configureHCSTopics(deploymentConfig, topics) {
  await executeContractFunction(
    deploymentConfig,
    "configureHCSTopics",
    [
      topics.supply.shard,
      topics.supply.realm,
      topics.supply.num,
      topics.withdraw.num,
      topics.borrow.num,
      topics.repay.num,
      topics.liquidation.num,
      topics.config.num,
      topics.governance.num,
      topics.analytics.num
    ]
  );
}
```

### Step 4: Configure Node Staking

```javascript
// configure-staking.js
async function configureNodeStaking(deploymentConfig) {
  const initialNodes = [3, 4, 5]; // Node IDs to stake with
  const initialAmounts = [
    10000 * 100000000, // 10,000 HBAR in tinybars
    10000 * 100000000,
    10000 * 100000000
  ];

  await executeContractFunction(
    deploymentConfig,
    "configureNodeStaking",
    [
      initialNodes,
      initialAmounts,
      1000 * 100000000, // Min stake: 1,000 HBAR
      86400              // Distribution frequency: daily
    ]
  );
}
```

---

## Integration

### Initialize Protocol

```javascript
// initialize-protocol.js
async function initializeProtocol(deploymentConfig) {
  // This wires all contracts together
  await executeContractFunction(
    deploymentConfig,
    "initializeProtocol",
    []
  );

  console.log("✅ Protocol fully initialized!");
}
```

### Verify Deployment

```javascript
// verify-deployment.js
async function verifyDeployment(deploymentConfig) {
  // Check deployment status
  const status = await queryContract(
    deploymentConfig,
    "getDeploymentStatus"
  );

  console.log("Deployment Status:");
  console.log("Core Deployed:", status.coreDeployed);
  console.log("Phase 2 Deployed:", status.phase2Deployed);
  console.log("Integration Configured:", status.integrationConfigured);
  console.log("Fully Initialized:", status.fullyInitialized);

  if (status.fullyInitialized) {
    console.log("✅ Deployment verification passed!");
  } else {
    console.error("❌ Deployment incomplete");
  }
}
```

---

## Testing

### Test HCS Integration

```javascript
// test-hcs.js
const { TopicMessageQuery } = require("@hashgraph/sdk");

async function testHCSIntegration(client, topicId) {
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(client, (message) => {
      console.log("HCS Message received:");
      console.log("Timestamp:", message.consensusTimestamp.toString());
      console.log("Sequence:", message.sequenceNumber);
      console.log("Content:", Buffer.from(message.contents).toString());
    });

  console.log("Listening for HCS messages on topic:", topicId.toString());
}
```

### Test Node Staking

```javascript
// test-staking.js
async function testNodeStaking(nodeStakingContract) {
  const stakingInfo = await queryContract(
    nodeStakingContract,
    "getStakingInfo"
  );

  console.log("Staking Info:");
  console.log("Available for staking:", stakingInfo.availableForStaking);
  console.log("Currently staked:", stakingInfo.currentlyStaked);
  console.log("Total rewards:", stakingInfo.totalRewards);
  console.log("Number of nodes:", stakingInfo.numNodes);
}
```

---

## Maintenance

### Monitor Protocol Health

```javascript
// monitor.js
async function monitorProtocol(analyticsContract) {
  setInterval(async () => {
    const metrics = await queryContract(
      analyticsContract,
      "getProtocolMetrics"
    );

    console.log("Protocol Metrics:");
    console.log("TVL:", metrics.tvl);
    console.log("Total Supplied:", metrics.totalSupplied);
    console.log("Total Borrowed:", metrics.totalBorrowed);
    console.log("Total Users:", metrics.totalUsers);
    console.log("Last Update:", new Date(metrics.lastUpdate * 1000));
  }, 60000); // Every minute
}
```

### Claim Staking Rewards

```javascript
// claim-rewards.js
async function claimStakingRewards(nodeStakingContract, nodeId) {
  // Record rewards earned from Hedera node
  const rewardAmount = await checkNodeRewards(nodeId);

  await executeContractFunction(
    nodeStakingContract,
    "recordStakingRewards",
    [nodeId, rewardAmount]
  );

  console.log(`Recorded ${rewardAmount} tinybar rewards from node ${nodeId}`);
}
```

---

## Environment Variables

Create a `.env` file:

```env
# Hedera Network
HEDERA_NETWORK=testnet  # or mainnet
HEDERA_ACCOUNT_ID=0.0.12345
HEDERA_PRIVATE_KEY=302e...

# Admin Accounts
PROTOCOL_ADMIN_ID=0.0.12346
EMERGENCY_ADMIN_ID=0.0.12347
HCS_ADMIN_ID=0.0.12348
STAKING_ADMIN_ID=0.0.12349

# Contract Addresses (filled after deployment)
POOL_ADDRESS=0.0.100000
ADDRESSES_PROVIDER=0.0.100001
POOL_CONFIGURATOR=0.0.100002
ORACLE=0.0.100003

# Phase 2 Addresses
HCS_STREAMER=0.0.100010
NODE_STAKING=0.0.100011
ANALYTICS=0.0.100012
RATE_MODEL=0.0.100013
INTEGRATION=0.0.100014

# HCS Topics
SUPPLY_TOPIC=0.0.200000
WITHDRAW_TOPIC=0.0.200001
BORROW_TOPIC=0.0.200002
REPAY_TOPIC=0.0.200003
LIQUIDATION_TOPIC=0.0.200004
CONFIG_TOPIC=0.0.200005
GOVERNANCE_TOPIC=0.0.200006
ANALYTICS_TOPIC=0.0.200007
```

---

## Deployment Checklist

- [ ] Deploy core contracts (Pool, Configurator, Oracle, etc.)
- [ ] Create 8 HCS topics
- [ ] Deploy Phase 2 contracts (HCS, Staking, Analytics, Rates)
- [ ] Deploy Integration contract
- [ ] Deploy Deployment Config contract
- [ ] Configure core contract addresses
- [ ] Configure Phase 2 contract addresses
- [ ] Configure HCS topic IDs
- [ ] Configure node staking parameters
- [ ] Configure interest rate models
- [ ] Initialize protocol (wire everything together)
- [ ] Verify deployment status
- [ ] Test HCS event streaming
- [ ] Test node staking
- [ ] Test analytics queries
- [ ] Test interest rate model
- [ ] Set up monitoring
- [ ] Document contract addresses
- [ ] Transfer admin roles to multisig

---

## Support

For issues or questions:
- GitHub: https://github.com/YourOrg/Dera
- Discord: https://discord.gg/dera-protocol
- Docs: https://docs.dera.finance

---

**Dera Protocol - Built exclusively for Hedera** 🚀
