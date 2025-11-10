# How to Run the HBAR Fix Locally

## Problem Summary

**Multiple issues were discovered:**

1. **HBAR's decimals was set to 0** in the asset configuration bitmap (should be 8)
   - Caused `assetUnit = 10^0 = 1` instead of `10^8 = 100,000,000`

2. **GenericLogic was skipping HBAR** due to checking `if (assetAddress == address(0))`
   - Since HBAR's address IS `address(0)`, it was being skipped
   - This made `getUserAccountData` return all zeros even after fixing decimals

3. **After Pool redeployment, PoolConfigurator points to old Pool**
   - When Pool was redeployed with fixed GenericLogic, PoolConfigurator's `_pool` variable still pointed to the old Pool
   - This caused `finalizeInitAsset()` to fail

## The Solution

The fix requires multiple steps:

1. **Fix GenericLogic**: Change check from `assetAddress == address(0)` to `supplyTokenAddress == address(0)` ✅ DONE
2. **Redeploy Pool**: Deploy Pool with fixed GenericLogic library ✅ DONE
3. **Fix PoolConfigurator Pointer**: Update PoolConfigurator to point to new Pool
4. **Re-register HBAR**: Register HBAR asset data in new Pool
5. **Verify**: Test that getUserAccountData returns correct values

---

## Step 1: Pull the Latest Code

```bash
git pull origin claude/fix-hedera-contract-revert-011CUvtu98wNjvHAb1WeuAKo
```

This includes:
- Fixed `GenericLogic.sol` - Checks `supplyTokenAddress` instead of asset address
- `redeploy-pool-only.js` - Redeploys Pool with fixed libraries
- `fix-pool-configurator-pointer.js` - Updates PoolConfigurator to point to new Pool
- `reinit-hbar-in-new-pool.js` - Re-registers HBAR in new Pool
- Diagnostic and verification scripts

---

## Step 2: Set Up Environment Variables

Create a `.env` file in the `contracts/` directory:

```bash
cd contracts/
cp .env.example .env
nano .env  # or use your preferred editor
```

At minimum, you need to configure:

```bash
# Hedera Network Configuration
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api

# Your deployer private key (the one with Pool Admin role)
PRIVATE_KEY=your_private_key_here
```

**Important**:
- Use the same account that deployed the contracts (has Pool Admin role)
- Never commit the `.env` file to git (it's already in `.gitignore`)
- This is your Hedera account private key in hex format (64 characters)

---

## Step 3: Fix PoolConfigurator Pointer

**CRITICAL**: After Pool redeployment, PoolConfigurator's internal `_pool` variable still points to the old Pool. This step fixes it:

```bash
cd contracts/
npx hardhat run scripts/fix-pool-configurator-pointer.js --network testnet
```

**Expected Output:**

```
🔧 Fixing PoolConfigurator Pool Pointer
============================================================
📍 Contract Addresses:
   Deployer: 0x...
   PoolConfigurator: 0x28E78CC73c96F566B0aFFeEb4ba5285D11B331a8
   Expected Pool: 0xC9FD808D6d993Bd0DB611EebB847143709e21e3D

📋 Checking Permissions...
   Pool Admin: ✅

============================================================
STEP 1: Check Current Pool Pointer
============================================================

📊 Current State:
   PoolConfigurator points to: 0x794567E3F7B5a2f92C871A7F65e6451dC489372E
   Expected Pool address: 0xC9FD808D6d993Bd0DB611EebB847143709e21e3D
   Match: ❌

❌ PoolConfigurator is pointing to WRONG Pool!
   This is why finalizeInitAsset was failing.

============================================================
STEP 2: Update Pool Pointer
============================================================

🔧 Calling setPool() to update Pool address...
✅ Pool pointer updated
   Transaction: 0x...

============================================================
STEP 3: Verify Update
============================================================

📊 Updated State:
   PoolConfigurator now points to: 0xC9FD808D6d993Bd0DB611EebB847143709e21e3D
   Expected Pool address: 0xC9FD808D6d993Bd0DB611EebB847143709e21e3D
   Match: ✅

============================================================
✅ SUCCESS! PoolConfigurator Fixed
============================================================

🎯 Next Steps:
1. Run: npx hardhat run scripts/reinit-hbar-in-new-pool.js --network testnet
2. This should now work since PoolConfigurator points to correct Pool
3. Then test with: npx hardhat run scripts/test-oracle-direct.js --network testnet
```

**What this does:**
- Checks which Pool the PoolConfigurator is pointing to
- Updates it to point to the newly deployed Pool using `setPool()`
- This is why `finalizeInitAsset()` was failing before - it was trying to initialize HBAR in the old Pool!

---

## Step 4: Re-register HBAR in New Pool

Now that PoolConfigurator points to the correct Pool, re-register HBAR:

```bash
npx hardhat run scripts/reinit-hbar-in-new-pool.js --network testnet
```

**Expected Output:**

```
🔄 Re-initializing HBAR in new Pool

============================================================
📍 Contract Addresses:
   Old Pool: 0x794567E3F7B5a2f92C871A7F65e6451dC489372E
   New Pool: 0xC9FD808D6d993Bd0DB611EebB847143709e21e3D
   dHBAR Token: 0xac263D2538A40f262DE1ef0820c9D6dC496a6618
   Deployer: 0x...

📋 Checking Permissions...
   Pool Admin: ✅

============================================================
STEP 1: Get Asset Data from Old Pool
============================================================

📊 Old Pool HBAR Data:
   Supply Token: 0xac263D2538A40f262DE1ef0820c9D6dC496a6618
   Borrow Token: 0x...
   Liquidity Index: 1000000000000000000000000000
   Asset ID: 1

📊 Old Configuration:
   Config Data: 0x...

============================================================
STEP 2: Initialize HBAR in New Pool
============================================================

🔧 Calling finalizeInitAsset for HBAR via PoolConfigurator...
✅ HBAR initialized in new Pool
   Transaction: 0x...

============================================================
STEP 3: Set Configuration via PoolConfigurator
============================================================

📊 Configuration to set:
   LTV: 7500 (75%)
   Liquidation Threshold: 8000 (80%)
   Liquidation Bonus: 10500 (105%)
   Decimals: 8 (set during initialization)

🔧 Configuring HBAR as collateral...
✅ Collateral configuration set
   Transaction: 0x...

🔧 Setting borrowing enabled...
✅ Borrowing enabled
   Transaction: 0x...

============================================================
STEP 4: Verify New Pool
============================================================

📊 New Pool HBAR Data:
   Supply Token: 0xac263D2538A40f262DE1ef0820c9D6dC496a6618
   Borrow Token: 0x...
   Match: ✅

📊 New Configuration:
   Decimals: 8 ✅

============================================================
✅ SUCCESS! HBAR re-initialized in new Pool
============================================================

🎯 Next Steps:
1. Run: npx hardhat run scripts/test-oracle-direct.js --network testnet
2. Should now show $20 collateral!
3. Test frontend to verify everything works
```

**What this does:**
- Copies HBAR asset registration from old Pool to new Pool
- Preserves the same dToken (dHBAR) address so user balances remain intact
- Configures HBAR with same parameters (LTV 75%, liquidation threshold 80%)
- Enables borrowing
- Your 250 HBAR supply is safe and will now be recognized!

---

## Step 5: Verify the Fix Worked

### Option A: Run Test Script

```bash
npx hardhat run scripts/test-oracle-direct.js --network testnet
```

**Expected output:**
```javascript
getUserAccountData result:
  totalCollateralBase: 2000000000 ($20.00)  // ✅ No longer zero!
  totalDebtBase: 0 ($0.00)
  availableBorrowsBase: 1500000000 ($15.00) // ✅ 75% LTV
```

### Option B: Check in Frontend

1. Refresh your Dera Protocol page
2. Your dashboard should now show:
   - **Total Supplied**: ~$20 USD (250 HBAR × $0.08)
   - **Available to Borrow**: ~$15 USD (75% of $20)
   - **Net APY**: Positive value
3. You should now be able to borrow against your HBAR

---

## Troubleshooting

### Issue: "Pool Admin role required"

If you get a permissions error, you're using the wrong account. You need to use the deployer account that has Pool Admin privileges.

Check which account is the Pool Admin:
```bash
npx hardhat run scripts/check-admin-roles.js --network testnet
```

### Issue: "Cannot connect to RPC"

Make sure:
1. You have internet access
2. The RPC URL is correct: `https://testnet.hashio.io/api`
3. Hedera testnet is operational (check status.hedera.com)

### Issue: "Transaction failed"

Check:
1. Your account has HBAR for gas fees (~1-2 HBAR for both scripts)
2. You're connected to testnet, not mainnet
3. The contract addresses in `deployment-info.json` are correct

### Issue: "PoolConfigurator is already pointing to the correct Pool"

Great! The PoolConfigurator pointer is already fixed. You can skip to Step 4 (reinit-hbar-in-new-pool.js).

### Issue: "Asset already initialized" when running reinit script

This means HBAR has already been registered in the new Pool. You can skip to Step 5 to verify everything works.

### Issue: "finalizeInitAsset failed" when running reinit script

Make sure you ran Step 3 (fix-pool-configurator-pointer.js) first! The PoolConfigurator must point to the new Pool before reinit will work.

---

## What These Scripts Do

### 1. redeploy-pool-only.js (Already run)

This script:
1. Recompiles contracts with the fixed GenericLogic
2. Deploys all Pool libraries (SupplyLogic, BorrowLogic, LiquidationLogic, PoolLogic)
3. Deploys new Pool contract linked to fixed libraries
4. Updates PoolAddressesProvider to point to new Pool
5. Initializes the new Pool (handles Hedera address reuse)

**The GenericLogic fix:**
```solidity
// BEFORE (BUG): Skipped HBAR because its address is address(0)
if (vars.currentReserveAddress == address(0)) {
  continue; // ❌ This skips HBAR!
}

// AFTER (FIX): Check if dToken exists instead
DataTypes.PoolAssetData storage currentReserve = poolAssets[vars.currentReserveAddress];
if (currentReserve.supplyTokenAddress == address(0)) {
  continue; // ✅ Only skips truly empty slots!
}
```

### 2. fix-pool-configurator-pointer.js

This script:
1. Checks which Pool the PoolConfigurator is pointing to
2. Compares it to the expected new Pool address
3. If different, calls `poolConfigurator.setPool(newPoolAddress)`
4. Verifies the update succeeded

**Why this is needed:**
When Pool was redeployed, PoolAddressesProvider was updated, but PoolConfigurator has its own cached `_pool` variable that still pointed to the old Pool. This caused `finalizeInitAsset()` to fail because it was trying to initialize assets in the wrong Pool!

### 3. reinit-hbar-in-new-pool.js

This script:
1. Reads HBAR asset data from the OLD Pool
2. Calls `poolConfigurator.finalizeInitAsset()` to register HBAR in NEW Pool
3. Configures HBAR as collateral with same parameters (LTV 75%, threshold 80%)
4. Enables borrowing on HBAR
5. Verifies the registration succeeded

**What happens:**
- Copies dToken address (0xac263D2538A40f262DE1ef0820c9D6dC496a6618) to new Pool
- Your 250 HBAR balance in the dToken is preserved
- New Pool now recognizes HBAR and can calculate collateral correctly

---

## After the Fix

Once the decimals is corrected to 8:

✅ **getUserAccountData will return correct values:**
- Total Collateral: ~$20 USD
- Available to Borrow: ~$15 USD (75% LTV)
- Health Factor: ∞ (no debt)

✅ **You'll be able to:**
- See correct collateral values in dashboard
- Borrow against your 250 HBAR
- Withdraw without `0x47bc4b2c` error
- All protocol calculations will work correctly

✅ **UI will display:**
- Your Supplies: 250 HBAR (~$20 USD)
- Available to Borrow: ~$15 USD
- Collateral enabled: YES
- All values updating in real-time

---

## Summary

**What was wrong (discovered through investigation):**
1. ❌ **Decimals bug**: HBAR decimals set to 0 instead of 8
2. ❌ **GenericLogic bug**: Skipped HBAR because it checked `if (assetAddress == address(0))`
3. ❌ **Pool redeployment side effect**: PoolConfigurator pointed to old Pool
4. ❌ **Asset registration lost**: New Pool didn't have HBAR registered

**After running all fix scripts:**
1. ✅ **GenericLogic fixed**: Now checks `supplyTokenAddress` instead of asset address
2. ✅ **Pool redeployed**: New Pool with fixed libraries
3. ✅ **PoolConfigurator updated**: Points to new Pool
4. ✅ **HBAR re-registered**: Asset data copied to new Pool with decimals=8
5. ✅ **getUserAccountData works**: Returns $20 collateral, $15 available to borrow

**Steps to complete the fix:**
```bash
cd contracts/

# Step 3: Fix PoolConfigurator pointer (REQUIRED FIRST!)
npx hardhat run scripts/fix-pool-configurator-pointer.js --network testnet

# Step 4: Re-register HBAR in new Pool
npx hardhat run scripts/reinit-hbar-in-new-pool.js --network testnet

# Step 5: Verify the fix
npx hardhat run scripts/test-oracle-direct.js --network testnet
```

Run the scripts and let me know the output! 🚀
