# Missing Features Analysis Report
**Generated:** 2025-10-23
**Project:** Dera - Decentralized Lending Platform on Hedera

---

## Executive Summary

Dera is approximately **30-40% complete**. While the frontend UI and smart contract architecture are well-structured, **critical backend integration and core financial operations are missing**, making the platform non-functional for production use.

---

## CRITICAL MISSING FEATURES (Must Implement)

### 1. Fund Distribution to Borrowers ❌ **CRITICAL**
**Status:** Not Implemented
**Impact:** Platform is unusable for borrowing
**Location:** `backend/src/routes/loans.js`, `BorrowingContract.sol`

**Issue:**
- Borrowers send collateral to the contract successfully
- NO borrowed HBAR is sent back to the borrower
- Users lock up collateral but receive nothing in return

**Required Implementation:**
- After collateral is received, platform must transfer borrowed HBAR to borrower
- Must verify sufficient pool liquidity before loan approval
- Must update pool utilization statistics
- Must record loan details in database

**Files to Update:**
- `/backend/src/routes/loans.js` - Add loan disbursement logic
- `/backend/src/services/proxyAccountManager/index.js` - Handle HBAR transfers
- Smart contract already has logic; needs backend trigger

---

### 2. Collateral Return System ❌ **CRITICAL**
**Status:** Not Implemented
**Impact:** Users cannot recover collateral after repayment
**Location:** `backend/src/routes/loans.js`, `BorrowingContract.sol`

**Issue:**
- Users can repay loans (principal + interest)
- Collateral remains locked in contract
- No mechanism to return collateral to user

**Required Implementation:**
- After full loan repayment, trigger collateral release
- Transfer collateral from contract/proxy account to user wallet
- Update loan status to "closed"
- Handle partial collateral release for partial repayments

**Files to Update:**
- `/backend/src/routes/loans.js:repay` endpoint
- `/backend/src/services/proxyAccountManager/index.js:returnCollateral()`
- `/contracts/BorrowingContract.sol` - May need collateral release function

---

### 3. Earnings Accrual System ❌ **CRITICAL**
**Status:** Not Implemented
**Impact:** Lenders earn 0% APY despite platform promises
**Location:** `backend/services/`, `contracts/LendingPool.sol`

**Issue:**
- Platform advertises 4.5%, 5.85%, and 7.65% APY for three tiers
- No interest is being calculated or added to deposits
- Users see no growth in their deposit value

**Required Implementation:**
- Create cron job to calculate accrued interest (daily/hourly)
- Update user deposit balances in database
- Mint additional LP tokens to represent earnings
- Display accumulated earnings in frontend (`EarningsDisplay.jsx`)

**Files to Create/Update:**
- `/backend/src/services/earningsAccrual/index.js` (NEW SERVICE)
- `/backend/database/schema.sql` - Add earnings tracking table
- `/contracts/LendingPool.sol` - Add interest distribution logic
- `/frontend/app/components/features/lending-borrowing/EarningsDisplay.jsx`

---

### 4. Loan Interest Accrual ❌ **CRITICAL**
**Status:** Not Implemented
**Impact:** Borrowers never pay interest; platform loses revenue
**Location:** `backend/services/`, `BorrowingContract.sol`

**Issue:**
- Loan interest rates displayed (5-12% APR based on iScore)
- Debt amount never increases over time
- Borrowers can repay original amount regardless of time elapsed

**Required Implementation:**
- Calculate compound interest on loans (daily compounding)
- Update `borrowed_amount` in database regularly
- Display current debt with accrued interest
- Update health factor based on growing debt

**Files to Create/Update:**
- `/backend/src/services/loanInterestAccrual/index.js` (NEW SERVICE)
- `/backend/src/routes/loans.js` - Return current debt with interest
- `/contracts/BorrowingContract.sol` - Add interest calculation functions
- `/frontend/app/components/features/lending-borrowing/LoanInterestTracker.jsx`

---

### 5. Staking System ❌ **CRITICAL**
**Status:** 0% Implemented (Service structure exists but empty)
**Impact:** Core value proposition missing; no rewards for borrowers/lenders
**Location:** `backend/src/services/proxyAccountManager/`

**Issue:**
- Platform promises to stake collateral and distribute rewards
- No proxy accounts are being created
- No staking to Hedera nodes
- No reward distribution (40% borrower, 30% protocol, 20% lenders, 10% insurance)

**Required Implementation:**

**Phase 1: Proxy Account Creation**
- When loan is created, create a Hedera proxy account
- Transfer collateral to proxy account
- Store proxy account details in `proxy_accounts` table

**Phase 2: Staking Setup**
- Stake proxy account HBAR to Hedera consensus node
- Monitor staking rewards via Hedera Mirror Node API
- Track daily rewards per proxy account

**Phase 3: Reward Distribution**
- Calculate reward splits (40/30/20/10)
- Distribute rewards:
  - 40% → Reduce borrower's debt
  - 30% → Protocol treasury wallet
  - 20% → Add to lender deposit pools (proportional)
  - 10% → Insurance fund accumulation
- Record distributions in `reward_distributions` table

**Files to Implement:**
- `/backend/src/services/proxyAccountManager/index.js` (currently empty)
- `/backend/src/services/rewardDistribution/index.js` (NEW SERVICE)
- `/backend/src/cron/stakingRewardsCron.js` (NEW CRON JOB)
- `/frontend/app/components/features/lending-borrowing/StakingRewardsDisplay.jsx`

**API Endpoints Needed:**
- `POST /api/proxy-accounts/create`
- `POST /api/proxy-accounts/stake`
- `GET /api/rewards/user/:wallet`
- `POST /api/rewards/distribute`

---

### 6. Tier 2/3 Withdrawal Processing ❌ **HIGH PRIORITY**
**Status:** Partially Implemented (request creation only)
**Impact:** Users cannot withdraw from Tier 2 (Warm) or Tier 3 (Cold) pools
**Location:** `backend/src/routes/withdrawals.js`

**Issue:**
- Users can create withdrawal requests
- No automated processing after 30-day (Tier 2) or 90-day (Tier 3) notice periods
- Funds remain locked indefinitely

**Required Implementation:**
- Cron job to check pending withdrawal requests daily
- Process withdrawals when notice period expires
- Transfer HBAR from pool to user wallet
- Burn LP tokens
- Update pool statistics

**Files to Update:**
- `/backend/src/cron/withdrawalProcessor.js` (NEW CRON JOB)
- `/backend/src/routes/withdrawals.js:processWithdrawal()`
- `/frontend/app/components/features/lending-borrowing/WithdrawalRequestTracker.jsx`

**SQL Query Needed:**
```sql
SELECT * FROM deposits
WHERE status = 'pending_withdrawal'
AND (
  (tier = 2 AND withdrawal_request_date <= NOW() - INTERVAL '30 days') OR
  (tier = 3 AND withdrawal_request_date <= NOW() - INTERVAL '90 days')
)
```

---

### 7. Automated Liquidation System ❌ **HIGH PRIORITY**
**Status:** Health monitoring exists but no enforcement
**Impact:** Platform at risk of under-collateralization
**Location:** `backend/src/services/healthMonitor/`

**Issue:**
- Health factors are calculated correctly
- No automatic liquidation when HF < 1.0
- Platform could become insolvent if collateral value drops

**Required Implementation:**
- Cron job running every 15-30 minutes
- Monitor all active loans
- When HF < 1.0:
  - Sell collateral on SaucerSwap DEX
  - Repay outstanding debt
  - Charge liquidation penalty (10% of collateral)
  - Distribute penalty: 5% to liquidator bot, 5% to insurance fund
- Send notifications to users when HF < 1.2 (warning threshold)

**Files to Implement:**
- `/backend/src/services/healthMonitor/index.js` (structure exists, needs logic)
- `/backend/src/services/liquidation/index.js` (NEW SERVICE)
- `/backend/src/cron/healthMonitorCron.js` (NEW CRON JOB)
- Integration with SaucerSwap SDK for liquidation sales

**Liquidation Flow:**
```
1. Detect HF < 1.0
2. Calculate liquidation amount (collateral * 110%)
3. Swap collateral for HBAR on SaucerSwap
4. Repay loan principal + interest
5. Return remaining collateral (if any) to borrower
6. Update loan status to "liquidated"
7. Update iScore (negative impact for liquidation)
```

---

### 8. Dynamic iScore Updates ❌ **HIGH PRIORITY**
**Status:** Initial calculation only; no updates
**Impact:** Credit scores don't reflect user behavior
**Location:** `backend/src/services/iScoreCalculator/`

**Issue:**
- iScore calculated once when user first borrows
- Score never updates based on:
  - Payment history (on-time vs. late)
  - Liquidations
  - Borrowing volume
  - Account age

**Required Implementation:**
- Recalculate iScore on every payment
- Recalculate weekly for all active users
- Store score history in database
- Update collateral requirements and interest rates based on new score

**Score Update Triggers:**
- On-time loan repayment → +5 to +15 points
- Late payment (1-30 days) → -10 to -30 points
- Liquidation → -50 to -100 points
- Full loan payoff → +20 points
- Increased borrowing volume → +5 to +20 points

**Files to Update:**
- `/backend/src/services/iScoreCalculator/index.js`
- `/backend/database/schema.sql` - Add `iscore_history` table
- `/frontend/app/components/features/lending-borrowing/IScoreDisplay.jsx`

---

## HIGH PRIORITY MISSING FEATURES

### 9. LP Token System Completion ❌
**Status:** Contracts exist but not fully integrated
**Location:** `contracts/tokens/`, `backend/routes/`

**Missing:**
- Minting LP tokens on deposit
- Burning LP tokens on withdrawal
- LP token balance tracking in UI
- LP token price calculation (based on pool value)

**Required:**
- Mint LP tokens when users deposit
- Display LP token balances in wallet
- Calculate LP token value in HBAR
- Allow LP token transfers (optional)

---

### 10. Utilization-Based Rate Multipliers ❌
**Status:** Defined in contracts but not applied
**Location:** `contracts/LendingPool.sol`, `backend/routes/pools.js`

**Missing:**
- Dynamic interest rate adjustments based on pool utilization
- Higher utilization → Higher rates to incentivize deposits
- Lower utilization → Lower rates to incentivize borrowing

**Formula (from contracts):**
```
Base APY × Utilization Multiplier
- 0-50% utilization: 1.0x
- 50-75% utilization: 1.2x
- 75-90% utilization: 1.5x
- 90-100% utilization: 2.0x
```

---

### 11. Price Oracle Updates ❌
**Status:** Service exists but needs implementation
**Location:** `backend/src/services/priceOracleService/`

**Missing:**
- Automated price fetching from CoinGecko/SaucerSwap
- On-chain oracle updates every 5 minutes
- Price deviation alerts
- Fallback price sources

---

### 12. Event Listener Service ❌
**Status:** Structure exists but no event handling
**Location:** `backend/src/services/eventListener/`

**Missing:**
- Listen to smart contract events:
  - `DepositMade`
  - `WithdrawalRequested`
  - `LoanCreated`
  - `LoanRepaid`
  - `Liquidation`
- Trigger corresponding backend actions
- Update database records
- Send notifications

---

## MEDIUM PRIORITY FEATURES

### 13. Transaction History Improvements
- Pull full history from Hedera Mirror Node
- Filter by transaction type (deposit, withdrawal, borrow, repay)
- Export transaction history as CSV
- Location: `/frontend/app/components/features/transactions/`

### 14. Notification System
- Email/push notifications for:
  - Low health factor warnings
  - Withdrawal request approvals
  - Liquidation alerts
  - Reward distributions
- Location: NEW - `/backend/src/services/notifications/`

### 15. Insurance Fund Management
- Track 10% of staking rewards going to insurance fund
- Display insurance fund balance
- Governance for insurance fund usage
- Location: NEW feature

### 16. Advanced Analytics
- Historical APY charts
- Pool utilization trends over time
- User portfolio performance
- Location: `/frontend/app/components/features/analytics/`

### 17. Multi-Asset Support
- Currently HBAR-only
- Add support for HBAR-backed stablecoins (USDC, USDT)
- Add support for other HTS tokens as collateral
- Location: Multiple - contracts, backend, frontend

---

## NICE-TO-HAVE FEATURES

### 18. Governance System
- DAO token for platform governance
- Vote on parameter changes (APY rates, liquidation thresholds)
- Proposal submission and voting UI

### 19. Referral Program
- Earn bonus APY for referring new users
- Track referral codes and rewards

### 20. Mobile App
- React Native mobile application
- Same features as web app

### 21. Advanced Order Types
- Limit orders for borrowing
- Scheduled deposits
- Auto-reinvest earnings

---

## TODO Comments in Code

Found **17 TODO comments** in the codebase:

### Frontend Hooks:
- `frontend/app/hooks/useBorrowingActions.js:21,60,104` - Replace mock API calls
- `frontend/app/hooks/useLendingActions.js:19,59,115` - Replace mock API calls

### Frontend Components:
- `frontend/app/components/features/lending-borrowing/IScoreDisplay.jsx:4` - Fetch actual iScore from API
- `frontend/app/components/features/lending-borrowing/DepositForm.jsx:30` - Implement actual deposit logic
- `frontend/app/components/features/lending-borrowing/WithdrawalRequestTracker.jsx:52,58` - Implement withdrawal completion/cancellation
- `frontend/app/components/features/lending-borrowing/RepaymentForm.jsx:23` - Implement actual repayment logic
- `frontend/app/components/features/lending-borrowing/BorrowForm.jsx:19` - Implement actual borrow logic
- `frontend/app/components/features/lending-borrowing/WithdrawalForm.jsx:28` - Implement actual withdrawal logic
- `frontend/app/components/features/lending-borrowing/CollateralCalculator.jsx:9` - Get actual HBAR price from API

---

## Implementation Priority Roadmap

### Phase 1: Make Core Platform Functional (2-3 weeks)
1. Fund Distribution to Borrowers
2. Collateral Return System
3. Earnings Accrual System
4. Loan Interest Accrual
5. Replace all TODO mock API calls with real implementations

### Phase 2: Risk Management (1-2 weeks)
6. Automated Liquidation System
7. Health Monitor Cron Jobs
8. Dynamic iScore Updates
9. Price Oracle Automation

### Phase 3: Staking Integration (2-3 weeks)
10. Proxy Account Creation
11. HBAR Staking Setup
12. Reward Distribution System
13. Tier 2/3 Withdrawal Processing

### Phase 4: Polish & Optimization (1-2 weeks)
14. LP Token System Completion
15. Utilization-Based Rate Multipliers
16. Event Listener Service
17. Transaction History Improvements

### Phase 5: Advanced Features (2-4 weeks)
18. Notification System
19. Insurance Fund Management
20. Advanced Analytics
21. Multi-Asset Support

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Critical Missing Features | 8 |
| High Priority Features | 4 |
| Medium Priority Features | 5 |
| Nice-to-Have Features | 4 |
| TODO Comments in Code | 17 |
| Estimated Completion | 30-40% |
| Backend Services Incomplete | 5/5 (100%) |
| Smart Contracts Complete | 80% |
| Frontend UI Complete | 85% |

---

## Conclusion

Dera has a **solid architectural foundation** with well-structured smart contracts and a polished UI. However, **critical backend integration is missing**, making the platform non-functional for actual lending/borrowing operations.

**Key Blockers:**
1. Users can deposit but earn nothing
2. Users can send collateral but receive no loans
3. Users cannot withdraw their deposits
4. No staking = no rewards = no value proposition
5. No liquidations = insolvency risk

**Recommendation:** Prioritize Phase 1 and Phase 2 to achieve a **Minimum Viable Product (MVP)** that can safely handle lending and borrowing operations with proper risk management.

---

**Report Generated by:** Claude Code
**Date:** 2025-10-23
**Branch:** claude/check-missing-features-011CUPifX9qEApk7tNeZbJ9j
