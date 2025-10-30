# Multi-Asset Staking Deployment Guide

## Overview

This guide covers the deployment and integration of the DeraMultiAssetStaking contract as a standalone feature in the Dera Protocol ecosystem.

**Contract:** `DeraMultiAssetStaking.sol`
**Location:** `contracts/contracts/hedera/DeraMultiAssetStaking.sol`
**Interface:** `contracts/contracts/interfaces/IDeraMultiAssetStaking.sol`
**Frontend Service:** `frontend/services/stakingService.js`
**Frontend Component:** `frontend/app/components/features/staking/StakingDashboard.jsx`

---

## 🎯 Features

- **Multi-Asset Support**: HBAR, HTS Tokens, NFTs, and RWAs
- **Tiered APR Rewards** (Standard Rates):
  - 7 days: 2% APR (Dynamic: 1-3%)
  - 30 days: 4% APR (Dynamic: 2-6%)
  - 90 days: 7% APR (Dynamic: 3.5-10.5%)
  - 180 days: 10% APR (Dynamic: 5-15%)
  - 365 days: 12% APR (Dynamic: 6-18%)
- **Dynamic Rates**: Based on TVL (higher rates when TVL is low)
- **Sustainability Checks**: Max 80% reward pool utilization
- **NFT Staking**: Fixed 1 HBAR/day rewards
- **Emergency Unstake**: 20% penalty for early withdrawal
- **Rewards Claiming**: Claim without unstaking

---

## 📋 Prerequisites

1. **Deployed Pool Contract**
   - Address of Pool.sol contract
   - Needed for DeraMultiAssetStaking constructor

2. **Admin Account**
   - Hedera account with admin privileges
   - Will manage reward token configuration

3. **Reward Token** (Optional but recommended)
   - HTS token for distributing rewards
   - Can be set after deployment

4. **Sufficient HBAR**
   - ~10-15 HBAR for contract deployment
   - ~5 HBAR for configuration transactions

---

## 🚀 Deployment Steps

### Step 1: Compile Contract

```bash
cd contracts
npx hardhat compile
```

**Expected Output:**
```
Compiled 2 Solidity files successfully
- DeraMultiAssetStaking.sol
- IDeraMultiAssetStaking.sol
```

### Step 2: Deploy Contract

Create deployment script `contracts/scripts/deploy-staking.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying DeraMultiAssetStaking...");

  // Get Pool address (already deployed)
  const POOL_ADDRESS = process.env.POOL_ADDRESS; // e.g., "0.0.123456"
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS; // e.g., "0.0.789012"

  if (!POOL_ADDRESS || !ADMIN_ADDRESS) {
    throw new Error("Missing POOL_ADDRESS or ADMIN_ADDRESS in environment variables");
  }

  // Deploy
  const DeraMultiAssetStaking = await ethers.getContractFactory("DeraMultiAssetStaking");
  const staking = await DeraMultiAssetStaking.deploy(POOL_ADDRESS, ADMIN_ADDRESS);

  await staking.waitForDeployment();

  const address = await staking.getAddress();
  console.log("✅ DeraMultiAssetStaking deployed to:", address);

  // Log configuration info
  console.log("\n📝 Deployment Summary:");
  console.log("- Contract Address:", address);
  console.log("- Pool Address:", POOL_ADDRESS);
  console.log("- Admin Address:", ADMIN_ADDRESS);
  console.log("\n⚠️  IMPORTANT: Set reward token using setRewardToken()");

  return address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment successful! Add to .env:\nNEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Run Deployment:**
```bash
# Set environment variables
export POOL_ADDRESS="0.0.123456"  # Your Pool contract address
export ADMIN_ADDRESS="0.0.789012"  # Your admin account

# Deploy
npx hardhat run scripts/deploy-staking.js --network testnet
```

**Expected Output:**
```
🚀 Deploying DeraMultiAssetStaking...
✅ DeraMultiAssetStaking deployed to: 0.0.345678

📝 Deployment Summary:
- Contract Address: 0.0.345678
- Pool Address: 0.0.123456
- Admin Address: 0.0.789012

⚠️  IMPORTANT: Set reward token using setRewardToken()

🎉 Deployment successful! Add to .env:
NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=0.0.345678
```

### Step 3: Set Reward Token (Post-Deployment)

```bash
# Create set-reward-token.js script
cat > contracts/scripts/set-reward-token.js << 'EOF'
const { ethers } = require("hardhat");

async function main() {
  const STAKING_ADDRESS = process.env.MULTI_ASSET_STAKING_ADDRESS;
  const REWARD_TOKEN = process.env.REWARD_TOKEN_ADDRESS; // HTS token for rewards

  const staking = await ethers.getContractAt("DeraMultiAssetStaking", STAKING_ADDRESS);

  console.log("🔄 Setting reward token...");
  const tx = await staking.setRewardToken(REWARD_TOKEN);
  await tx.wait();

  console.log("✅ Reward token set to:", REWARD_TOKEN);
}

main().catch(console.error);
EOF

# Run
export MULTI_ASSET_STAKING_ADDRESS="0.0.345678"
export REWARD_TOKEN_ADDRESS="0.0.111111"  # Your HTS reward token
npx hardhat run scripts/set-reward-token.js --network testnet
```

---

## 🔧 Frontend Configuration

### Step 1: Update Environment Variables

Add to `frontend/.env.local`:

```bash
# Multi-Asset Staking
NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=0.0.345678
```

### Step 2: Initialize Staking Service

The staking service will auto-initialize when the staking page loads. Verify by checking browser console:

```javascript
// Should see in console:
"✅ StakingService initialized with contract: 0.0.345678"
```

### Step 3: Generate ABI

The ABI is already created at `frontend/contracts/abis/DeraMultiAssetStaking.json`.

If you need to regenerate:
```bash
cd contracts
npx hardhat compile
cp artifacts/contracts/hedera/DeraMultiAssetStaking.sol/DeraMultiAssetStaking.json \
   ../frontend/contracts/abis/DeraMultiAssetStaking.json
```

---

## 🧪 Testing

### 1. Test Staking Page

```bash
cd frontend
npm run dev
```

Navigate to: `http://localhost:3000/dashboard`
- Click "Staking" tab in sidebar
- Should see Multi-Asset Staking interface
- Select asset type, choose asset from wallet
- Select lock period
- Click "Stake Assets"

### 2. Verify Contract Integration

```javascript
// In browser console (staking page)
const stakingService = (await import('/services/stakingService.js')).default;

// Check if initialized
console.log('Initialized:', stakingService.isInitialized);
// Should be: true

// Check contract address
console.log('Contract:', stakingService.getContractAddress());
// Should be: 0.0.345678

// Get user stakes (replace with your address)
const stakes = await stakingService.getUserStakes('0.0.YOUR_ADDRESS');
console.log('Stakes:', stakes);
```

### 3. Test Staking Flow

**Test Case 1: Stake HBAR**
1. Go to Staking tab
2. Select "HBAR" asset type
3. Enter amount: `10`
4. Select lock period: `30 Days` (10% APY)
5. Click "Stake Assets"
6. Confirm in HashPack wallet
7. Wait for confirmation
8. Should see stake in "Your Active Stakes" section

**Test Case 2: Stake HTS Token**
1. Select "HTS Token" asset type
2. Choose token from dropdown (shows your wallet tokens)
3. Enter amount
4. Select lock period
5. Stake and confirm

**Test Case 3: Stake NFT**
1. Select "NFT" asset type
2. Choose NFT from dropdown (shows serial numbers)
3. Select lock period
4. Stake and confirm
5. Should see "1 HBAR per day" rewards info

### 4. Test Rewards and Unstaking

**Wait a few hours/days**, then:

1. **Claim Rewards:**
   - Go to active stake
   - Click "Claim Rewards"
   - Should receive accumulated rewards

2. **Unstake (after lock period):**
   - Wait for "Unlocks in" to show "Unlocked"
   - Click "Unstake"
   - Should receive principal + remaining rewards

3. **Emergency Unstake (before lock period):**
   - Click "Unstake" while still locked (if enabled)
   - Should show 20% penalty warning
   - Receive 80% of principal

---

## 🎨 UI Components

### Standalone Staking Page

**Location:** `frontend/app/components/features/staking/StakingDashboard.jsx`

**Features:**
- Full-page staking interface
- Standalone sidebar tab (Lock icon)
- Asset selection from wallet
- Lock period selector with APY display
- Projected rewards calculator
- Active stakes management
- Time remaining countdown

### Integration with Wallet

The staking component automatically:
- Fetches user's HTS tokens
- Fetches user's NFTs
- Displays balances
- Updates when default wallet changes

---

## 📊 Backend Integration (Optional)

### Staking Monitor Service

Create `backend/staking-monitor-service/` for:
- Tracking all stakes
- Calculating rewards off-chain
- Sending notifications when stakes unlock
- Generating staking analytics

**Not required for basic functionality** - Contract handles everything on-chain.

### Analytics Integration

To add staking metrics to protocol analytics:

1. Create `getStakingMetrics()` in `DeraMirrorNodeAnalytics.sol`
2. Add staking data to ProtocolAnalytics tab
3. Track TVL in staking

---

## ✅ Post-Deployment Checklist

- [ ] Contract deployed to Hedera testnet
- [ ] Contract address added to frontend `.env.local`
- [ ] Reward token set via `setRewardToken()`
- [ ] StakingService initializes without errors
- [ ] Staking tab appears in sidebar
- [ ] Can view wallet assets in staking UI
- [ ] Can stake HBAR successfully
- [ ] Can stake HTS tokens successfully
- [ ] Can stake NFTs successfully
- [ ] Active stakes display correctly
- [ ] Time remaining countdown works
- [ ] Can claim rewards
- [ ] Can unstake after lock period

---

## 🔍 Verification

### Check Contract on HashScan

Visit: `https://hashscan.io/testnet/contract/0.0.345678`

Should see:
- Contract bytecode
- Constructor parameters (Pool address, Admin address)
- Transaction history (Stakes, Unstakes, Claims)

### Verify Staking Events

Check HCS events (if integrated):
- Staked events with asset details
- Unstaked events
- RewardsClaimed events

---

## 🐛 Troubleshooting

### Issue: StakingService not initialized

**Symptoms:**
```
⚠️ StakingService not initialized, returning mock data
```

**Solution:**
1. Check `NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS` in `.env.local`
2. Verify contract address is correct
3. Ensure ABI file exists at correct path
4. Check browser console for errors

### Issue: No tokens/NFTs showing in selector

**Symptoms:**
- "No tokens found in wallet"
- "No NFTs found in wallet"

**Solution:**
1. Check default wallet is connected
2. Verify wallet has tokens/NFTs associated
3. Check Mirror Node API calls in Network tab
4. Token association might be needed (HTS requirement)

### Issue: Transaction fails

**Common Causes:**
1. **Insufficient balance** - Need HBAR for gas + staking amount
2. **Token not associated** - Associate HTS token first
3. **NFT not owned** - Verify NFT ownership via HashScan
4. **Invalid lock period** - Must be 7, 30, 90, 180, or 365 days

**Debug:**
```javascript
// Check lock period constants
const stakingService = (await import('/services/stakingService.js')).default;
await stakingService.contract.PERIOD_30_DAYS(); // Should be 2592000 (30 days in seconds)
```

---

## 📝 Notes

### HTS Precompile Usage

All token transfers use HTS precompile at `0x167`:
```solidity
IHTS private constant HTS = IHTS(address(0x167));
```

No approve/transferFrom - direct HTS transfers via precompile.

### Reward Calculation

Rewards calculated on-chain using:
```solidity
rewards = principal * APY * (time elapsed) / (365 days)
```

NFTs get fixed 1 HBAR/day regardless of lock period.

### Emergency Unstake Penalty

20% penalty applied to principal only, not rewards:
```solidity
returnAmount = staked amount * 80 / 100;
penalty = staked amount * 20 / 100; // Sent to admin
```

---

## 🚀 Production Deployment

For mainnet:

1. Use mainnet RPC: `https://mainnet.hashio.io/api`
2. Update all contract addresses
3. Set higher gas limits
4. Use production reward token
5. Test thoroughly on testnet first
6. Consider time-lock for admin functions
7. Audit contract before mainnet deployment

---

## 📞 Support

- Hedera Documentation: https://docs.hedera.com
- HashPack Wallet: https://www.hashpack.app
- Hedera Discord: https://hedera.com/discord
- Mirror Node API: https://docs.hedera.com/hedera/sdks-and-apis/rest-api

---

**Last Updated:** October 29, 2025
**Version:** 1.0
**Network:** Hedera Testnet
