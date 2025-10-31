# Dera Protocol Deployment Scripts

This directory contains the essential deployment scripts for the Dera Protocol smart contracts.

## Core Scripts

### 🚀 `deploy-complete.js`
**Purpose:** Main deployment script that deploys all core protocol contracts.

**Usage:**
```bash
npx hardhat run scripts/deploy-complete.js --network testnet
```

**What it deploys:**
- PoolAddressesProvider (registry contract)
- ACLManager (access control)
- DeraOracle (price feeds)
- DefaultReserveInterestRateStrategy (interest rate model)
- Pool (core lending logic)
- PoolConfigurator (admin functions)
- DeraMultiAssetStaking (staking logic)
- DeraMirrorNodeAnalytics (analytics contract)

**Output:** Creates `deployment-info.json` with all contract addresses.

---

### 📡 `create-hcs-topics.js`
**Purpose:** Creates HCS topics for immutable event logging.

**Usage:**
```bash
node scripts/create-hcs-topics.js
```

**What it creates:**
- Supply events topic
- Withdraw events topic
- Borrow events topic
- Repay events topic
- Liquidation events topic

**Output:** Creates `hcs-topics.json` with all topic IDs.

---

### 🔧 `deploy-tokens-and-init.js`
**Purpose:** Deploys test tokens and initializes assets in the Pool.

**Usage:**
```bash
npx hardhat run scripts/deploy-tokens-and-init.js --network testnet
```

**What it does:**
- Initializes HBAR as a reserve asset
- Configures USDC and USDT support
- Sets up interest rate strategies
- Configures collateral parameters

---

### 🔗 `connect-assets-to-main-pool.js`
**Purpose:** Connects initialized assets to the main Pool contract.

**Usage:**
```bash
npx hardhat run scripts/connect-assets-to-main-pool.js --network testnet
```

**What it does:**
- Links assets from PoolConfigurator to main Pool
- Ensures proper asset configuration
- Validates asset connections

---

### 📄 `export-missing-abis.js`
**Purpose:** Exports contract ABIs to the frontend directory.

**Usage:**
```bash
node scripts/export-missing-abis.js
```

**What it does:**
- Copies ABIs from `artifacts/` to `../frontend/contracts/abis/`
- Ensures frontend has access to all contract interfaces
- Runs automatically after compilation (postcompile hook)

---

### ✅ `verify-deployment.js`
**Purpose:** Verifies that all contracts are deployed and configured correctly.

**Usage:**
```bash
npx hardhat run scripts/verify-deployment.js --network testnet
```

**What it checks:**
- All contracts are deployed
- Contract addresses are valid
- Basic contract functionality
- Asset configurations

---

## Configuration

### `config/assets.json`
Contains asset configuration for different networks:
- Token addresses
- Decimals
- Interest rate parameters
- Collateral factors

## Deployment Flow

The recommended deployment flow is:

1. **Deploy Core Contracts:**
   ```bash
   npx hardhat run scripts/deploy-complete.js --network testnet
   ```

2. **Create HCS Topics:**
   ```bash
   node scripts/create-hcs-topics.js
   ```

3. **Initialize Assets:**
   ```bash
   npx hardhat run scripts/deploy-tokens-and-init.js --network testnet
   ```

4. **Connect Assets to Pool:**
   ```bash
   npx hardhat run scripts/connect-assets-to-main-pool.js --network testnet
   ```

5. **Verify Deployment:**
   ```bash
   npx hardhat run scripts/verify-deployment.js --network testnet
   ```

Or use the automated deployment:
```bash
npm run deploy:hackathon
```

## Output Files

After successful deployment, you'll have:

- `deployment-info.json` - All contract addresses and deployment info
- `hcs-topics.json` - HCS topic IDs for event logging
- `../frontend/contracts/abis/` - Contract ABIs for frontend integration

## Troubleshooting

### Common Issues:

1. **Insufficient HBAR:** Ensure your account has at least 100 HBAR
2. **Network Issues:** Check your internet connection and Hedera network status
3. **Environment Variables:** Verify `.env` file has correct operator ID and key
4. **Contract Verification:** Use `verify-deployment.js` to check deployment status

### Script Dependencies:

- `deploy-complete.js` must run first
- `create-hcs-topics.js` can run independently
- `deploy-tokens-and-init.js` requires deployed contracts
- `connect-assets-to-main-pool.js` requires initialized assets
- `verify-deployment.js` should run last

## Development

When adding new scripts:

1. Follow the existing naming convention
2. Include proper error handling
3. Log progress and results
4. Update this README
5. Test on testnet before mainnet

## Security

- Never commit private keys or sensitive data
- Use environment variables for credentials
- Test thoroughly on testnet
- Consider multi-sig for mainnet deployments