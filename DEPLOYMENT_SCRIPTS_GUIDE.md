# Deployment Scripts Guide

This document provides a comprehensive overview of all deployment scripts available in the Dera Protocol.

## 📋 Available Scripts

### 1. **verify-setup.js** - Pre-Deployment Verification ⭐ START HERE

**Purpose:** Verifies your environment is ready before deployment

**Usage:**
```bash
npm run verify-setup
```

**What it checks:**
- ✅ Node.js version (18+)
- ✅ Directory structure
- ✅ All deployment scripts present
- ✅ Configuration files (.env.example, hardhat.config.js)
- ✅ Environment variables configured
- ✅ Dependencies installed
- ✅ Optional tools (Git, GitHub CLI)

**When to use:** Always run this FIRST before deploying

---

### 2. **deploy-hackathon.js** - Full Interactive Deployment ⭐ RECOMMENDED FOR JUDGES

**Purpose:** Complete deployment with progress tracking and colored output

**Usage:**
```bash
npm run deploy:hackathon
```

**What it does:**
1. Checks prerequisites (Node.js, .env file, environment variables)
2. Installs all dependencies (root, contracts, frontend)
3. Compiles smart contracts
4. Deploys all contracts to Hedera testnet
5. Creates HCS topics
6. Configures frontend environment
7. Displays comprehensive summary with HashScan links

**Duration:** 5-8 minutes

**Features:**
- Interactive prompts
- Colored terminal output
- Progress indicators
- Error handling with partial deployment recovery
- Automatic configuration updates
- HashScan links for all deployed resources

**When to use:** First-time deployment or when you want detailed output

---

### 3. **quick-deploy.sh** - Fast Bash Deployment

**Purpose:** Streamlined deployment for experienced users

**Usage:**
```bash
./quick-deploy.sh
# or
npm run quick-deploy
```

**What it does:**
1. Validates environment variables
2. Installs dependencies (with spinner animation)
3. Compiles contracts
4. Deploys contracts
5. Creates HCS topics
6. Displays deployment summary

**Duration:** 5-7 minutes

**Features:**
- Fast execution
- Minimal prompts
- Progress spinner
- Compact output
- Automatic validation

**When to use:** Subsequent deployments or when you're familiar with the process

---

### 4. **contracts/scripts/deploy-complete.js** - Core Contract Deployment

**Purpose:** Deploys all core smart contracts (used by other scripts)

**Usage:**
```bash
cd contracts
npm run deploy
# or
npx hardhat run scripts/deploy-complete.js --network testnet
```

**What it deploys:**
1. PoolAddressesProvider
2. ACLManager
3. DeraOracle
4. DefaultReserveInterestRateStrategy
5. Pool (core lending logic)
6. PoolConfigurator
7. DeraMultiAssetStaking
8. DeraMirrorNodeAnalytics

**Output files:**
- `contracts/deployment-info.json` - All contract addresses
- Updates `frontend/.env.local` automatically

**When to use:** Manual deployment or testing individual contracts

---

### 5. **contracts/scripts/create-hcs-topics.js** - HCS Topic Creation

**Purpose:** Creates Hedera Consensus Service topics for event logging

**Usage:**
```bash
cd contracts
npm run deploy:hcs
# or
node scripts/create-hcs-topics.js
```

**What it creates:**
1. Supply events topic
2. Withdraw events topic
3. Borrow events topic
4. Repay events topic
5. Liquidation events topic

**Output files:**
- `contracts/hcs-topics.json` - All topic IDs
- Updates `frontend/.env.local` and `backend/hcs-event-service/.env`

**When to use:** After contract deployment or to recreate topics

---

## 🎯 Recommended Workflow for Judges

### Quick Setup (5-8 minutes)

```bash
# 1. Verify setup
npm run verify-setup

# 2. Configure environment (if needed)
cp contracts/.env.example contracts/.env
nano contracts/.env  # Add your Hedera credentials

# 3. Deploy everything
npm run deploy:hackathon

# 4. Start frontend
cd frontend
npm install
npm run dev

# 5. Open browser
# Visit http://localhost:3000
```

---

## 📊 Script Comparison

| Script | Duration | Verbosity | Best For | Prerequisites Check |
|--------|----------|-----------|----------|---------------------|
| verify-setup.js | 10 sec | High | Pre-deployment | ✅ Yes |
| deploy-hackathon.js | 5-8 min | High | Judges/First-time | ✅ Yes |
| quick-deploy.sh | 5-7 min | Medium | Developers | ✅ Yes |
| deploy-complete.js | 3-5 min | Medium | Manual deployment | ❌ No |
| create-hcs-topics.js | 30 sec | Low | HCS only | ❌ No |

---

## 🔧 Troubleshooting

### Script fails with "npm not found"
**Solution:** Install Node.js 18+ from https://nodejs.org/

### "insufficient HBAR" error
**Solution:**
1. Check your balance on HashScan
2. Request 100 HBAR from https://portal.hedera.com/
3. Wait 30 seconds for deposit

### ".env file not found"
**Solution:**
```bash
cp contracts/.env.example contracts/.env
nano contracts/.env  # Add credentials
```

### "Cannot find module" errors
**Solution:**
```bash
npm run install:all
```

### Script hangs or times out
**Solution:**
- Check internet connection
- Check Hedera network status: https://status.hedera.com/
- Try again in a few minutes

---

## 📝 Environment Variables Reference

### Required Variables (contracts/.env)

```env
# Hedera Account
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=302e... # DER format
PRIVATE_KEY=0x... # Hex format for ethers.js

# Network (pre-configured)
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
HEDERA_TESTNET_MIRROR_NODE=https://testnet.mirrornode.hedera.com
```

### Auto-Configured Variables (after deployment)

These are automatically populated by deployment scripts:

```env
# Contract Addresses
POOL_ADDRESSES_PROVIDER=0x...
POOL_ADDRESS=0x...
ORACLE_ADDRESS=0x...
MULTI_ASSET_STAKING_ADDRESS=0x...

# HCS Topics
HCS_SUPPLY_TOPIC=0.0.xxxxx
HCS_WITHDRAW_TOPIC=0.0.xxxxx
HCS_BORROW_TOPIC=0.0.xxxxx
HCS_REPAY_TOPIC=0.0.xxxxx
HCS_LIQUIDATION_TOPIC=0.0.xxxxx
```

---

## 🚀 Next Steps After Deployment

1. **Verify deployment:**
   - Check `contracts/deployment-info.json` for contract addresses
   - Check `contracts/hcs-topics.json` for topic IDs
   - Visit HashScan links to view deployed resources

2. **Start frontend:**
   ```bash
   cd frontend
   npm run dev
   # Opens at http://localhost:3000
   ```

3. **Start backend services (optional):**
   ```bash
   # Terminal 1: HCS Event Service
   cd backend/hcs-event-service && npm run dev

   # Terminal 2: Node Staking Service
   cd backend/node-staking-service && npm run dev
   ```

4. **Test the protocol:**
   - Connect HashPack wallet
   - Supply HBAR to earn interest
   - Borrow against collateral
   - Check HCS events on HashScan

---

## 📚 Additional Resources

- **README.md** - Complete project documentation
- **contracts/.env.example** - Configuration template
- **frontend/.env.example** - Frontend configuration template

---

## 🆘 Support

If you encounter issues:

1. Run `npm run verify-setup` to check your environment
2. Check the troubleshooting section above
3. Review deployment logs in `contracts/deployment-info.json`
4. Verify environment variables in `contracts/.env`
5. Check HashScan for transaction status

---

**All scripts are production-ready and tested for hackathon deployment!** 🎉
