# Dera Protocol - Developer Deployment Guide

**Complete step-by-step guide for deploying Dera Protocol on Hedera Testnet**

## 🎯 Overview

This guide will help you deploy the complete Dera Protocol stack including:
- ✅ Smart contracts (Pool, Oracle, Staking, Analytics)
- ✅ HCS topics for event logging
- ✅ Frontend application
- ✅ Environment configuration

**Time Required:** 30-45 minutes  
**Prerequisites:** Node.js v18+, Hedera testnet account

---

## 📋 Prerequisites

### 1. Hedera Testnet Account
1. Visit [portal.hedera.com](https://portal.hedera.com)
2. Create testnet account
3. Note your Account ID (e.g., `0.0.123456`)
4. Note your Private Key (64+ character hex string)
5. Ensure you have 50+ HBAR for deployment

### 2. System Requirements
```bash
# Check Node.js version (v18+ required)
node --version

# Check npm version
npm --version
```

### 3. WalletConnect Project ID (Optional)
- Visit [cloud.walletconnect.com](https://cloud.walletconnect.com)
- Create project and get Project ID
- Required for HashPack wallet integration

---

## 🚀 Quick Deployment (Automated)

### Option 1: One-Command Deployment
```bash
# Clone and deploy in one go
git clone <your-repo-url>
cd Dera
node deploy.js
```

The script will:
1. Set up environment variables (interactive)
2. Install all dependencies
3. Compile contracts
4. Deploy to Hedera testnet
5. Create HCS topics
6. Configure frontend
7. Build application

### Option 2: Manual Step-by-Step

If you prefer manual control, follow the detailed steps below.

---

## 🔧 Manual Deployment Steps

### Step 1: Environment Setup

```bash
# Run environment setup
node setup-environment.js
```

**Interactive prompts:**
- Hedera Account ID: `0.0.123456`
- Private Key: `your_64_char_private_key`
- WalletConnect Project ID: `your_project_id` (optional)

This creates:
- `contracts/.env` - Contract deployment config
- `frontend/.env.local` - Frontend configuration

### Step 2: Install Dependencies

```bash
# Install contract dependencies
cd contracts
npm install
npm install @hashgraph/sdk

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 3: Compile Contracts

```bash
cd contracts
npx hardhat compile
```

**Expected output:**
```
✓ Compiled 60 Solidity files successfully
```

### Step 4: Deploy Smart Contracts

```bash
# Deploy all contracts to Hedera testnet
npx hardhat run scripts/deploy-complete.js --network testnet
```

**Expected output:**
```
🚀 Deploying Complete Dera Protocol to Hedera Testnet

Deploying with account: 0x...
Account balance: 100.0 HBAR

📍 1/8 Deploying PoolAddressesProvider...
✅ PoolAddressesProvider: 0.0.123456

📍 2/8 Deploying ACLManager...
✅ ACLManager: 0.0.123457

... (continues for all 8 contracts)

🎉 Deployment Complete!

📋 Contract Addresses:
   POOL: 0.0.123456
   ORACLE: 0.0.123457
   MULTI_ASSET_STAKING: 0.0.123458
   ...

🔗 View on HashScan:
   Pool: https://hashscan.io/testnet/contract/0.0.123456
```

### Step 5: Create HCS Topics

```bash
# Create HCS topics for event logging
node scripts/create-hcs-topics.js
```

**Expected output:**
```
🚀 Creating HCS Topics for Event Logging

📍 Creating SUPPLY topic...
✅ SUPPLY Topic: 0.0.789001

📍 Creating WITHDRAW topic...
✅ WITHDRAW Topic: 0.0.789002

... (continues for all 5 topics)

✅ HCS Topics Created Successfully!
```

### Step 6: Start Frontend

```bash
cd ../frontend

# Build the application
npm run build

# Start development server
npm run dev
```

Visit: `http://localhost:3000`

---

## 🧪 Testing Your Deployment

### 1. Verify Contract Deployment

```bash
# Check deployment info
cat contracts/deployment-info.json

# Verify on HashScan
# Visit the URLs provided in deployment output
```

### 2. Test Frontend

1. **Open Application:** `http://localhost:3000`
2. **Connect Wallet:** Click "Connect Wallet" → HashPack
3. **Check Dashboard:** Should show HBAR and USDC assets
4. **Test Supply:** Try supplying small amount of HBAR
5. **Check Events:** View HCS Event History tab

### 3. Verify HCS Topics

```bash
# Check topics info
cat contracts/hcs-topics.json

# Visit HashScan topic pages
# URLs provided in HCS creation output
```

---

## 📁 File Structure After Deployment

```
Dera/
├── contracts/
│   ├── .env                     # ✅ Deployment config
│   ├── deployment-info.json     # ✅ Contract addresses
│   ├── hcs-topics.json         # ✅ HCS topic IDs
│   └── artifacts/              # ✅ Compiled contracts
├── frontend/
│   ├── .env.local              # ✅ Frontend config
│   └── .next/                  # ✅ Built application
└── backend/                    # ⚙️ Optional services
```

---

## 🔍 Understanding the Architecture

### Smart Contracts Deployed

1. **PoolAddressesProvider** - Central registry for all protocol addresses
2. **ACLManager** - Access control and permissions
3. **Pool** - Main lending/borrowing logic
4. **DeraOracle** - Price feeds for assets
5. **PoolConfigurator** - Pool configuration management
6. **DefaultReserveInterestRateStrategy** - Interest rate calculations
7. **DeraMultiAssetStaking** - Multi-asset staking functionality
8. **DeraMirrorNodeAnalytics** - Protocol analytics and metrics

### HCS Topics Created

1. **SUPPLY** - Asset supply events
2. **WITHDRAW** - Asset withdrawal events  
3. **BORROW** - Asset borrow events
4. **REPAY** - Loan repayment events
5. **LIQUIDATION** - Liquidation events

### Frontend Services

1. **deraProtocolService** - Pool contract interactions
2. **stakingService** - Multi-asset staking
3. **hederaService** - Mirror Node queries
4. **hashpackService** - Wallet operations

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Insufficient HBAR" Error
**Cause:** Not enough HBAR for deployment gas fees
**Solution:** 
```bash
# Check balance on HashScan
# Visit: https://hashscan.io/testnet/account/0.0.YOUR_ACCOUNT
# Get more HBAR from portal.hedera.com
```

#### 2. "Invalid Private Key" Error
**Cause:** Wrong private key format
**Solution:**
```bash
# Ensure private key is 64+ character hex string
# Should start with 0x or be raw hex
# Check your Hedera portal account details
```

#### 3. "Contract Deployment Failed"
**Cause:** Network connectivity or contract compilation issues
**Solution:**
```bash
# Clean and recompile
cd contracts
rm -rf artifacts cache
npx hardhat compile

# Check network connectivity
curl https://testnet.hashio.io/api
```

#### 4. "Frontend Won't Start"
**Cause:** Missing environment variables or build issues
**Solution:**
```bash
cd frontend
# Check .env.local has all contract addresses
cat .env.local

# Clean build
rm -rf .next
npm run build
npm run dev
```

#### 5. "Wallet Won't Connect"
**Cause:** Missing WalletConnect project ID or HashPack not installed
**Solution:**
```bash
# Install HashPack extension
# Visit: https://www.hashpack.app/

# Add WalletConnect ID to .env.local
echo "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id" >> frontend/.env.local
```

### Debug Commands

```bash
# Check contract compilation
cd contracts && npx hardhat compile

# Verify deployment
npx hardhat run scripts/verify-deployment.js --network testnet

# Check frontend build
cd frontend && npm run build

# View deployment logs
cat contracts/deployment-info.json | jq '.'
```

---

## 🔄 Redeployment

If you need to redeploy:

```bash
# Clean previous deployment
rm -f contracts/deployment-info.json
rm -f contracts/hcs-topics.json

# Redeploy contracts
cd contracts
npx hardhat run scripts/deploy-complete.js --network testnet

# Recreate HCS topics
node scripts/create-hcs-topics.js

# Rebuild frontend
cd ../frontend
rm -rf .next
npm run build
```

---

## 🚀 Production Deployment

For mainnet deployment:

1. **Update Environment:**
```bash
# contracts/.env
HEDERA_NETWORK=mainnet

# frontend/.env.local
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=https://mainnet.hashio.io/api
NEXT_PUBLIC_MIRROR_NODE_URL=https://mainnet.mirrornode.hedera.com
```

2. **Deploy to Mainnet:**
```bash
npx hardhat run scripts/deploy-complete.js --network mainnet
```

3. **Security Checklist:**
- [ ] Contracts audited
- [ ] Admin keys secured (multisig)
- [ ] Oracle prices verified
- [ ] Emergency pause tested
- [ ] Liquidation bot funded

---

## 📚 Additional Resources

### Documentation
- [Hedera Developer Portal](https://docs.hedera.com)
- [HashPack Wallet](https://www.hashpack.app/developers)
- [Hardhat Documentation](https://hardhat.org/docs)

### Hedera Services
- [JSON-RPC Relay](https://docs.hedera.com/hedera/core-concepts/smart-contracts/json-rpc-relay)
- [Mirror Node API](https://docs.hedera.com/hedera/sdks-and-apis/rest-api)
- [HCS Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service)

### Tools
- [HashScan Explorer](https://hashscan.io)
- [Hedera Portal](https://portal.hedera.com)
- [WalletConnect](https://cloud.walletconnect.com)

---

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] All 8 contracts deployed to Hedera testnet
- [ ] All 5 HCS topics created and visible on HashScan
- [ ] Frontend loads at `http://localhost:3000`
- [ ] HashPack wallet connects successfully
- [ ] Can view HBAR and USDC assets
- [ ] Supply transaction works end-to-end
- [ ] Events appear in HCS Event History
- [ ] Transaction visible on HashScan

---

## 🆘 Support

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review deployment logs in `deployment-info.json`**
3. **Verify your Hedera account has sufficient HBAR**
4. **Ensure all environment variables are set correctly**
5. **Check HashScan for transaction status**

---

**🎉 Congratulations! You've successfully deployed Dera Protocol on Hedera!**

The protocol is now ready for testing and development. Users can connect their HashPack wallets and start lending, borrowing, and staking assets on Hedera.