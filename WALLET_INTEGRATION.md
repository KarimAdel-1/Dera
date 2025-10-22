# Dera Platform - Wallet Integration & Frontend Implementation Guide

## Completed Features ✅

### 1. Multi-Wallet Support
Successfully integrated support for three Hedera wallets:
- **HashPack** - Most popular Hedera wallet
- **Kabila** - Secure and user-friendly
- **Blade** - Fast and feature-rich

### 2. Wallet Context (`frontend/contexts/WalletContext.tsx`)

**Features:**
- Connect multiple wallets simultaneously
- Switch between connected wallets
- Disconnect individual wallets
- Persistent wallet storage
- Transaction signing support
- Balance tracking

**Key Functions:**
```typescript
const {
  wallets,              // Array of all connected wallets
  activeWallet,         // Currently active wallet
  isConnecting,         // Connection state
  connectWallet,        // Connect a new wallet
  disconnectWallet,     // Disconnect wallet
  switchActiveWallet,   // Switch active wallet
  refreshBalances,      // Update balances
  signTransaction,      // Sign transactions
  hashConnect          // HashConnect instance
} = useWallet();
```

**Usage:**
```typescript
// Connect wallet
await connectWallet('hashpack'); // or 'kabila' or 'blade'

// Switch wallet
switchActiveWallet('hashpack-0.0.12345');

// Disconnect wallet
await disconnectWallet('hashpack-0.0.12345');

// Sign transaction
const result = await signTransaction(transactionBytes);
```

### 3. Notification System (`frontend/contexts/NotificationContext.tsx`)

**Features:**
- Real-time notifications
- Notification types: info, warning, error, success, critical
- Persistent storage per wallet
- Unread count tracking
- Automatic loan health monitoring
- Toast notifications

**Key Functions:**
```typescript
const {
  notifications,        // All notifications
  unreadCount,         // Count of unread
  addNotification,     // Add new notification
  markAsRead,          // Mark single as read
  markAllAsRead,       // Mark all as read
  deleteNotification,  // Delete notification
  clearAll            // Clear all notifications
} = useNotifications();
```

**Usage:**
```typescript
// Add notification
addNotification({
  type: 'warning',
  title: 'Low Health Factor',
  message: 'Your loan health factor is 1.15',
  action: {
    label: 'Manage Loan',
    onClick: () => navigate('/borrow')
  }
});
```

### 4. WalletConnect Component (`frontend/components/WalletConnect.tsx`)

**Features:**
- Clean UI for wallet selection
- Multi-wallet management modal
- Add/remove wallets easily
- Active wallet indicator
- Responsive design

**Integration:**
```tsx
import WalletConnect from '../components/WalletConnect';

// In your component
<WalletConnect />
```

### 5. Package Dependencies

**Added:**
- `@hashgraph/hashconnect` - HashPack & Kabila integration
- `@bladelabs/blade-web3.js` - Blade wallet integration
- `lucide-react` - Icon library
- Existing: `react-hot-toast`, `recharts`, `zustand`, `date-fns`

---

## Remaining Features To Implement

### 1. Provider Setup

**File to Create:** `frontend/pages/_app.tsx`

```tsx
import { WalletProvider } from '../contexts/WalletContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }) {
  return (
    <WalletProvider>
      <NotificationProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </NotificationProvider>
    </WalletProvider>
  );
}

export default MyApp;
```

### 2. Complete Lend Page

**File:** `frontend/pages/lend.tsx`

**Required Features:**

#### A. Tier Selection Component
```tsx
// Display 3 tiers with:
// - Tier 1 (Instant): 30% lendable, withdraw anytime
// - Tier 2 (Warm): 70% lendable, 30-day notice
// - Tier 3 (Cold): 100% lendable, 90-day lock

interface Tier {
  id: 1 | 2 | 3;
  name: string;
  apy: number;
  lendablePercent: number;
  withdrawalType: 'instant' | '30-day' | '90-day';
  lpTokenSymbol: 'dLP-Instant' | 'dLP-Warm' | 'dLP-Cold';
}
```

#### B. Deposit Flow
1. Select tier
2. Enter HBAR amount
3. Show preview:
   - USD equivalent
   - LP tokens to receive
   - Estimated annual earnings
   - Pool statistics
4. Approve transaction
5. Wait for confirmation
6. Update dashboard

#### C. Withdrawal Flow

**Tier 1 (Instant):**
- Check available liquidity
- Instant withdrawal if available
- Show available amount if insufficient

**Tier 2 (30-Day):**
- Request withdrawal
- Show countdown timer
- Enable withdrawal after 30 days

**Tier 3 (90-Day):**
- Show days remaining in lock period
- Disable withdrawal until period ends
- Offer option to re-lock for continued APY

#### D. My Deposits Dashboard
- Total deposited per tier
- Current APY
- LP tokens held
- Accrued interest
- Withdrawal status
- Historical performance chart

**API Endpoints Needed:**
```typescript
GET  /api/pools/stats           // Pool statistics
GET  /api/pools/:tier/apy       // Current APY for tier
POST /api/lend/deposit          // Deposit to tier
POST /api/lend/withdraw         // Withdraw from tier
POST /api/lend/request-withdraw // Request withdrawal (Tier 2)
GET  /api/lend/deposits/:wallet // User's deposits
```

### 3. Complete Borrow Page

**File:** `frontend/pages/borrow.tsx`

**Required Features:**

#### A. iScore Display
```tsx
// Show user's current iScore (300-1000)
// Display score impact on:
// - Collateral ratio (200% at 300, 130% at 1000)
// - Interest rate (12% at 300, 5% at 1000)
// - Credit tier badge (Poor/Fair/Good/Excellent)

interface IScore {
  score: number;
  collateralRatio: number;
  interestRate: number;
  tier: 'poor' | 'fair' | 'good' | 'excellent';
  factors: {
    accountAge: number;
    totalLoans: number;
    repaymentHistory: number;
    liquidationHistory: number;
    onTimePerformance: number;
  };
}
```

#### B. Collateral Calculator
```tsx
// Interactive calculator showing:
// - Desired borrow amount (USD)
// - Required collateral (HBAR)
// - Current HBAR price
// - Collateral ratio based on iScore
// - Staking rewards breakdown
// - Net effective interest rate

interface CollateralCalculation {
  borrowAmountUSD: number;
  borrowAmountHBAR: number;
  requiredCollateralHBAR: number;
  collateralRatio: number;
  hbarPrice: number;
  interestRate: number;
  stakingRewards: {
    annual: number;
    borrowerShare: number; // 40%
    protocolShare: number; // 30%
    lenderShare: number;   // 20%
    insuranceShare: number; // 10%
  };
  effectiveRate: number; // Interest rate - staking offset
}
```

#### C. Borrow Flow
1. Display iScore and terms
2. Enter borrow amount
3. Show collateral calculation
4. Deposit collateral (creates proxy account + stakes)
5. Confirm borrow
6. Receive borrowed HBAR
7. Show active loan dashboard

#### D. Loan Monitoring
```tsx
// Real-time monitoring dashboard
interface LoanStatus {
  borrowedUSD: number;
  borrowedHBAR: number;
  collateralHBAR: number;
  collateralUSD: number;
  healthFactor: number; // (Collateral × 0.9) / Debt
  status: 'safe' | 'warning' | 'critical' | 'liquidation';
  interestAccrued: number;
  stakingRewardsEarned: number;
  daysActive: number;

  // Color coding
  healthColor: 'green' | 'yellow' | 'orange' | 'red';
  // green: > 1.5
  // yellow: 1.2 - 1.5
  // orange: 1.0 - 1.2
  // red: < 1.0
}
```

#### E. Repayment Flow
1. Show current loan status
2. Calculate total repayment amount
   - Principal
   - Accrued interest
   - Total in HBAR (at current price)
3. Show what user will receive back:
   - Collateral
   - Staking rewards (borrower's 40% share)
4. Execute repayment
5. Update iScore (+points for on-time repayment)

#### F. Add Collateral / Partial Repay
- Option to add more collateral (improves health factor)
- Option to partially repay (reduces debt, improves health factor)
- Show health factor impact before confirming

**API Endpoints Needed:**
```typescript
GET  /api/iscore/:wallet            // Get user's iScore
POST /api/borrow/calculate          // Calculate collateral needs
POST /api/borrow/deposit-collateral // Deposit collateral
POST /api/borrow/borrow             // Execute borrow
GET  /api/borrow/loans/:wallet      // Get user's loans
POST /api/borrow/repay              // Repay loan
POST /api/borrow/add-collateral     // Add collateral
GET  /api/borrow/health/:loanId     // Get loan health
```

### 4. Analytics Dashboard

**File:** `frontend/pages/dashboard.tsx`

**Required Components:**

#### A. Portfolio Overview
```tsx
// Summary cards
- Total Deposited (across all tiers)
- Total Borrowed
- Net Position
- Total Earnings (interest + staking rewards)
- Current Health Factor
- iScore
```

#### B. Performance Charts
Use `recharts` for data visualization:

**1. Earnings Over Time**
```tsx
<LineChart>
  {/* Interest earned */}
  {/* Staking rewards */}
  {/* Total earnings */}
</LineChart>
```

**2. Deposit Distribution**
```tsx
<PieChart>
  {/* Tier 1 deposits */}
  {/* Tier 2 deposits */}
  {/* Tier 3 deposits */}
</PieChart>
```

**3. Health Factor History**
```tsx
<AreaChart>
  {/* Health factor over time */}
  {/* Warning threshold line at 1.2 */}
  {/* Liquidation threshold line at 1.0 */}
</AreaChart>
```

**4. iScore Progression**
```tsx
<LineChart>
  {/* iScore over time */}
  {/* Show impact of each loan */}
</LineChart>
```

#### C. Transaction History
- Recent deposits
- Recent withdrawals
- Recent borrows
- Recent repayments
- Staking rewards received
- Interest earned

**API Endpoints Needed:**
```typescript
GET /api/analytics/portfolio/:wallet    // Portfolio summary
GET /api/analytics/earnings/:wallet     // Earnings history
GET /api/analytics/transactions/:wallet // Transaction history
GET /api/analytics/health-history/:wallet // Health factor history
GET /api/analytics/iscore-history/:wallet // iScore progression
```

### 5. Notification Panel Component

**File:** `frontend/components/NotificationPanel.tsx`

**Features:**
- Bell icon with unread count badge
- Dropdown panel showing recent notifications
- Notification types with color coding:
  - Info: Blue
  - Warning: Yellow
  - Error: Red
  - Success: Green
  - Critical: Flashing red
- Mark as read functionality
- Action buttons (e.g., "Manage Loan", "Add Collateral")
- Clear all button

**Integration in Layout:**
```tsx
<header>
  <WalletConnect />
  <NotificationPanel />
</header>
```

### 6. Historical Data Charts

**Files to Create:**
- `frontend/components/charts/EarningsChart.tsx`
- `frontend/components/charts/HealthFactorChart.tsx`
- `frontend/components/charts/iScoreChart.tsx`
- `frontend/components/charts/APYChart.tsx`

**Common Features:**
- Time range selector (7d, 30d, 90d, 1y, All)
- Export to CSV
- Tooltips with detailed data
- Responsive design
- Loading states
- Empty states

**Example: Health Factor Chart**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const HealthFactorChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <ReferenceLine y={1.2} stroke="orange" strokeDasharray="3 3" label="Warning" />
      <ReferenceLine y={1.0} stroke="red" strokeDasharray="3 3" label="Liquidation" />
      <Line type="monotone" dataKey="healthFactor" stroke="#8884d8" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);
```

---

## Implementation Priority

### Phase 1: Core Functionality (Week 1)
1. ✅ Wallet integration (COMPLETED)
2. ✅ Notification system (COMPLETED)
3. Provider setup in _app.tsx
4. Basic Lend page with Tier 1 deposits
5. Basic Borrow page with collateral calculator

### Phase 2: Full Features (Week 2)
1. Complete all 3 tier withdrawal flows
2. Complete borrow flow with proxy accounts
3. Loan monitoring dashboard
4. Repayment functionality
5. iScore display and calculation

### Phase 3: Advanced Features (Week 3)
1. Analytics dashboard
2. Historical charts
3. Transaction history
4. Performance tracking
5. Export functionality

### Phase 4: Polish (Week 4)
1. Loading states
2. Error handling
3. Empty states
4. Mobile responsiveness
5. Performance optimization
6. End-to-end testing

---

## Backend API Requirements

All frontend features require corresponding backend endpoints. Reference the backend services already implemented:

- **Proxy Account Manager**: Creates staking accounts for borrowers
- **Price Oracle Service**: Provides current HBAR price
- **Health Monitor**: Monitors loan health factors
- **iScore Calculator**: Calculates credit scores
- **Event Listener**: Processes blockchain events

**New API Routes Needed:**

```typescript
// Lending routes (backend/src/routes/lend.ts)
POST   /api/lend/deposit
POST   /api/lend/withdraw
POST   /api/lend/request-withdraw
GET    /api/lend/deposits/:wallet
GET    /api/lend/withdrawals/:wallet

// Borrowing routes (backend/src/routes/borrow.ts)
POST   /api/borrow/calculate
POST   /api/borrow/deposit-collateral
POST   /api/borrow/borrow
POST   /api/borrow/repay
POST   /api/borrow/add-collateral
GET    /api/borrow/loans/:wallet
GET    /api/borrow/health/:loanId

// Analytics routes (backend/src/routes/analytics.ts)
GET    /api/analytics/portfolio/:wallet
GET    /api/analytics/earnings/:wallet
GET    /api/analytics/transactions/:wallet
GET    /api/analytics/health-history/:wallet
GET    /api/analytics/iscore-history/:wallet

// Pool routes (already exists, extend if needed)
GET    /api/pools/stats
GET    /api/pools/:tier/apy
```

---

## Testing Requirements

### Unit Tests
- Wallet context functions
- Notification system
- Calculator logic
- Health factor calculations
- iScore calculations

### Integration Tests
- Full lend flow (deposit → withdraw)
- Full borrow flow (collateral → borrow → repay)
- Wallet switching during transactions
- Multi-wallet management

### E2E Tests
- Connect wallet
- Deposit to each tier
- Borrow with different iScores
- Monitor health factor changes
- Repay loan and verify iScore improvement
- Test liquidation scenario

---

## Environment Variables

**Add to `frontend/.env.local`:**
```bash
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0xf44AdB4Ceec9793780CA88aD6050f91E510D9D81
NEXT_PUBLIC_BORROWING_CONTRACT_ADDRESS=0x2628F91eA3421f90Cc0d6F9fCD2181B20AE8f976
NEXT_PUBLIC_PRICE_ORACLE_ADDRESS=0xe7C04C4bc01F1988a72030DB6b2401c653c24857
NEXT_PUBLIC_LP_INSTANT_ADDRESS=0x5D344b543b535D3185Bb23110da2b7e7E3C01D03
NEXT_PUBLIC_LP_WARM_ADDRESS=0x3cbA46Cf481345e7Ce4D513Ec33D5461D03bd5B4
NEXT_PUBLIC_LP_COLD_ADDRESS=0x624Db5F73F10832bE5603cE239a585cBC9e1a192
```

---

## Summary

### ✅ Completed
- Multi-wallet integration (HashPack, Kabila, Blade)
- Wallet context with full functionality
- Notification system with alerts
- Updated WalletConnect component
- Package dependencies

### 🟡 In Progress
- Provider setup
- Complete Lend page
- Complete Borrow page
- Analytics dashboard
- Historical charts

### 📋 Next Steps
1. Set up providers in _app.tsx
2. Create Lend page with tier system
3. Create Borrow page with calculator
4. Build analytics dashboard
5. Add historical charts
6. Implement notification panel
7. Connect to backend APIs
8. Test all user flows
9. Deploy to production

---

Generated: 2025-10-22
Platform: Dera Lending Platform on Hedera
Status: Wallet Integration Complete - Frontend Features In Progress
