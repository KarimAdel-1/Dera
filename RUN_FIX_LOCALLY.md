# How to Run the HBAR Decimals Fix Locally

## Problem Summary

The root cause has been identified: **HBAR's decimals is set to 0** in the asset configuration bitmap (should be 8).

This causes:
- `assetUnit = 10^0 = 1` instead of `10^8 = 100,000,000`
- `getUserAccountData` returns all zeros
- Cannot borrow against HBAR
- Incorrect collateral calculations

## The Solution

We've added a new `setAssetDecimals()` function to the PoolConfigurator that allows updating the decimals configuration. This requires two steps:

1. **Upgrade PoolConfigurator**: Deploy new version with `setAssetDecimals()` function
2. **Fix Decimals**: Call `setAssetDecimals(HBAR, 8)` to update configuration

---

## Step 1: Pull the Latest Code

```bash
git pull origin claude/fix-hedera-contract-revert-011CUvtu98wNjvHAb1WeuAKo
```

This includes:
- `DeraPoolConfigurator.sol` - Now includes `setAssetDecimals()` function
- `upgrade-pool-configurator.js` - Redeploys PoolConfigurator
- `fix-hbar-decimals-simple.js` - Uses new function to fix decimals
- Diagnostic scripts from previous investigation

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

## Step 3: Upgrade PoolConfigurator

This deploys a new PoolConfigurator with the `setAssetDecimals()` function:

```bash
cd contracts/
npx hardhat run scripts/upgrade-pool-configurator.js --network testnet
```

**Expected Output:**

```
🔄 Upgrading PoolConfigurator
============================================================
📍 Current Deployment:
   Deployer: 0x...
   Old PoolConfigurator: 0x...
   PoolAddressesProvider: 0x...
   Account balance: XXX HBAR

📋 Checking Permissions...
   Pool Admin: ✅

============================================================
STEP 1: Deploy New PoolConfigurator
============================================================

📚 Using ConfiguratorLogic library: 0x...
🚀 Deploying new PoolConfigurator...
✅ New PoolConfigurator deployed: 0x...

============================================================
STEP 2: Update PoolAddressesProvider
============================================================

📝 Updating PoolConfigurator address in AddressesProvider...
✅ AddressesProvider updated
   Transaction: 0x...

============================================================
STEP 3: Initialize New PoolConfigurator
============================================================

🔧 Initializing new PoolConfigurator...
✅ New PoolConfigurator initialized
   Transaction: 0x...

============================================================
STEP 4: Verify New PoolConfigurator
============================================================

📊 Verification:
   Registered in AddressesProvider: 0x...
   Matches new deployment: ✅

🔍 Checking for setAssetDecimals function...
   setAssetDecimals available: ✅

============================================================
✅ UPGRADE COMPLETE!
============================================================

📝 Summary:
   Old PoolConfigurator: 0x...
   New PoolConfigurator: 0x...
   Added function: setAssetDecimals(address asset, uint8 decimals)

🎯 Next Steps:
1. Run: npx hardhat run scripts/fix-hbar-decimals-simple.js --network testnet
2. This will use the new setAssetDecimals function to fix HBAR decimals
3. Verify getUserAccountData returns correct values
4. Test frontend to confirm collateral displays correctly
```

---

## Step 4: Fix HBAR Decimals

Now that the upgraded PoolConfigurator is deployed, fix the decimals:

```bash
npx hardhat run scripts/fix-hbar-decimals-simple.js --network testnet
```

**Expected Output:**

```
🔧 Fixing HBAR Decimals Configuration
============================================================
📍 Contract Addresses:
   Pool: 0x...
   Pool Configurator: 0x... (NEW!)
   Deployer: 0x...

📋 Checking Permissions...
   Pool Admin: ✅

============================================================
STEP 1: Check Current Configuration
============================================================

📊 Current Configuration:
   LTV: 7500 basis points (75%)
   Liquidation Threshold: 8000 basis points (80%)
   Liquidation Bonus: 10500 basis points (105%)
   Decimals: 0 ❌ WRONG!

============================================================
STEP 2: Fix Decimals Configuration
============================================================

🔧 Setting decimals to 8 using setAssetDecimals()...

⏳ Waiting for transaction confirmation...
✅ Configuration updated
   Transaction: 0x...

============================================================
STEP 3: Verify New Configuration
============================================================

📊 New Configuration:
   LTV: 7500 basis points (75%)
   Liquidation Threshold: 8000 basis points (80%)
   Decimals: 8 ✅

✅ SUCCESS! Decimals is now set to 8

🎉 getUserAccountData should now return correct values!

Next steps:
1. Refresh your frontend
2. Your collateral should now show as ~$20 USD
3. Available to borrow should show as ~$15 USD
```

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

### Issue: "Decimals is already set to 8"

Great! The fix has already been applied. You can skip to Step 5 to verify everything works in the frontend.

### Issue: "setAssetDecimals is not a function"

This means Step 3 (Upgrade PoolConfigurator) didn't complete successfully. Re-run:
```bash
npx hardhat run scripts/upgrade-pool-configurator.js --network testnet
```

---

## What These Scripts Do

### 1. upgrade-pool-configurator.js

This script:
1. Deploys a new `DeraPoolConfigurator` with the `setAssetDecimals()` function
2. Updates `PoolAddressesProvider` to point to the new configurator
3. Initializes the new configurator (handles Hedera address reuse if needed)
4. Updates `deployment-info.json` to track the upgrade

The new function allows Pool Admin to update decimals:
```solidity
function setAssetDecimals(address asset, uint8 decimals) external onlyPoolAdmin {
  DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
  currentConfig.setDecimals(decimals);
  _pool.setConfiguration(asset, currentConfig);
  emit AssetDecimalsUpdated(asset, decimals);
}
```

### 2. fix-hbar-decimals-simple.js

This script:
1. Reads the current HBAR configuration
2. Verifies decimals is currently 0
3. Calls `poolConfigurator.setAssetDecimals(HBAR, 8)`
4. Verifies the fix worked

This fixes the core calculation in `getUserAccountData`:

```javascript
// Before (decimals = 0):
assetUnit = 10^0 = 1
collateral = (balance × price) / 1 = OVERFLOW or WRONG VALUE

// After (decimals = 8):
assetUnit = 10^8 = 100,000,000
collateral = (25000000000 × 8000000) / 100,000,000 = 2,000,000,000
// = $20.00 USD ✅
```

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

**Current state:**
- ❌ Decimals: 0
- ❌ assetUnit: 1
- ❌ Collateral calculation: BROKEN
- ❌ getUserAccountData: returns zeros

**After upgrade + fix:**
- ✅ PoolConfigurator: Has setAssetDecimals function
- ✅ Decimals: 8
- ✅ assetUnit: 100,000,000
- ✅ Collateral calculation: CORRECT
- ✅ getUserAccountData: returns $20 collateral, $15 available

Run the scripts and let me know the output! 🚀
