# Solution: Asset Initialization Issue

## Root Cause
The deployed PoolLogic library contains OLD AssetLogic code that checks:
```solidity
if (asset.supplyTokenAddress != address(0)) revert Errors.AssetAlreadyInitialized();
```

For HBAR (address(0)), an uninitialized asset has `supplyTokenAddress = address(0)`, making it appear already initialized.

## Fix Applied
Changed AssetLogic.init() to check:
```solidity
if (asset.liquidityIndex != 0) revert Errors.AssetAlreadyInitialized();
```

## Why It's Still Failing
Even after recompiling, the deployed Pool contract is linked to a PoolLogic library instance that was compiled with the OLD code. Since AssetLogic functions are `internal`, they get inlined into PoolLogic at compile time.

## Solution
Run a COMPLETE fresh deployment:

```bash
cd contracts

# 1. Delete ALL artifacts
npx hardhat clean
del /Q artifacts\* 2>nul
del /Q cache\* 2>nul

# 2. Delete deployment info
del deployment-info.json

# 3. Recompile from scratch
npx hardhat compile

# 4. Deploy fresh
npm run deploy

# 5. Grant role
npx hardhat run scripts/grant-configurator-role.js --network testnet

# 6. Initialize assets
npm run init:assets
```

This ensures the PoolLogic library is compiled and deployed with the FIXED AssetLogic code.
