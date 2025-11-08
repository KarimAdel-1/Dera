# Contracts That Need to Be Restored

## CRITICAL - Must Restore

### 1. LiquidationDataProvider.sol ⚠️ CRITICAL
**Location:** trash/contracts/helpers/LiquidationDataProvider.sol
**Why Needed:**
- **Liquidation bot requires this** (backend/liquidation-bot/src/LiquidationMonitor.js line 71)
- Finds liquidatable positions for liquidation bots
- **Essential for lending/borrowing protocol health** - without liquidations, protocol accumulates bad debt
- Monitoring service also references it (backend/monitoring-service/src/MetricsCollector.js)

**Evidence:**
```javascript
// backend/liquidation-bot/src/config.js
LIQUIDATION_DATA_PROVIDER_ADDRESS: process.env.LIQUIDATION_DATA_PROVIDER_ADDRESS

// backend/liquidation-bot/src/LiquidationMonitor.js
const liquidationDataProviderABI = require('./abis/LiquidationDataProvider.json');
this.contracts.liquidationDataProvider = new ethers.Contract(...)
```

**Status:** Not deployed yet, but backend is ready to use it
**Action:** RESTORE and deploy

---

## RECOMMENDED - Should Restore

### 2. UiPoolDataProvider.sol ⚠️ HIGH PRIORITY
**Location:** trash/contracts/helpers/UiPoolDataProvider.sol
**Why Needed:**
- "Aggregates all pool data in a single call - critical for UX"
- Reduces 50+ separate calls to 1 call
- Frontend needs to show: asset data, rates, TVL, user positions, health factors
- **Without it:** Frontend must make dozens of individual contract calls (slow, expensive)

**Features it provides:**
- Asset data (name, symbol, decimals, LTV, liquidation threshold, rates)
- User-specific data (supplied amounts, borrowed amounts, health factor)
- Protocol-wide stats (total liquidity, utilization rates)

**Status:** Not currently used in frontend, but designed for frontend performance
**Action:** RESTORE - Frontend should use this for better UX

### 3. DeraHBARGateway.sol 🔶 MEDIUM PRIORITY  
**Location:** trash/contracts/gateways/DeraHBARGateway.sol
**Why It Might Be Needed:**
- Simplifies HBAR deposit/withdraw UX
- `depositHBAR()`: Wraps Pool.supply() with native HBAR
- `withdrawHBAR()`: Converts dHBAR → native HBAR in one tx
- **Without it:** Users need 2 transactions for withdrawals

**Current Status:** Pool has native HBAR support, so this is convenience wrapper
**Action:** CONSIDER restoring if you want simpler UX for users

---

## OPTIONAL - Can Stay in Trash

### 4. WalletBalanceProvider.sol ✅ OPTIONAL
**Why:** Batch balance fetcher - frontend can query balances individually
**Action:** Keep in trash unless you want batch balance queries

### 5. DeraStableAndVariableTokensHelper.sol ✅ OPTIONAL
**Why:** Batch deployment helper - not needed at runtime
**Action:** Keep in trash

### 6. DeraTokensAndRatesHelper.sol ✅ OPTIONAL
**Why:** Batch deployment helper - not needed at runtime
**Action:** Keep in trash

### 7. WHBARWrapper.sol ✅ KEEP IN TRASH
**Why:** User confirmed no wrapped tokens
**Action:** Keep in trash

### 8. ConfiguratorDebugger.sol ✅ KEEP IN TRASH
**Why:** Debug tool only
**Action:** Keep in trash

### 9. PoolInstance.sol ✅ KEEP IN TRASH
**Why:** Abstract template not used
**Action:** Keep in trash

### 10. DeraDeploymentConfig.sol ✅ KEEP IN TRASH
**Why:** Deployment helper not integrated
**Action:** Keep in trash

---

## Summary

| Contract | Priority | Action | Reason |
|----------|----------|--------|--------|
| **LiquidationDataProvider** | 🚨 CRITICAL | **RESTORE NOW** | Liquidation bot requires it |
| **UiPoolDataProvider** | ⚠️ HIGH | **RESTORE** | Frontend performance (50+ calls → 1 call) |
| **DeraHBARGateway** | 🔶 MEDIUM | Consider | Better UX for HBAR operations |
| Others | ✅ LOW | Keep in trash | Not needed for core features |

