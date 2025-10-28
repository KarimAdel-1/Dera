# Dera Protocol - Deployment Scripts

Comprehensive deployment and management scripts for Dera Protocol on Hedera.

## Overview

This directory contains scripts for:
- **Multi-asset deployment**: Deploy and configure multiple assets at once
- **Asset management**: Add or remove individual assets
- **Asset verification**: Verify correct configuration of deployed assets
- **Configuration management**: Manage asset parameters across networks

## Directory Structure

```
scripts/
├── config/
│   ├── assets.json           # Asset configurations (testnet/mainnet)
│   └── deployments.json      # Deployment state (auto-generated)
├── deploy/
│   ├── deployMultiAssets.js  # Deploy multiple assets
│   └── manageAsset.js        # Add/remove single asset
├── verify/
│   └── verifyAssets.js       # Verify asset configurations
└── README.md                 # This file
```

## Asset Configuration

### Configuration File: `config/assets.json`

Defines parameters for each supported asset on testnet and mainnet:

```json
{
  "testnet": {
    "HBAR": {
      "name": "Hedera",
      "symbol": "HBAR",
      "decimals": 8,
      "address": "0x0000000000000000000000000000000000000000",
      "isNative": true,
      "pyth_price_feed": "0xff61491...",
      "ltv": 7500,
      "liquidationThreshold": 8000,
      "liquidationBonus": 10500,
      "reserveFactor": 1000,
      "borrowCap": "10000000000000000",
      "supplyCap": "20000000000000000",
      "borrowEnabled": true,
      "stableBorrowRateEnabled": false,
      "optimalUtilizationRate": "0.8",
      "baseVariableBorrowRate": "0",
      "variableRateSlope1": "0.04",
      "variableRateSlope2": "0.6"
    }
  }
}
```

### Parameter Definitions

| Parameter | Description | Format | Example |
|-----------|-------------|--------|---------|
| `name` | Asset full name | String | "USD Coin" |
| `symbol` | Asset symbol | String | "USDC" |
| `decimals` | Token decimals | Number | 6 |
| `address` | Token address on Hedera | String | "0.0.456858" |
| `isNative` | Is native HBAR | Boolean | false |
| `pyth_price_feed` | Pyth price feed ID | Hex String | "0xff614..." |
| `ltv` | Loan-to-Value (basis points) | Number | 7500 (75%) |
| `liquidationThreshold` | Liquidation threshold (bps) | Number | 8000 (80%) |
| `liquidationBonus` | Liquidation bonus (bps) | Number | 10500 (105%) |
| `reserveFactor` | Reserve factor (bps) | Number | 1000 (10%) |
| `borrowCap` | Max borrow amount | String | "10000000000000000" |
| `supplyCap` | Max supply amount | String | "20000000000000000" |
| `borrowEnabled` | Allow borrowing | Boolean | true |
| `stableBorrowRateEnabled` | Allow stable rate borrowing | Boolean | false |
| `optimalUtilizationRate` | Optimal utilization | String | "0.8" (80%) |
| `baseVariableBorrowRate` | Base borrow rate | String | "0" |
| `variableRateSlope1` | Rate slope 1 | String | "0.04" (4%) |
| `variableRateSlope2` | Rate slope 2 | String | "0.6" (60%) |

### Supported Assets

#### Testnet
- **HBAR**: Native Hedera token
- **USDC**: USD Coin stablecoin
- **USDT**: Tether USD stablecoin
- **HBARX**: Stader liquid staked HBAR
- **SAUCE**: SaucerSwap governance token

#### Mainnet
- **HBAR**: Native Hedera token
- **USDC**: USD Coin stablecoin
- **USDT**: Tether USD stablecoin
- **HBARX**: Stader liquid staked HBAR

## Usage

### Prerequisites

1. Core contracts must be deployed first:
   - Pool
   - PoolConfigurator
   - DeraOracle
   - PoolAddressesProvider

2. Environment setup:
   ```bash
   # Install dependencies
   cd contracts
   npm install

   # Configure Hardhat network
   # Edit hardhat.config.js with your network settings
   ```

### 1. Deploy Multiple Assets

Deploys and configures all assets defined in `config/assets.json`:

```bash
# Testnet deployment
npx hardhat run scripts/deploy/deployMultiAssets.js --network testnet

# Mainnet deployment (use with caution!)
npx hardhat run scripts/deploy/deployMultiAssets.js --network mainnet
```

**What it does:**
1. Reads asset configurations from `config/assets.json`
2. For each asset:
   - Configures Pyth price feed in Oracle
   - Deploys dToken (aToken equivalent)
   - Deploys Stable Debt Token
   - Deploys Variable Debt Token
   - Deploys Interest Rate Strategy
   - Initializes asset in Pool
   - Configures parameters (LTV, liquidation, caps, etc.)
   - Enables borrowing if configured
3. Saves deployment info to `config/deployments.json`
4. Prints summary of deployed assets

**Output:**
```
============================================================
🚀 Dera Protocol - Multi-Asset Deployment
============================================================
Network: testnet
Deployer: 0x...
Balance: 1000 HBAR

Found 5 assets to configure:
  - Hedera (HBAR)
  - USD Coin (USDC)
  - Tether USD (USDT)
  - Stader HBARX (HBARX)
  - SaucerSwap (SAUCE)

Core contracts:
  Pool: 0x...
  PoolConfigurator: 0x...
  Oracle: 0x...

Initializing assets...

--- HBAR ---
  Setting Pyth price feed...
  ✓ Price feed configured
  Deploying dToken...
  ✓ dToken deployed: 0x...
  Deploying Stable Debt Token...
  ✓ Stable Debt Token deployed: 0x...
  Deploying Variable Debt Token...
  ✓ Variable Debt Token deployed: 0x...
  Deploying Interest Rate Strategy...
  ✓ Interest Rate Strategy deployed: 0x...
  Initializing asset in Pool...
  ✓ Asset initialized in Pool
  Configuring asset parameters...
    ✓ LTV: 75%
    ✓ Liquidation Threshold: 80%
    ✓ Liquidation Bonus: 105%
    ✓ Reserve Factor: 10%
    ✓ Borrow Cap: 10000000000000000
    ✓ Supply Cap: 20000000000000000
    ✓ Borrowing enabled
✅ HBAR deployment complete!

[... continues for each asset ...]

============================================================
✅ Multi-Asset Deployment Complete!
============================================================

Deployed Assets:
  HBAR: 0x0000000000000000000000000000000000000000
  USDC: 0.0.456858
  USDT: 0.0.456858
  HBARX: 0.0.731861
  SAUCE: 0.0.731861
```

### 2. Add/Remove Individual Assets

Manage single assets without redeploying everything:

```bash
# Add a new asset
npx hardhat run scripts/deploy/manageAsset.js --network testnet
```

**Customize the script:**

```javascript
// Edit manageAsset.js

// To add an asset:
const symbolToAdd = "USDC";  // Change this to your desired asset

// To remove an asset (uncomment):
// await removeAsset("SAUCE", assets.SAUCE.address, poolConfigurator);
```

**Adding a new asset:**
1. Add asset configuration to `config/assets.json`
2. Edit `manageAsset.js` with the symbol
3. Run the script
4. Asset will be deployed and configured

**Removing an asset:**
1. Edit `manageAsset.js` and uncomment the `removeAsset` call
2. Run the script
3. Asset will be disabled (borrowing disabled, asset frozen)
4. Existing positions remain active for repay/withdraw

### 3. Verify Asset Configuration

Verify that all assets are correctly configured:

```bash
# Verify all assets
npx hardhat run scripts/verify/verifyAssets.js --network testnet
```

**What it checks:**
- Asset exists in Pool
- dToken, Stable Debt Token, Variable Debt Token addresses match
- Oracle price is available and non-zero
- Interest rates are set correctly
- Configuration parameters
- Last update timestamp (freshness)

**Output:**
```
============================================================
🔍 Dera Protocol - Asset Verification
============================================================
Network: testnet

Core contracts:
  Pool: 0x...
  PoolConfigurator: 0x...
  Oracle: 0x...

--- Verifying HBAR ---
✓ Asset exists in pool
✓ Asset data retrieved
✓ dToken matches: 0x...
✓ Stable debt token matches
✓ Variable debt token matches
✓ Configuration bitmap: 12345...
✓ Oracle price: 0.05 USD
✓ Liquidity Rate: 0.0234
✓ Borrow Rate: 0.0456
✓ Last updated: 30 seconds ago

--- Verifying USDC ---
[... continues for each asset ...]

============================================================
📊 Verification Summary
============================================================

HBAR:
  ✅ No errors
USDC:
  ✅ No errors
  ⚠️  Warnings: 1
     - Oracle price is 0
USDT:
  ❌ Errors: 1
     - dToken mismatch: 0x... !== 0x...

============================================================
Total Errors: 1
Total Warnings: 1

❌ Verification failed with errors
```

## Interest Rate Model

The interest rate model is based on utilization rate:

```
Utilization = Total Borrows / Total Supply

If Utilization <= Optimal Utilization:
  Borrow Rate = Base Rate + (Utilization / Optimal) * Slope1

If Utilization > Optimal Utilization:
  Borrow Rate = Base Rate + Slope1 + ((Utilization - Optimal) / (1 - Optimal)) * Slope2
```

### Example: USDC Stablecoin

```json
{
  "optimalUtilizationRate": "0.9",      // 90%
  "baseVariableBorrowRate": "0",        // 0%
  "variableRateSlope1": "0.04",         // 4%
  "variableRateSlope2": "0.75"          // 75%
}
```

**Rate at different utilization levels:**
- 0% utilization: 0% borrow rate
- 45% utilization: 2% borrow rate
- 90% utilization (optimal): 4% borrow rate
- 95% utilization: 41.5% borrow rate
- 100% utilization: 79% borrow rate

This creates strong incentives to keep utilization near optimal.

## Risk Parameters

### Loan-to-Value (LTV)

Maximum % of collateral value that can be borrowed:
- **USDC/USDT**: 80% (stablecoins = safest)
- **HBAR**: 75% (native token, good liquidity)
- **HBARX**: 70% (liquid staking derivative, slightly riskier)
- **SAUCE**: 65% (governance token, more volatile)

### Liquidation Threshold

Collateral must stay above this % or position gets liquidated:
- **USDC/USDT**: 85% (5% buffer above LTV)
- **HBAR**: 80% (5% buffer)
- **HBARX**: 75% (5% buffer)
- **SAUCE**: 70% (5% buffer)

### Liquidation Bonus

Liquidators receive this bonus (incentive to liquidate):
- **Most assets**: 105% (5% bonus)
- **HBARX**: 110% (10% bonus, higher risk)
- **SAUCE**: 115% (15% bonus, highest risk)

### Borrow/Supply Caps

Limits on total amount to prevent concentration risk:
- Set based on liquidity and risk assessment
- Can be updated by governance
- Testnet caps are lower than mainnet

## Adding a New Asset

### Step 1: Add to Configuration

Edit `config/assets.json`:

```json
{
  "testnet": {
    "NEWTOKEN": {
      "name": "New Token",
      "symbol": "NEWTOKEN",
      "decimals": 18,
      "address": "0.0.999999",
      "isNative": false,
      "pyth_price_feed": "0x...",
      "ltv": 7000,
      "liquidationThreshold": 7500,
      "liquidationBonus": 11000,
      "reserveFactor": 1500,
      "borrowCap": "1000000000000000000",
      "supplyCap": "5000000000000000000",
      "borrowEnabled": true,
      "stableBorrowRateEnabled": false,
      "optimalUtilizationRate": "0.8",
      "baseVariableBorrowRate": "0",
      "variableRateSlope1": "0.05",
      "variableRateSlope2": "0.8"
    }
  }
}
```

### Step 2: Deploy

Option A: Deploy with all assets
```bash
npx hardhat run scripts/deploy/deployMultiAssets.js --network testnet
```

Option B: Deploy individually
```bash
# Edit manageAsset.js to use "NEWTOKEN"
npx hardhat run scripts/deploy/manageAsset.js --network testnet
```

### Step 3: Verify

```bash
npx hardhat run scripts/verify/verifyAssets.js --network testnet
```

### Step 4: Test

Test the new asset:
```bash
# Supply some tokens
# Borrow against collateral
# Check rates and utilization
# Verify oracle prices
```

## Deployment State

The `config/deployments.json` file tracks all deployments:

```json
{
  "testnet": {
    "Pool": "0x...",
    "PoolConfigurator": "0x...",
    "DeraOracle": "0x...",
    "assets": {
      "HBAR": {
        "address": "0x0000000000000000000000000000000000000000",
        "dToken": "0x...",
        "stableDebtToken": "0x...",
        "variableDebtToken": "0x...",
        "interestRateStrategy": "0x...",
        "timestamp": "2024-01-15T12:00:00.000Z"
      }
    }
  }
}
```

This file is:
- Auto-generated by deployment scripts
- Used by verification scripts
- Required for asset management
- Committed to git (but can be excluded if sensitive)

## Best Practices

### For Testnet

1. **Test one asset at a time** when adding new configurations
2. **Verify after each deployment** to catch issues early
3. **Use lower caps** to limit exposure during testing
4. **Monitor oracle prices** - testnet oracles may be less reliable

### For Mainnet

1. **Deploy during low activity** to save on fees
2. **Start with conservative parameters** (lower LTV, higher liquidation bonus)
3. **Gradually increase caps** based on demand and risk assessment
4. **Have emergency pause plan** ready before deployment
5. **Multi-sig for PoolConfigurator** to prevent single-point-of-failure
6. **Verify extensively** before announcing to users

### Security Considerations

1. **Oracle reliability**: Verify Pyth price feeds are active and accurate
2. **Parameter tuning**: Conservative parameters initially, adjust based on data
3. **Liquidity depth**: Ensure sufficient DEX liquidity for liquidations
4. **Admin keys**: Use multi-sig for all administrative functions
5. **Emergency procedures**: Test pause functionality before mainnet
6. **Rate limits**: Set reasonable borrow/supply caps
7. **Monitoring**: Watch for unusual activity or parameter drift

## Troubleshooting

### Issue: "Pool not deployed"
**Solution**: Deploy core contracts first before running multi-asset deployment

### Issue: "Oracle price is 0"
**Solution**:
- Check that Pyth price feed ID is correct
- Ensure Pyth price feed is active on Hedera
- Verify Oracle contract has proper permissions

### Issue: "Transaction reverted"
**Solution**:
- Check deployer has sufficient HBAR balance
- Verify all contract addresses are correct
- Ensure deployer has admin rights on PoolConfigurator

### Issue: "Asset already exists"
**Solution**:
- Check `deployments.json` for existing deployment
- Use `manageAsset.js` to remove asset first if needed
- Or skip the asset in configuration

### Issue: "Interest rates seem wrong"
**Solution**:
- Rates are in ray format (27 decimals)
- Check utilization rate calculation
- Verify optimal utilization and slopes are correct

## Development

### Testing Locally

```bash
# Start Hardhat node
npx hardhat node

# Deploy to local network
npx hardhat run scripts/deploy/deployMultiAssets.js --network localhost
```

### Adding Custom Scripts

Create new scripts in `scripts/` directory:

```javascript
// scripts/custom/myScript.js
const hre = require("hardhat");

async function main() {
  // Your custom logic
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Run with:
```bash
npx hardhat run scripts/custom/myScript.js --network testnet
```

## Contributing

When adding new assets or features:

1. Update `assets.json` with new configurations
2. Test thoroughly on testnet first
3. Update this README with new instructions
4. Verify deployment with `verifyAssets.js`
5. Document any edge cases or special considerations

## Support

For issues or questions:
- GitHub Issues: https://github.com/dera-protocol/issues
- Discord: https://discord.gg/dera
- Documentation: https://docs.deraprotocol.com

## License

MIT
