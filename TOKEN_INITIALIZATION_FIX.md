# Token Initialization Fix

## Problem
After deploying contracts, no tokens (HBAR, USDC) are initialized, so users can't supply/borrow anything.

## Root Cause
The `deploy-complete.js` script only deploys contracts but **never initializes tokens** by:
1. Deploying dToken and VariableDebtToken contracts
2. Calling `pool.initAsset()` to register them
3. Configuring the asset parameters

## Solution

### Quick Fix (Run This Now)

```bash
cd contracts
npx hardhat run scripts/init-tokens-simple.js --network testnet
```

This will:
1. ✅ Deploy dHBAR and variableDebtHBAR tokens
2. ✅ Initialize them with proper parameters
3. ✅ Register HBAR in the Pool
4. ✅ Configure HBAR (75% LTV, 80% liquidation threshold)
5. ✅ Optionally initialize USDC (if USDC_TOKEN_ADDRESS is set)

### Verify It Worked

```bash
npx hardhat console --network testnet
```

```javascript
const pool = await ethers.getContractAt("DeraPool", "YOUR_POOL_ADDRESS");

// Check HBAR
const hbarData = await pool.getAssetData(ethers.ZeroAddress);
console.log("dHBAR:", hbarData.supplyTokenAddress);
console.log("Debt Token:", hbarData.borrowTokenAddress);

// Check assets list
const assets = await pool.getAssetsList();
console.log("Total assets:", assets.length);
console.log("HBAR included:", assets.includes(ethers.ZeroAddress));
```

### Expected Output

```
dHBAR: 0x... (not 0x0000...)
Debt Token: 0x... (not 0x0000...)
Total assets: 1 (or 2 if USDC added)
HBAR included: true
```

## What Each Token Needs

For a token to work in the protocol, it needs:

1. **dToken** (supply token) - Represents user's supplied balance
2. **VariableDebtToken** - Represents user's borrowed balance
3. **Registration** - Call `pool.initAsset(asset, dToken, debtToken)`
4. **Configuration** - Set LTV, liquidation threshold, decimals, etc.

## Manual Token Addition (For Other Tokens)

To add a new token (e.g., SAUCE):

```javascript
// 1. Deploy tokens
const DToken = await ethers.getContractFactory("DToken");
const dToken = await DToken.deploy(POOL_ADDRESS);
await dToken.waitForDeployment();

const VariableDebtToken = await ethers.getContractFactory("VariableDebtToken");
const debtToken = await VariableDebtToken.deploy(POOL_ADDRESS);
await debtToken.waitForDeployment();

// 2. Initialize
await dToken.initialize(
  POOL_ADDRESS,
  TOKEN_ADDRESS,  // underlying asset
  TREASURY_ADDRESS,
  ethers.ZeroAddress,  // incentives
  DECIMALS,
  "Dera TOKEN",
  "dTOKEN",
  "0x"
);

await debtToken.initialize(
  POOL_ADDRESS,
  TOKEN_ADDRESS,
  ethers.ZeroAddress,
  DECIMALS,
  "Dera Variable Debt TOKEN",
  "variableDebtTOKEN",
  "0x"
);

// 3. Register
const pool = await ethers.getContractAt("DeraPool", POOL_ADDRESS);
await pool.initAsset(TOKEN_ADDRESS, dToken.address, debtToken.address);

// 4. Configure
const config = {
  data: ethers.toBigInt(
    "0x" +
    "0000000000000000" +  // Reserved
    "03E8" +              // Reserve factor = 10%
    "12" +                // Decimals = 18 (adjust as needed)
    "290C" +              // Liquidation bonus = 105%
    "1F40" +              // Liquidation threshold = 80%
    "1D4C" +              // LTV = 75%
    "0000" +              // Reserved
    "1" +                 // Borrowing enabled
    "0" +                 // Not frozen
    "1"                   // Active
  )
};
await pool.setConfiguration(TOKEN_ADDRESS, config);
```

## Configuration Values Explained

```javascript
// LTV (Loan-to-Value): Max borrow amount as % of collateral
"1D4C" = 7500 = 75%

// Liquidation Threshold: When position becomes liquidatable
"1F40" = 8000 = 80%

// Liquidation Bonus: Liquidator's reward
"290C" = 10500 = 105% (5% bonus)

// Reserve Factor: Protocol fee on interest
"03E8" = 1000 = 10%

// Decimals: Token decimals
"08" = 8 (HBAR)
"06" = 6 (USDC)
"12" = 18 (most ERC20s)
```

## Troubleshooting

### "AssetNotListed" Error
- Token not initialized
- Run `init-tokens-simple.js`

### "CallerNotPoolConfigurator" Error
- You're calling `pool.initAsset()` directly
- Only PoolConfigurator or PoolAdmin can call it
- Make sure deployer has PoolAdmin role

### dToken Shows 0x0000...
- Token not initialized yet
- Run initialization script

### Can't Supply HBAR
- HBAR not in assets list
- Check: `pool.getAssetsList()` includes `ethers.ZeroAddress`
- Re-run initialization

## Update Deployment Script (Future)

Add this to `deploy-complete.js` after Pool deployment:

```javascript
// After Pool deployment...

// Initialize HBAR
console.log("📍 Initializing HBAR...");
const DToken = await ethers.getContractFactory("DToken");
const hbarDToken = await DToken.deploy(addresses.POOL);
await hbarDToken.waitForDeployment();

const VariableDebtToken = await ethers.getContractFactory("VariableDebtToken");
const hbarDebtToken = await VariableDebtToken.deploy(addresses.POOL);
await hbarDebtToken.waitForDeployment();

await hbarDToken.initialize(addresses.POOL, ethers.ZeroAddress, deployer.address, ethers.ZeroAddress, 8, "Dera HBAR", "dHBAR", "0x");
await hbarDebtToken.initialize(addresses.POOL, ethers.ZeroAddress, ethers.ZeroAddress, 8, "Dera Variable Debt HBAR", "variableDebtHBAR", "0x");

await pool.initAsset(ethers.ZeroAddress, await hbarDToken.getAddress(), await hbarDebtToken.getAddress());

// Configure HBAR...
```

## Summary

✅ **Run**: `npx hardhat run scripts/init-tokens-simple.js --network testnet`  
✅ **Verify**: Check `pool.getAssetData(ethers.ZeroAddress)`  
✅ **Test**: Try supplying HBAR via frontend or script  

This will fix your "can't issue any token" problem! 🎉
