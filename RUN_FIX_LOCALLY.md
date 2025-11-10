# How to Run the HBAR Decimals Fix Locally

## Problem Summary

The root cause has been identified: **HBAR's decimals is set to 0** in the asset configuration bitmap (should be 8).

This causes:
- `assetUnit = 10^0 = 1` instead of `10^8 = 100,000,000`
- `getUserAccountData` returns all zeros
- Cannot borrow against HBAR
- Incorrect collateral calculations

## The Fix

The `fix-hbar-decimals.js` script has been created to correct this. It needs to be run from your local environment (not the sandboxed Claude Code environment) because it requires:
1. Network access to Hedera testnet RPC
2. Your private key for signing transactions
3. Pool Admin permissions (which your deployer account has)

---

## Step 1: Pull the Latest Code

```bash
git pull origin claude/fix-hedera-contract-revert-011CUvtu98wNjvHAb1WeuAKo
```

This includes:
- `contracts/scripts/fix-hbar-decimals.js` - The fix script
- `contracts/scripts/test-user-config-bits.js` - Diagnostic script (already run)
- `contracts/scripts/test-oracle-direct.js` - Oracle test script (already run)

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

## Step 3: Run the Fix Script

```bash
cd contracts/
npx hardhat run scripts/fix-hbar-decimals.js --network testnet
```

**Expected Output:**

```
🔧 Fixing HBAR Decimals Configuration
============================================================
📍 Contract Addresses:
   Pool: 0x...
   Pool Configurator: 0x...
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

🔧 Setting decimals to 8...

Building new configuration bitmap:
   LTV: 7500
   Liquidation Threshold: 8000
   Liquidation Bonus: 10500
   Decimals: 8 ✅
   Is Active: true
   Is Frozen: false
   Borrowing Enabled: true
   Is Paused: false

New Configuration Bitmap: 0x...

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

============================================================
```

---

## Step 4: Verify the Fix Worked

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
1. Your account has HBAR for gas fees (~0.1 HBAR)
2. You're connected to testnet, not mainnet
3. The contract addresses in `deployment-info.json` are correct

### Issue: "Decimals is already set to 8"

Great! The fix has already been applied. You can skip to Step 4 to verify everything works in the frontend.

---

## What This Fix Does

The script:

1. **Reads** the current HBAR configuration bitmap from the Pool contract
2. **Extracts** all existing values:
   - LTV: 7500 (75%)
   - Liquidation Threshold: 8000 (80%)
   - Liquidation Bonus: 10500 (105%)
   - Is Active: true
   - Borrowing Enabled: true
   - Other flags...
3. **Rebuilds** the bitmap with the **correct decimals value (8)**
4. **Updates** the configuration via `PoolConfigurator.setConfiguration()`
5. **Verifies** the decimals is now 8

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

## Alternative: Frontend-Based Fix

If you can't run Hardhat scripts locally, we can create a frontend interface to call `setConfiguration` via HashPack. Let me know if you'd prefer this approach.

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

**After fix:**
- ✅ Decimals: 8
- ✅ assetUnit: 100,000,000
- ✅ Collateral calculation: CORRECT
- ✅ getUserAccountData: returns $20 collateral, $15 available

Run the script and let me know the output! 🚀
