# Lending/Borrowing System Setup Guide

## 🚀 Current Status

### ✅ Completed
- **Smart Contracts**: Fixed and enhanced with new features
- **Frontend UI**: Beautiful charts and improved UX
- **Integration Layer**: Complete Web3 service (`contractService.js`)
- **State Management**: Redux slices configured
- **Hooks**: Connected to smart contracts

### ⚠️ Pending
- **Contract Deployment**: Contracts need to be deployed to Hedera
- **Environment Variables**: Contract addresses need to be configured
- **Contract Service Initialization**: Need to initialize with wallet provider

---

## 📋 Step-by-Step Setup

### 1. Deploy Smart Contracts to Hedera

You need to deploy these 6 contracts in order:

#### Order of Deployment:
1. **PriceOracle** (standalone)
2. **LPInstant** (LP token for Tier 1)
3. **LPWarm** (LP token for Tier 2)
4. **LPCold** (LP token for Tier 3)
5. **LendingPool** (requires LP token addresses)
6. **BorrowingContract** (requires PriceOracle and LendingPool addresses)

#### Deployment Script Example:
```javascript
// contracts/scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  // 1. Deploy PriceOracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const initialPrice = ethers.parseUnits("0.05", 8); // $0.05
  const priceOracle = await PriceOracle.deploy(initialPrice, deployer.address);
  await priceOracle.waitForDeployment();
  console.log("PriceOracle deployed to:", await priceOracle.getAddress());

  // 2. Deploy LP Tokens
  const LPInstant = await ethers.getContractFactory("LPInstant");
  const lpInstant = await LPInstant.deploy(deployer.address);
  await lpInstant.waitForDeployment();
  console.log("LPInstant deployed to:", await lpInstant.getAddress());

  const LPWarm = await ethers.getContractFactory("LPWarm");
  const lpWarm = await LPWarm.deploy(deployer.address);
  await lpWarm.waitForDeployment();
  console.log("LPWarm deployed to:", await lpWarm.getAddress());

  const LPCold = await ethers.getContractFactory("LPCold");
  const lpCold = await LPCold.deploy(deployer.address);
  await lpCold.waitForDeployment();
  console.log("LPCold deployed to:", await lpCold.getAddress());

  // 3. Deploy LendingPool
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(
    await lpInstant.getAddress(),
    await lpWarm.getAddress(),
    await lpCold.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("LendingPool deployed to:", await lendingPool.getAddress());

  // 4. Grant minter roles to LendingPool
  await lpInstant.grantMinterRole(await lendingPool.getAddress());
  await lpWarm.grantMinterRole(await lendingPool.getAddress());
  await lpCold.grantMinterRole(await lendingPool.getAddress());
  console.log("Minter roles granted");

  // 5. Deploy BorrowingContract
  const BorrowingContract = await ethers.getContractFactory("BorrowingContract");
  const borrowingContract = await BorrowingContract.deploy(
    await priceOracle.getAddress(),
    await lendingPool.getAddress(),
    deployer.address // iScore provider (update later)
  );
  await borrowingContract.waitForDeployment();
  console.log("BorrowingContract deployed to:", await borrowingContract.getAddress());

  // 6. Set borrowing contract in lending pool
  await lendingPool.setBorrowingContract(await borrowingContract.getAddress());
  console.log("BorrowingContract set in LendingPool");

  console.log("\n=== Deployment Summary ===");
  console.log("PriceOracle:", await priceOracle.getAddress());
  console.log("LPInstant:", await lpInstant.getAddress());
  console.log("LPWarm:", await lpWarm.getAddress());
  console.log("LPCold:", await lpCold.getAddress());
  console.log("LendingPool:", await lendingPool.getAddress());
  console.log("BorrowingContract:", await borrowingContract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run deployment:
```bash
cd contracts
npx hardhat run scripts/deploy.js --network hedera-testnet
```

---

### 2. Configure Environment Variables

Create `frontend/.env.local` with deployed contract addresses:

```bash
# Contract Addresses (replace with your deployed addresses)
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0x1234...
NEXT_PUBLIC_BORROWING_CONTRACT_ADDRESS=0x5678...
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0x9abc...
NEXT_PUBLIC_LP_INSTANT_ADDRESS=0xdef0...
NEXT_PUBLIC_LP_WARM_ADDRESS=0x1111...
NEXT_PUBLIC_LP_COLD_ADDRESS=0x2222...

# Hedera Network Configuration
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_HEDERA_OPERATOR_ID=0.0.123456
```

---

### 3. Initialize Contract Service in Your App

Add this to your wallet connection logic:

```javascript
// Example: In your wallet connection handler
import { contractService } from './services/contractService'

async function handleWalletConnect() {
  try {
    // Your existing wallet connection code...
    const provider = await getWeb3Provider() // Your provider

    // Initialize contract service
    await contractService.initialize(provider)
    console.log('Contract service initialized')

    // Now you can use the contracts!
  } catch (error) {
    console.error('Failed to connect:', error)
  }
}
```

For HashPack wallet:
```javascript
import { HashConnect } from 'hashconnect'
import { contractService } from './services/contractService'

const hashconnect = new HashConnect()

async function connectHashPack() {
  const appMetadata = {
    name: "Dera",
    description: "DeFi on Hedera",
    icon: "https://dera.app/icon.png"
  }

  await hashconnect.init(appMetadata)
  const state = await hashconnect.connect()

  // Get provider from HashConnect
  const provider = hashconnect.getProvider("testnet", state.topic, state.pairingString)

  // Initialize contracts
  await contractService.initialize(provider)
}
```

---

### 4. Verify Integration is Working

After deployment and setup, test the integration:

```javascript
// Test in browser console or component
import { contractService } from './services/contractService'

// Check if initialized
console.log('Contracts initialized:', contractService.contracts)

// Test getting pool stats
const stats = await contractService.getPoolStats()
console.log('Pool stats:', stats)

// Test getting HBAR price
const price = await contractService.getHBARPrice()
console.log('HBAR price:', price)

// Test getting APY
const tier1APY = await contractService.getAPY(1)
console.log('Tier 1 APY:', tier1APY)
```

---

## 🔍 How Everything Connects

### Data Flow:

1. **User connects wallet** → Provider obtained
2. **contractService.initialize(provider)** → Contracts ready
3. **Component mounts** → `useEffect` triggers
4. **Hooks fetch data** → Call contract functions via `contractService`
5. **Data dispatched to Redux** → State updated
6. **UI re-renders** → Shows real data

### Current Behavior:

**Without deployed contracts:**
- ✅ UI works with mock/default data
- ✅ Charts display properly
- ✅ State management functional
- ❌ No real blockchain data

**With deployed contracts:**
- ✅ Everything above PLUS
- ✅ Real pool statistics
- ✅ Live APY rates
- ✅ Actual user deposits/loans
- ✅ Transaction history
- ✅ Smart contract interactions

---

## 📝 What Changed in Smart Contracts

### BorrowingContract.sol
**New/Fixed Functions:**
- `repay(bool isFullRepayment)` - Support partial repayments
- `addCollateral()` - Add collateral to existing loans
- Fixed collateral return logic (now on-chain, not event-based)
- Fixed liquidation bonus calculation

### LendingPool.sol
**New Functions:**
- `pause()` / `unpause()` - Emergency controls
- Enhanced events: `Borrowed`, `Repaid` with tier details

**⚠️ Breaking Changes:**
- Old contracts won't have these functions
- Must redeploy to use new features

---

## 🧪 Testing Checklist

After deployment, test these flows:

### Lending Flow:
- [ ] Connect wallet
- [ ] Deposit to Tier 1 (instant)
- [ ] Check LP token balance
- [ ] Withdraw from Tier 1
- [ ] Request withdrawal from Tier 2 (30-day notice)
- [ ] Check pool statistics update

### Borrowing Flow:
- [ ] Deposit collateral and borrow
- [ ] Check health factor
- [ ] Make partial repayment
- [ ] Add more collateral
- [ ] Full repayment (collateral returned)
- [ ] Verify transaction history

### UI/Charts:
- [ ] Overview tab shows correct stats
- [ ] APY chart displays tier rates
- [ ] TVL chart shows supply/borrow
- [ ] Tier distribution pie chart
- [ ] Volume bar chart
- [ ] All values update on refresh

---

## 🐛 Troubleshooting

### "Contract not initialized"
**Cause:** `contractService.initialize()` not called
**Fix:** Initialize after wallet connection

### "Provider is required"
**Cause:** No Web3 provider passed to initialize
**Fix:** Ensure wallet is connected first

### "Transaction failed"
**Cause:** Insufficient gas, wrong network, or contract error
**Fix:** Check wallet balance, network, and contract state

### "Price is stale"
**Cause:** PriceOracle hasn't been updated in 15+ minutes
**Fix:** Call `priceOracle.updatePrice()` (requires price provider role)

### Charts show mock data
**Cause:** Contracts not deployed or not initialized
**Fix:** Deploy contracts and set environment variables

---

## 📚 Additional Resources

- **Smart Contract Docs:** `/contracts/README.md`
- **Frontend Setup:** `/frontend/README.md`
- **Hedera Documentation:** https://docs.hedera.com
- **Ethers.js v6 Docs:** https://docs.ethers.org/v6

---

## 🎯 Next Steps

1. **Deploy contracts** using the script above
2. **Copy contract addresses** to `.env.local`
3. **Initialize contract service** in wallet connection
4. **Test all features** with real transactions
5. **Monitor events** and transaction receipts
6. **Add error handling** for edge cases
7. **Set up price oracle updater** (backend service)

---

## ✅ Summary

| Component | Status | Ready for Production? |
|-----------|--------|----------------------|
| Smart Contracts | ✅ Fixed & Enhanced | After deployment |
| UI/Charts | ✅ Complete | Yes |
| Contract Service | ✅ Complete | After contracts deployed |
| State Management | ✅ Complete | Yes |
| Hooks Integration | ✅ Complete | After contracts deployed |
| Environment Setup | ⚠️ Pending | Need contract addresses |

**To make it fully functional:**
1. Deploy contracts → Get addresses → Update .env → Initialize service → Test!

**Current state:**
- Everything works with mock data
- Ready to connect to real contracts immediately after deployment
- No additional code changes needed - just configuration
