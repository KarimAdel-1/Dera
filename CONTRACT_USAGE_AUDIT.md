# Dera Protocol - Contract Usage Audit

**Generated:** October 28, 2025
**Total Contracts:** 56

---

## Contract Classification

### ✅ CORE PROTOCOL CONTRACTS (In Active Use)

#### Pool System (3 contracts)
- ✅ **Pool.sol** - Main lending pool contract
- ✅ **PoolStorage.sol** - Storage layout for upgradeable pool
- ✅ **PoolConfigurator.sol** - Admin configuration contract

#### Tokenization (5 contracts)
- ✅ **DeraSupplyToken.sol** - Yield-bearing supply token
- ✅ **DeraBorrowToken.sol** - Non-transferable debt token
- ✅ **IncentivizedERC20.sol** - Base ERC20 with incentives
- ✅ **MintableIncentivizedERC20.sol** - Mintable base token
- ✅ **ScaledBalanceTokenBase.sol** - Scaled balance base

#### Configuration (2 contracts)
- ✅ **PoolAddressesProvider.sol** - Central registry
- ✅ **ACLManager.sol** - Access control manager

#### Logic Libraries (8 contracts)
- ✅ **AssetLogic.sol** - Asset state management
- ✅ **BorrowLogic.sol** - Borrow/repay operations
- ✅ **SupplyLogic.sol** - Supply/withdraw operations
- ✅ **LiquidationLogic.sol** - Liquidation mechanics
- ✅ **ValidationLogic.sol** - Input validation
- ✅ **GenericLogic.sol** - Health factor calculations
- ✅ **PoolLogic.sol** - Pool utility functions
- ✅ **ConfiguratorLogic.sol** - Configuration logic

#### Configuration Libraries (2 contracts)
- ✅ **AssetConfiguration.sol** - Asset bitmap config
- ✅ **UserConfiguration.sol** - User bitmap config

#### Math Libraries (4 contracts)
- ✅ **WadRayMath.sol** - Fixed-point math
- ✅ **PercentageMath.sol** - Percentage calculations
- ✅ **MathUtils.sol** - Interest rate calculations
- ✅ **TokenMath.sol** - Token conversions

#### Helper Libraries (1 contract)
- ✅ **Errors.sol** - Custom error definitions

#### Type Definitions (2 contracts)
- ✅ **DataTypes.sol** - Core data structures
- ✅ **ConfiguratorInputTypes.sol** - Configurator input structs

#### Upgradeability (1 contract)
- ✅ **VersionedInitializable.sol** - Upgrade pattern base

#### Interest Rate Strategy (1 contract)
- ✅ **DefaultReserveInterestRateStrategy.sol** - Standard rate model

**Total Core Contracts: 32**

---

### ⚡ HEDERA-EXCLUSIVE CONTRACTS (Phase 2 - In Active Use)

- ✅ **DeraHCSEventStreamer.sol** - HCS event streaming
- ✅ **DeraNodeStaking.sol** - Node staking for dual yield
- ✅ **DeraInterestRateModel.sol** - Advanced rate model
- ✅ **DeraMirrorNodeAnalytics.sol** - On-chain analytics
- ✅ **DeraProtocolIntegration.sol** - Unified coordinator
- ✅ **DeraDeploymentConfig.sol** - Deployment system

**Total Hedera Contracts: 6**

---

### 🔧 HELPER CONTRACTS (External Tools - Not Imported by Core)

These are **standalone utility contracts** meant to be deployed separately and called by:
- Frontend applications
- Liquidation bots
- Data aggregators
- Analytics services

#### ⚠️ NEEDS FIXING - LiquidationDataProvider.sol
**Purpose:** Helps liquidators find liquidation opportunities
**Status:** Has broken import reference
**Issue:** Imports non-existent `IDeraOracle` (should be `IPriceOracle`)
**Usage:** 0 imports (external tool, not used by core)
**Action Required:** Fix interface import

```solidity
// BROKEN:
import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';

// SHOULD BE:
import {IPriceOracle} from '../../interfaces/IPriceOracle.sol';
```

#### ⚠️ NEEDS FIXING - UiPoolDataProviderV1.sol
**Purpose:** Aggregates all pool data in single call for frontend
**Status:** Has broken import references
**Issues:**
1. Imports non-existent `IDeraOracle` (should be `IPriceOracle`)
2. Imports non-existent `IDefaultInterestRateStrategy` (should be `IReserveInterestRateStrategy`)
**Usage:** 0 imports (external tool, not used by core)
**Action Required:** Fix interface imports

```solidity
// BROKEN:
import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';
import {IDefaultInterestRateStrategy} from '../../interfaces/IDefaultInterestRateStrategy.sol';

// SHOULD BE:
import {IPriceOracle} from '../../interfaces/IPriceOracle.sol';
import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';
```

#### ✅ CORRECT - WalletBalanceProvider.sol
**Purpose:** Batch fetch wallet balances for multiple tokens
**Status:** No issues
**Usage:** 0 imports (external tool, not used by core)
**Action Required:** None - ready for deployment

**Total Helper Contracts: 3 (2 need fixes)**

---

### 🏦 TREASURY CONTRACTS (Revenue Management - Not Used Yet)

#### ⏸️ OPTIONAL - Collector.sol
**Purpose:** Treasury contract for protocol fee management and streaming payments
**Status:** Functional but not integrated
**Usage:** 0 imports (not connected to core protocol)
**Features:**
- Collects protocol revenue
- Supports vesting/streaming payments
- Team/investor token distribution

**Action Required:**
- **Option 1:** Integrate with Pool to route protocol fees
- **Option 2:** Keep for future Phase 4 (governance)
- **Option 3:** Remove if not needed

#### ⏸️ OPTIONAL - ICollector.sol
**Purpose:** Interface for Collector contract
**Status:** Functional
**Usage:** Only used by Collector.sol
**Action Required:** Same as Collector.sol

**Total Treasury Contracts: 2 (optional)**

---

### 🔌 INTERFACE CONTRACTS

#### Core Protocol Interfaces (In Use)
- ✅ **IPool.sol** - Pool interface
- ✅ **IPoolConfigurator.sol** - Configurator interface
- ✅ **IPoolAddressesProvider.sol** - Addresses provider interface
- ✅ **IACLManager.sol** - Access control interface
- ✅ **IDeraSupplyToken.sol** - Supply token interface
- ✅ **IDeraBorrowToken.sol** - Borrow token interface
- ✅ **IInitializableDeraSupplyToken.sol** - Supply token initializer
- ✅ **IInitializableDeraBorrowToken.sol** - Borrow token initializer
- ✅ **IScaledBalanceToken.sol** - Scaled balance interface
- ✅ **IReserveInterestRateStrategy.sol** - Rate strategy interface
- ✅ **IPriceOracle.sol** - Price oracle interface
- ✅ **IPriceOracleGetter.sol** - Price oracle getter interface
- ✅ **IERC20.sol** - ERC20 interface

#### Oracle & External Interfaces (In Use)
- ✅ **DeraOracle.sol** - Oracle implementation (uses Pyth)
- ⚠️ **IPriceOracleSentinel.sol** - Sentinel interface (imported 1x, minimal use)

#### ❌ DEPRECATED INTERFACE - ILendingPool.sol
**Purpose:** Old interface name from Aave codebase
**Status:** Deprecated duplicate of IPool.sol
**Usage:** 0 imports
**Issue:** Has same events as IPool but with old naming
**Action Required:** **DELETE** - Not used, duplicate of IPool.sol

**Total Interfaces: 14 (1 to delete, 1 minimal use)**

---

### 📦 DEPENDENCY CONTRACTS (OpenZeppelin, Gnosis, etc.)

These are in `contracts/dependencies/` and are NOT counted in the 56 contracts above.
All are standard, audited libraries:
- GPv2SafeERC20 (Gnosis)
- SafeERC20, IERC20, Address, Ownable, ReentrancyGuard (OpenZeppelin)

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Core Protocol** | 32 | ✅ All in use |
| **Hedera Features** | 6 | ✅ All in use |
| **Helper Tools** | 3 | ⚠️ 2 need fixes |
| **Treasury** | 2 | ⏸️ Optional |
| **Interfaces** | 14 | ⚠️ 1 to delete |
| **TOTAL** | **57** | **51 used, 2 need fixes, 2 optional, 1 delete** |

---

## Action Items

### 🔴 CRITICAL - Fix Helper Contract Imports

**File:** `contracts/helpers/LiquidationDataProvider.sol`
```diff
- import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';
+ import {IPriceOracle} from '../../interfaces/IPriceOracle.sol';

- IDeraOracle oracle = IDeraOracle(provider.getPriceOracle());
+ IPriceOracle oracle = IPriceOracle(provider.getPriceOracle());
```

**File:** `contracts/helpers/UiPoolDataProviderV1.sol`
```diff
- import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';
+ import {IPriceOracle} from '../../interfaces/IPriceOracle.sol';

- import {IDefaultInterestRateStrategy} from '../../interfaces/IDefaultInterestRateStrategy.sol';
+ import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';

- IDeraOracle oracle = IDeraOracle(provider.getPriceOracle());
+ IPriceOracle oracle = IPriceOracle(provider.getPriceOracle());

- IDefaultInterestRateStrategy(reserveData.interestRateStrategyAddress)
+ IReserveInterestRateStrategy(reserveData.interestRateStrategyAddress)
```

### 🟡 RECOMMENDED - Delete Unused Interface

**File:** `contracts/interfaces/ILendingPool.sol`
- **Status:** Duplicate of IPool.sol
- **Usage:** 0 imports
- **Action:** DELETE

### 🟢 OPTIONAL - Treasury Integration

**Decision Required:** What to do with Treasury contracts?

**Option 1: Integrate Now**
- Connect Collector to Pool.sol
- Route protocol fees to treasury
- Implement streaming payments

**Option 2: Keep for Later**
- Leave contracts as-is
- Integrate in Phase 4 (governance)
- No immediate action

**Option 3: Remove**
- Delete if not needed
- Simpler deployment

---

## Deployment Impact

### Current Status (Before Fixes)

❌ **Will NOT Compile** due to:
- LiquidationDataProvider importing non-existent IDeraOracle
- UiPoolDataProviderV1 importing non-existent IDeraOracle and IDefaultInterestRateStrategy

### After Fixes

✅ **Core Protocol:** 32 contracts ready for deployment
✅ **Hedera Features:** 6 contracts ready for deployment
✅ **Helper Tools:** 3 contracts ready for deployment (after fixes)
⏸️ **Treasury:** 2 contracts optional
❌ **ILendingPool:** Delete before deployment

**Total Deployment:** 41-43 contracts (depending on treasury decision)

---

## Recommendations

### Immediate Actions (Before Testnet)

1. ✅ Fix LiquidationDataProvider imports
2. ✅ Fix UiPoolDataProviderV1 imports
3. ✅ Delete ILendingPool.sol
4. ⏸️ Decide on treasury contracts
5. ✅ Test compilation of all contracts

### Post-Testnet (Before Mainnet)

1. Deploy helper contracts to testnet
2. Test liquidation bot with LiquidationDataProvider
3. Test frontend with UiPoolDataProviderV1
4. Verify all helper tools work correctly
5. If using treasury: integrate and test Collector

---

## Conclusion

**Out of 56 contracts:**
- **38 contracts (67%)** are core protocol + Hedera features - ALL IN ACTIVE USE ✅
- **3 contracts (5%)** are helper tools - 2 NEED FIXES ⚠️
- **14 contracts (25%)** are interfaces - 13 correct, 1 to delete ❌
- **2 contracts (3%)** are treasury - OPTIONAL ⏸️

**Critical Finding:** Helper contracts have broken imports that will prevent compilation.

**After Fixes:** All 41 essential contracts will be ready for deployment!

---

**Report Generated by:** Claude Code
**Date:** October 28, 2025
