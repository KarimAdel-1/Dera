# Complete Redeployment Required

## Why Redeploy?

The PoolConfigurator and Pool contracts were deployed BEFORE we fixed the token contracts to handle native HBAR. The deployed contracts are still trying to use the old token implementations that fail on address(0).

## Solution

Run a complete redeployment:

```bash
# 1. Clean and recompile with fixes
cd contracts
npx hardhat clean
npx hardhat compile

# 2. Redeploy everything
npm run deploy

# 3. Create HCS topics
npm run deploy:hcs

# 4. Initialize assets
npm run init:assets
```

## Or Use One Command

```bash
npm run deploy:hackathon
```

This will deploy everything fresh with the fixed token contracts that properly handle:
- **HBAR** (Token ID `0.0.0`) - Native HBAR without HTS association
- **USDC** (Token ID `0.0.429274`) - HTS token with proper association

## What Was Fixed

Both `ConcreteDeraSupplyToken` and `ConcreteDeraBorrowToken` now skip HTS association for native HBAR:

```solidity
function _associateHTS(address asset) private {
    // Skip HTS association for native HBAR (address(0))
    if (asset == address(0)) {
        return;
    }
    // ... HTS logic for actual HTS tokens
}
```
