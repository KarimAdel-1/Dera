# Asset Initialization Fix

## Problem Identified

The asset initialization was failing because the token contracts (`ConcreteDeraSupplyToken` and `ConcreteDeraBorrowToken`) were trying to call HTS (Hedera Token Service) functions on native HBAR (address `0x0000000000000000000000000000000000000000`), which caused the transaction to revert.

## Root Cause

In both token contracts, the `_associateHTS()` function was calling:
```solidity
IHederaTokenService.isToken(asset)
```

For native HBAR (address(0)), this call fails because HBAR is not an HTS token - it's the native cryptocurrency of Hedera.

## Fix Applied

Added a check to skip HTS association for native HBAR:

```solidity
function _associateHTS(address asset) private {
    // Skip HTS association for native HBAR (address(0))
    if (asset == address(0)) {
        return;
    }
    // ... rest of HTS logic
}
```

This fix was applied to:
- `contracts/contracts/protocol/tokenization/ConcreteDeraSupplyToken.sol`
- `contracts/contracts/protocol/tokenization/ConcreteDeraBorrowToken.sol`

## Solution

Since the contracts have been fixed and recompiled, you need to **redeploy the entire protocol** to use the new token implementations:

```bash
cd contracts
npx hardhat clean
npx hardhat compile
npm run deploy
```

Then initialize the assets:

```bash
npm run init:assets
```

## Token IDs Being Used

- **HBAR**: Token ID `0.0.0` (Native) → EVM Address `0x0000000000000000000000000000000000000000`
- **USDC**: Token ID `0.0.429274` → EVM Address `0x0000000000000000000000000000000000068cda`

## What the Initialization Does

1. **Deploy token implementations** (dToken and vToken) for each asset
2. **Create token proxies** via `PoolConfigurator.initAssets()`
3. **Register assets in Pool** via `PoolConfigurator.finalizeInitAsset()`
4. **Configure collateral parameters** (LTV, liquidation threshold, bonus)
5. **Activate assets** for supply and borrowing

## Verification

After successful initialization, you can verify:

```bash
# Check assets in pool
npx hardhat console --network testnet
> const pool = await ethers.getContractAt("DeraPool", "POOL_ADDRESS")
> await pool.getAssetsList()
> await pool.getAssetData(ethers.ZeroAddress) // HBAR
> await pool.getAssetData("0x0000000000000000000000000000000000068cda") // USDC
```

## Next Steps

1. Redeploy the protocol with fixed contracts
2. Run `npm run init:assets` to initialize HBAR and USDC
3. Update frontend `.env.local` with new contract addresses
4. Test supply/borrow functionality in the frontend
