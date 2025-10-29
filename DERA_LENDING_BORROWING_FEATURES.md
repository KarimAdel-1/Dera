# Dera Protocol - Lending & Borrowing Features

**Complete Feature Documentation Based on Smart Contracts**

---

## 🏦 Core Lending Features

### 1. **Supply (Deposit)**
**Contract**: `Pool.sol` → `supply()`

**What it does:**
- Users deposit assets (HBAR, USDC) into the pool
- Receive interest-bearing dTokens (e.g., deposit USDC → get dUSDC)
- dTokens automatically accrue interest over time
- Can supply on behalf of another address

**Key Features:**
- ✅ Instant deposits via HTS (Hedera Token Service)
- ✅ Automatic interest accrual (compounding every second)
- ✅ Referral tracking for rewards
- ✅ Supply on behalf of others
- ✅ No minimum deposit amount
- ✅ Reentrancy protection

**User Flow:**
```
1. User approves token → Pool contract
2. User calls supply(USDC, 1000, userAddress, 0)
3. Pool transfers 1000 USDC from user
4. Pool mints 1000 dUSDC to user
5. dUSDC balance grows automatically with interest
```

---

### 2. **Withdraw**
**Contract**: `Pool.sol` → `withdraw()`

**What it does:**
- Users withdraw their supplied assets + earned interest
- Burns dTokens and returns underlying assets
- Can withdraw partial or full amount
- Checks health factor before withdrawal (if used as collateral)

**Key Features:**
- ✅ Withdraw anytime (no lock-up period)
- ✅ Partial withdrawals allowed
- ✅ Automatic interest calculation
- ✅ Health factor protection (prevents liquidation)
- ✅ Withdraw to any address

**User Flow:**
```
1. User has 1010 dUSDC (1000 principal + 10 interest)
2. User calls withdraw(USDC, 1010, userAddress)
3. Pool burns 1010 dUSDC
4. Pool transfers 1010 USDC to user
5. User receives principal + interest
```

---

### 3. **Enable/Disable Collateral**
**Contract**: `Pool.sol` → `setUserUseReserveAsCollateral()`

**What it does:**
- Toggle whether supplied assets can be used as collateral for borrowing
- Enables borrowing power when enabled
- Reduces liquidation risk when disabled

**Key Features:**
- ✅ One-click toggle per asset
- ✅ Instant effect on borrowing power
- ✅ Health factor validation before disabling
- ✅ Prevents accidental liquidation

**User Flow:**
```
1. User supplies 1000 USDC
2. User calls setUserUseReserveAsCollateral(USDC, true)
3. User can now borrow against USDC
4. Borrowing power increases based on LTV (e.g., 80% = $800)
```

---

## 💰 Core Borrowing Features

### 4. **Borrow**
**Contract**: `Pool.sol` → `borrow()`

**What it does:**
- Users borrow assets against their collateral
- Debt accrues interest over time (variable rate)
- Must maintain health factor > 1.0 to avoid liquidation
- Can borrow on behalf of another address (with approval)

**Key Features:**
- ✅ Variable interest rate (adjusts based on utilization)
- ✅ Multiple assets as collateral
- ✅ Instant borrowing (no approval process)
- ✅ Borrow on behalf of others (credit delegation)
- ✅ Referral tracking
- ✅ Oracle-based collateral valuation

**User Flow:**
```
1. User has $1000 USDC as collateral (LTV 80%)
2. User can borrow up to $800 worth of assets
3. User calls borrow(HBAR, 500, 2, 0, userAddress)
4. Pool checks health factor > 1.0
5. Pool transfers 500 HBAR to user
6. User's debt starts accruing interest
```

**Borrowing Limits:**
- LTV (Loan-to-Value): 65-80% depending on asset
- Liquidation Threshold: 80-85%
- Health Factor must stay > 1.0

---

### 5. **Repay**
**Contract**: `Pool.sol` → `repay()`

**What it does:**
- Users repay borrowed assets + accrued interest
- Reduces debt and improves health factor
- Can repay partial or full amount
- Can repay on behalf of another user

**Key Features:**
- ✅ Partial repayments allowed
- ✅ Repay on behalf of others
- ✅ Automatic interest calculation
- ✅ No prepayment penalty
- ✅ Instant health factor improvement

**User Flow:**
```
1. User borrowed 500 HBAR, now owes 510 HBAR (with interest)
2. User calls repay(HBAR, 510, 2, userAddress)
3. Pool transfers 510 HBAR from user
4. Pool burns 510 variableDebtHBAR tokens
5. User's debt is cleared
```

---

### 6. **Repay with dTokens**
**Contract**: `Pool.sol` → `repayWithDTokens()`

**What it does:**
- Repay debt using your supplied assets (dTokens)
- No need to withdraw first
- Saves gas and transaction steps

**Key Features:**
- ✅ One-step repayment
- ✅ Uses your dToken balance directly
- ✅ Saves gas fees
- ✅ Maintains health factor

**User Flow:**
```
1. User has 1000 dUSDC supplied
2. User owes 500 USDC debt
3. User calls repayWithDTokens(USDC, 500, 2)
4. Pool burns 500 dUSDC
5. Pool burns 500 variableDebtUSDC
6. User's debt cleared without withdrawing
```

---

## 🛡️ Risk Management Features

### 7. **Liquidation**
**Contract**: `Pool.sol` → `liquidationCall()`

**What it does:**
- Liquidators repay part of a borrower's debt
- Receive borrower's collateral at a discount (liquidation bonus)
- Protects protocol from bad debt
- Triggered when health factor < 1.0

**Key Features:**
- ✅ Automated liquidation protection
- ✅ 5% liquidation bonus for liquidators
- ✅ Partial liquidations (max 50% of debt)
- ✅ Receive collateral as dTokens or underlying
- ✅ Oracle-based price validation

**Liquidation Flow:**
```
1. Borrower's health factor drops to 0.95 (< 1.0)
2. Liquidator calls liquidationCall(USDC, HBAR, borrower, 500, false)
3. Liquidator repays 500 HBAR debt
4. Liquidator receives $525 worth of USDC (5% bonus)
5. Borrower's health factor improves
```

**Liquidation Thresholds:**
- Health Factor < 1.0 = Liquidatable
- Max Liquidation: 50% of debt per transaction
- Liquidation Bonus: 5-10% depending on asset

---

### 8. **Health Factor Monitoring**
**Contract**: `Pool.sol` → `getUserAccountData()`

**What it does:**
- Real-time calculation of user's financial health
- Prevents liquidation by monitoring collateral vs debt
- Updates automatically with price changes

**Key Metrics:**
- **Total Collateral**: USD value of all collateral
- **Total Debt**: USD value of all borrowed assets
- **Available Borrows**: How much more you can borrow
- **Health Factor**: Collateral / Debt ratio
- **LTV**: Current loan-to-value ratio

**Health Factor Formula:**
```
Health Factor = (Collateral × Liquidation Threshold) / Total Debt

Example:
- Collateral: $1000 USDC (85% threshold)
- Debt: $800 HBAR
- Health Factor = ($1000 × 0.85) / $800 = 1.06

If HF < 1.0 → Liquidatable
If HF > 1.0 → Safe
```

---

## 🚀 Advanced Features

### 9. **E-Mode (Efficiency Mode)**
**Contract**: `Pool.sol` → `setUserEMode()`

**What it does:**
- Higher LTV for correlated assets (e.g., stablecoins)
- Allows more efficient capital usage
- Reduces liquidation risk for similar assets

**Key Features:**
- ✅ Up to 97% LTV for stablecoins
- ✅ Lower liquidation risk
- ✅ Higher borrowing power
- ✅ Category-based (Stablecoins, ETH-correlated, etc.)

**E-Mode Categories:**
```
Category 1: Stablecoins (USDC)
- LTV: 97%
- Liquidation Threshold: 98%
- Liquidation Bonus: 2%

Category 2: Native (HBAR)
- LTV: 80%
- Liquidation Threshold: 85%
- Liquidation Bonus: 5%
```

**User Flow:**
```
1. User supplies USDC as collateral
2. User calls setUserEMode(1) // Stablecoin category
3. User can now borrow up to 97% LTV instead of 80%
4. User borrows $970 USDC against $1000 USDC
```

---

### 10. **Isolation Mode**
**Contract**: `Pool.sol` → Automatic via `ReserveConfiguration`

**What it does:**
- Limits exposure to new/risky assets
- Isolated assets can only be used as collateral alone
- Protects protocol from volatile asset risk

**Key Features:**
- ✅ Debt ceiling per isolated asset
- ✅ Cannot mix with other collateral
- ✅ Gradual onboarding of new assets
- ✅ Risk containment

**Example:**
```
New Asset: TokenX (Isolated)
- Debt Ceiling: $1M
- LTV: 50%
- User can ONLY use TokenX as collateral (no mixing with USDC)
- Total borrows against TokenX capped at $1M
```

---

### 11. **Flash Loans** *(Implied via PoolLogic)*
**Contract**: `PoolLogic.sol` → Flash loan logic

**What it does:**
- Borrow any amount without collateral
- Must repay within same transaction
- 0.09% fee
- Used for arbitrage, liquidations, collateral swaps

**Key Features:**
- ✅ Uncollateralized borrowing
- ✅ Instant liquidity
- ✅ Same-transaction repayment
- ✅ Low fee (0.09%)

**Use Cases:**
- Arbitrage between DEXs
- Liquidation execution
- Collateral swaps
- Debt refinancing

---

### 12. **Interest Rate Model**
**Contract**: `DefaultReserveInterestRateStrategy.sol`

**What it does:**
- Dynamic interest rates based on utilization
- Higher utilization = higher rates
- Incentivizes supply when demand is high

**Rate Calculation:**
```
Utilization = Total Borrowed / Total Supplied

If Utilization < Optimal (80%):
  Rate = Base Rate + (Utilization / Optimal) × Slope1

If Utilization > Optimal:
  Rate = Base Rate + Slope1 + ((Utilization - Optimal) / (1 - Optimal)) × Slope2

Example (USDC):
- Base Rate: 0%
- Slope1: 4%
- Slope2: 60%
- Optimal: 80%

At 50% utilization: ~2.5% APY
At 80% utilization: 4% APY
At 90% utilization: 34% APY (discourages over-borrowing)
```

---

### 13. **Supply & Borrow Caps**
**Contract**: `ReserveConfiguration.sol`

**What it does:**
- Limits total supply per asset
- Limits total borrows per asset
- Protects protocol from concentration risk

**Key Features:**
- ✅ Per-asset supply caps
- ✅ Per-asset borrow caps
- ✅ Prevents market manipulation
- ✅ Risk management

**Example:**
```
USDC:
- Supply Cap: 100M USDC
- Borrow Cap: 80M USDC

If supply reaches 100M → No more deposits allowed
If borrows reach 80M → No more borrowing allowed
```

---

### 14. **Liquidation Grace Period**
**Contract**: `Pool.sol` → `setLiquidationGracePeriod()`

**What it does:**
- Temporary protection from liquidation during market volatility
- Gives users time to add collateral or repay debt
- Emergency feature for extreme market conditions

**Key Features:**
- ✅ Admin-controlled grace period
- ✅ Prevents panic liquidations
- ✅ Market crash protection
- ✅ Time-limited

---

### 15. **Treasury Management**
**Contract**: `Pool.sol` → `mintToTreasury()`

**What it does:**
- Collects protocol fees (reserve factor)
- Distributes to treasury for protocol sustainability
- Funds development, security, insurance

**Revenue Sources:**
- Reserve Factor: 10-20% of interest paid by borrowers
- Liquidation Protocol Fee: 2% of liquidation bonus
- Flash Loan Fees: 0.09% per flash loan

---

## 📊 Data & Analytics Features

### 16. **Reserve Data**
**Contract**: `Pool.sol` → `getReserveData()`

**Returns:**
- Liquidity index (interest accrual)
- Variable borrow index
- Current supply APY
- Current borrow APY
- Total supplied
- Total borrowed
- dToken address
- Debt token address

---

### 17. **User Account Data**
**Contract**: `Pool.sol` → `getUserAccountData()`

**Returns:**
- Total collateral (USD)
- Total debt (USD)
- Available borrows (USD)
- Current LTV
- Liquidation threshold
- Health factor

---

### 18. **Configuration Management**
**Contract**: `Pool.sol` → `getConfiguration()`

**Returns per asset:**
- LTV
- Liquidation threshold
- Liquidation bonus
- Reserve factor
- Active/Frozen/Paused status
- Borrowing enabled
- Supply cap
- Borrow cap
- E-Mode category
- Isolation mode settings

---

## 🔐 Security Features

### 19. **Access Control**
**Contract**: `ACLManager.sol`

**Roles:**
- **Pool Admin**: Configure reserves, set parameters
- **Emergency Admin**: Pause protocol in emergencies
- **Risk Admin**: Adjust risk parameters
- **Asset Listing Admin**: Add new assets

---

### 20. **Reentrancy Protection**
**Contract**: `Pool.sol` → All public functions

**Protection:**
- ✅ All state-changing functions protected
- ✅ Prevents reentrancy attacks
- ✅ Gas-efficient implementation

---

### 21. **Oracle Integration**
**Contract**: `DeraOracle.sol` (Pyth Network)

**Features:**
- ✅ Decentralized price feeds
- ✅ Sub-second latency
- ✅ Cryptographically verified prices
- ✅ Staleness protection (max 1 hour)
- ✅ Fallback mechanism

---

## 🎯 Hedera-Specific Features

### 22. **HTS Integration**
**Contract**: `Pool.sol` → HTS precompile (0x167)

**Features:**
- ✅ Native Hedera token support
- ✅ Low gas fees ($0.0001/tx)
- ✅ Fast finality (3-5 seconds)
- ✅ Token association required
- ✅ No ERC20 permit needed

---

### 23. **HCS Event Logging**
**Contract**: `Pool.sol` → HCS topics

**Events logged:**
- Supply transactions
- Withdraw transactions
- Borrow transactions
- Repay transactions
- Liquidation transactions

**Benefits:**
- ✅ Transparent audit trail
- ✅ Off-chain analytics
- ✅ Real-time monitoring
- ✅ Compliance tracking

---

### 24. **Mirror Node Integration**
**Contract**: All contracts

**Features:**
- ✅ Historical data queries
- ✅ Transaction history
- ✅ Event logs
- ✅ State snapshots
- ✅ REST API access

---

## 📈 Yield Optimization Features

### 25. **Automatic Compounding**
**Contract**: `DToken.sol` → Interest accrual

**How it works:**
- Interest compounds every second
- No manual claiming needed
- dToken balance grows automatically
- Gas-efficient (no transactions needed)

**Example:**
```
Day 1: Deposit 1000 USDC → Get 1000 dUSDC
Day 30: dUSDC balance = 1010 (10 USDC interest)
Day 60: dUSDC balance = 1020.1 (compounded interest)
```

---

### 26. **Liquidity Mining Rewards**
**Contract**: `RewardsController.sol`

**Features:**
- ✅ Earn DERA tokens for supplying
- ✅ Earn DERA tokens for borrowing
- ✅ Configurable emission rates
- ✅ Claim rewards anytime
- ✅ Multi-asset rewards

---

## 🔄 Advanced Operations

### 27. **Multicall**
**Contract**: `Pool.sol` → Inherits `Multicall`

**What it does:**
- Execute multiple operations in one transaction
- Saves gas and time
- Atomic execution (all or nothing)

**Example:**
```
Multicall:
1. Supply 1000 USDC
2. Enable USDC as collateral
3. Borrow 500 HBAR

All in one transaction!
```

---

### 28. **Credit Delegation**
**Contract**: `VariableDebtToken.sol` → Delegation

**What it does:**
- Delegate borrowing power to another address
- Borrower uses your collateral
- You remain responsible for debt

**Use Cases:**
- Institutional lending
- Trusted borrowers
- Business partnerships

---

### 29. **Position Manager**
**Contract**: `Pool.sol` → Position management

**What it does:**
- Approve third-party to manage your position
- Automated position management
- DeFi strategies

---

## 📋 Summary of All Features

| Feature | Contract | User Benefit |
|---------|----------|--------------|
| Supply | Pool.sol | Earn interest on deposits |
| Withdraw | Pool.sol | Access funds + interest anytime |
| Borrow | Pool.sol | Get instant loans against collateral |
| Repay | Pool.sol | Clear debt, improve health factor |
| Liquidation | Pool.sol | Protect protocol, earn bonus |
| E-Mode | Pool.sol | Higher LTV for correlated assets |
| Isolation Mode | Pool.sol | Safe onboarding of new assets |
| Flash Loans | PoolLogic.sol | Uncollateralized instant liquidity |
| Interest Rates | InterestRateStrategy.sol | Dynamic rates based on supply/demand |
| Health Factor | Pool.sol | Real-time risk monitoring |
| Collateral Toggle | Pool.sol | Flexible collateral management |
| Supply/Borrow Caps | ReserveConfiguration.sol | Protocol risk protection |
| Liquidation Grace | Pool.sol | Emergency protection |
| Treasury | Pool.sol | Protocol sustainability |
| Rewards | RewardsController.sol | Earn DERA tokens |
| Oracle | DeraOracle.sol | Accurate price feeds |
| HTS Integration | Pool.sol | Native Hedera tokens |
| HCS Logging | Pool.sol | Transparent audit trail |
| Multicall | Pool.sol | Batch operations |
| Credit Delegation | VariableDebtToken.sol | Delegate borrowing power |

---

## 🎯 Key Differentiators

**vs Traditional Banks:**
- ✅ No credit checks
- ✅ Instant approval
- ✅ 24/7 availability
- ✅ Lower interest rates
- ✅ Transparent terms

**vs Other DeFi Protocols:**
- ✅ Built on Hedera (fast, cheap, green)
- ✅ HTS native token support
- ✅ Sub-second finality
- ✅ $0.0001 transaction fees
- ✅ Carbon-negative blockchain

---

**Total Features: 29 Core Features**
**Contracts Analyzed: 15+ Smart Contracts**
**Lines of Code: 10,000+ LOC**

---

*Last Updated: 2025*
*Dera Protocol - Decentralized Finance for Africa on Hedera*
