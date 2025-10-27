# Dera Protocol - Smart Contracts List

**Total Contracts: 59 files**

---

## 📁 Helpers (3 files)

| File | Description |
|------|-------------|
| `LiquidationDataProvider.sol` | Finds liquidatable positions for liquidation bots |
| `UiPoolDataProviderV1.sol` | Aggregates pool data for frontend in single call |
| `WalletBalanceProvider.sol` | Batch balance queries for multiple users and tokens |

---

## 🔌 Interfaces (15 files)

| File | Description |
|------|-------------|
| `IACLManager.sol` | Access control interface for protocol roles |
| `IDToken.sol` | Interface for interest-bearing deposit tokens |
| `IERC20.sol` | Standard ERC20 token interface |
| `IERC20WithPermit.sol` | ERC20 with gasless approval support |
| `IInitializableDebtToken.sol` | Interface for initializing debt tokens |
| `IInitializableDToken.sol` | Interface for initializing deposit tokens |
| `ILendingPool.sol` | Legacy lending pool interface |
| `IPool.sol` | Main pool interface for lending/borrowing |
| `IPoolAddressesProvider.sol` | Interface for protocol addresses registry |
| `IPoolConfigurator.sol` | Interface for pool configuration management |
| `IPriceOracle.sol` | Interface for price oracle |
| `IPriceOracleGetter.sol` | Interface for getting asset prices |
| `IPriceOracleSentinel.sol` | Interface for oracle health monitoring |
| `IReserveInterestRateStrategy.sol` | Interface for interest rate calculation |
| `IScaledBalanceToken.sol` | Interface for scaled balance tokens |
| `IVariableDebtToken.sol` | Interface for variable rate debt tokens |

---

## 🔧 Misc (3 files)

| File | Description |
|------|-------------|
| `DefaultReserveInterestRateStrategy.sol` | Dynamic interest rate model based on utilization |
| `DeraOracle.sol` | Pyth Network oracle integration for price feeds |
| `dera-upgradeability/VersionedInitializable.sol` | Base contract for upgradeable proxy pattern |

---

## 📊 Monitoring (2 files)

| File | Description |
|------|-------------|
| `AnalyticsDashboard.sol` | Protocol analytics and metrics aggregation |
| `ProtocolMonitor.sol` | Real-time monitoring and alert system |

---

## ⚙️ Protocol Configuration (2 files)

| File | Description |
|------|-------------|
| `ACLManager.sol` | Role-based access control management |
| `PoolAddressesProvider.sol` | Central registry for protocol addresses |

---

## 📚 Protocol Libraries - Configuration (3 files)

| File | Description |
|------|-------------|
| `EModeConfiguration.sol` | Efficiency mode configuration library |
| `ReserveConfiguration.sol` | Reserve parameters configuration library |
| `UserConfiguration.sol` | User collateral/borrow configuration library |

---

## 📚 Protocol Libraries - Helpers (2 files)

| File | Description |
|------|-------------|
| `Errors.sol` | Custom error definitions for gas efficiency |
| `TokenMath.sol` | Scaled balance calculations for interest accrual |

---

## 📚 Protocol Libraries - Logic (10 files)

| File | Description |
|------|-------------|
| `BorrowLogic.sol` | Borrow and repay execution logic |
| `ConfiguratorLogic.sol` | Pool configuration logic |
| `EModeLogic.sol` | Efficiency mode execution logic |
| `GenericLogic.sol` | Generic calculations for health factor and LTV |
| `IsolationModeLogic.sol` | Isolation mode execution logic |
| `LiquidationLogic.sol` | Liquidation execution logic |
| `PoolLogic.sol` | Core pool operations logic |
| `ReserveLogic.sol` | Reserve state updates and interest accrual |
| `SupplyLogic.sol` | Supply and withdraw execution logic |
| `ValidationLogic.sol` | Input validation and safety checks |

---

## 📚 Protocol Libraries - Math (3 files)

| File | Description |
|------|-------------|
| `MathUtils.sol` | Compound interest calculations |
| `PercentageMath.sol` | Percentage calculations with precision |
| `WadRayMath.sol` | High-precision math for interest rates |

---

## 📚 Protocol Libraries - Types (2 files)

| File | Description |
|------|-------------|
| `ConfiguratorInputTypes.sol` | Input types for pool configuration |
| `DataTypes.sol` | Core data structures for protocol |

---

## 🏊 Protocol Pool (3 files)

| File | Description |
|------|-------------|
| `Pool.sol` | Main entry point for lending/borrowing operations |
| `PoolConfigurator.sol` | Pool configuration and reserve management |
| `PoolStorage.sol` | Storage layout for pool state variables |

---

## 🪙 Protocol Tokenization (3 files)

| File | Description |
|------|-------------|
| `DToken.sol` | Interest-bearing deposit token implementation |
| `VariableDebtToken.sol` | Variable rate debt token implementation |
| `base/IncentivizedERC20.sol` | Base ERC20 with rewards integration |
| `base/MintableIncentivizedERC20.sol` | Mintable ERC20 with rewards |
| `base/ScaledBalanceTokenBase.sol` | Base for scaled balance tokens |

---

## 🎁 Rewards (1 file)

| File | Description |
|------|-------------|
| `RewardsController.sol` | Liquidity mining rewards distribution |

---

## 💰 Treasury (4 files)

| File | Description |
|------|-------------|
| `Collector.sol` | Protocol fee collection and vesting |
| `ICollector.sol` | Interface for treasury collector |
| `IRevenueSplitter.sol` | Interface for revenue splitting |
| `RevenueSplitter.sol` | Automated revenue distribution |

---

## 📊 Summary by Category

| Category | Files | Purpose |
|----------|-------|---------|
| **Helpers** | 3 | Frontend data aggregation |
| **Interfaces** | 15 | Contract interfaces |
| **Misc** | 3 | Oracle, interest rates, upgradeability |
| **Monitoring** | 2 | Analytics and monitoring |
| **Configuration** | 2 | Access control and addresses |
| **Libraries - Config** | 3 | Configuration management |
| **Libraries - Helpers** | 2 | Errors and math helpers |
| **Libraries - Logic** | 10 | Core business logic |
| **Libraries - Math** | 3 | Mathematical operations |
| **Libraries - Types** | 2 | Data structures |
| **Pool** | 3 | Main pool contracts |
| **Tokenization** | 5 | Token implementations |
| **Rewards** | 1 | Incentives system |
| **Treasury** | 4 | Fee management |

---

## 🔑 Key Contracts

**Most Important:**
1. `Pool.sol` - Main protocol entry point
2. `DToken.sol` - Interest-bearing deposit tokens
3. `VariableDebtToken.sol` - Debt tracking
4. `DeraOracle.sol` - Price feeds
5. `RewardsController.sol` - Liquidity mining

**Core Logic:**
1. `SupplyLogic.sol` - Supply/withdraw
2. `BorrowLogic.sol` - Borrow/repay
3. `LiquidationLogic.sol` - Liquidations
4. `ValidationLogic.sol` - Safety checks
5. `ReserveLogic.sol` - Interest accrual

**Configuration:**
1. `PoolConfigurator.sol` - Reserve management
2. `ACLManager.sol` - Access control
3. `PoolAddressesProvider.sol` - Address registry

---

**Total Lines of Code: ~10,000+ LOC**
**Solidity Version: ^0.8.19**
**License: MIT**

---

*Dera Protocol - Built on Hedera Hashgraph*
