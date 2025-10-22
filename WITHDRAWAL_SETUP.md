# Withdrawal Feature Setup Guide

## Overview
The withdrawal feature has been implemented with the following architecture:
- **Frontend**: Calls backend API for withdrawal processing
- **Backend**: Executes Hedera transactions and updates database
- **Tier 1**: Instant withdrawals (HBAR sent immediately)
- **Tier 2/3**: Withdrawal requests (30/90 day notice periods)

---

## Files Modified/Created

### Backend
1. **`backend/src/routes/withdrawals.js`** (NEW)
   - POST `/api/withdrawals/process` - Process withdrawals
   - GET `/api/withdrawals/pending/:userWallet` - Get pending withdrawal requests

2. **`backend/src/index.js`** (MODIFIED)
   - Added withdrawals router

### Frontend
3. **`frontend/services/lendingBorrowingService.js`** (MODIFIED)
   - Updated `processWithdrawal()` to call backend API
   - Added error handling for backend connectivity

4. **`frontend/.env.local.example`** (MODIFIED)
   - Added `NEXT_PUBLIC_BACKEND_URL`
   - Added `NEXT_PUBLIC_LENDING_POOL_ADDRESS`

---

## Prerequisites

### Backend Configuration

The backend needs access to the **platform treasury private key** to send HBAR to users during withdrawals.

**1. Set up environment variables in `/Dera/.env`:**

```bash
# Hedera Operator Account (Platform Treasury)
HEDERA_ACCOUNT_ID=0.0.7094264
HEDERA_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
HEDERA_NETWORK=testnet

# Database (Supabase)
DATABASE_URL=your_supabase_connection_string
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

# Server
PORT=3001
NODE_ENV=development
```

**Important**:
- The `HEDERA_ACCOUNT_ID` should be the platform treasury account (currently `0.0.7094264`)
- The `HEDERA_PRIVATE_KEY` is the **private key** for account `0.0.7094264`
- **Never commit the `.env` file** - it's in `.gitignore` for security

### Frontend Configuration

**2. Create `/Dera/frontend/.env.local`:**

```bash
# Copy from example
cp frontend/.env.local.example frontend/.env.local

# Then edit and fill in:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0.0.7094264
NEXT_PUBLIC_HEDERA_NETWORK=testnet
```

---

## Running the Application

### 1. Start the Backend

```bash
cd /home/user/Dera/backend
npm install  # if not already done
node src/index.js
```

**Expected output:**
```
Hedera client initialized for testnet
Operator account: 0.0.7094264
✓ Proxy Account Manager initialized
✓ Price Oracle Service started
✓ Health Monitor started
...
Dera backend server running on port 3001
```

### 2. Start the Frontend

```bash
cd /home/user/Dera/frontend
npm install  # if not already done
npm run dev
```

**Expected output:**
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## Testing Withdrawals

### Tier 1 Instant Withdrawal

**Flow:**
1. User clicks "Withdraw" button on an active Tier 1 deposit
2. Frontend calls backend API: `POST /api/withdrawals/process`
3. Backend executes Hedera transaction: Platform → User HBAR transfer
4. Backend updates database: deposit status = 'withdrawn'
5. Backend updates pool stats
6. User receives HBAR in their wallet

**Test Steps:**
```javascript
// 1. Make a Tier 1 deposit first
// Go to Lending tab → Select Tier 1 → Deposit (e.g., 100 HBAR)

// 2. Check your deposit appears in "My Deposits" tab

// 3. Click "Withdraw" button

// 4. Expected result:
// - Success message: "Withdrawal completed successfully! HBAR sent to your wallet."
// - Transaction ID displayed
// - HBAR received in HashPack wallet
// - Deposit status changed to 'withdrawn'
```

**Console Logs to Look For:**
```
Frontend:
💸 Processing withdrawal: {walletAddress: '0.0.xxxxx', depositId: 'uuid', tier: 1}
🔄 Calling backend API for withdrawal...
✅ Backend withdrawal response: {success: true, transactionId: '...'}
✅ Tier 1 instant withdrawal completed

Backend:
Processing withdrawal request for deposit uuid, tier 1
Executing withdrawal: 100 HBAR to 0.0.xxxxx
Withdrawal transaction successful: 0.0.xxxxx@1234567890.123456789
```

### Tier 2/3 Withdrawal Requests

**Flow:**
1. User clicks "Request Withdrawal" on Tier 2/3 deposit
2. Frontend calls backend API
3. Backend updates database: status = 'pending_withdrawal'
4. User sees "Pending" status
5. After 30/90 days, funds become available (requires cron job - not yet implemented)

---

## Troubleshooting

### Error: "Hedera service not available"

**Cause**: Backend missing `HEDERA_ACCOUNT_ID` or `HEDERA_PRIVATE_KEY`

**Fix**:
```bash
# Edit /Dera/.env
HEDERA_ACCOUNT_ID=0.0.7094264
HEDERA_PRIVATE_KEY=302e...your_key
```

### Error: "Backend service is not available"

**Cause**: Backend server not running

**Fix**:
```bash
cd /home/user/Dera/backend
node src/index.js
```

### Error: "Insufficient liquidity"

**Cause**: Not enough HBAR in Tier 1 available pool (30% lendable rule)

**Explanation**:
- Tier 1 allows instant withdrawal of only 30% of total deposits
- If 30% is already lent out, withdrawals are blocked until repayments come in

**Fix**:
- Wait for loan repayments
- Or deposit more to Tier 1 to increase available liquidity

### Error: "Deposit not found or already withdrawn"

**Cause**:
- Deposit ID doesn't exist
- Deposit already withdrawn
- Wallet mismatch

**Fix**:
- Refresh the page to get latest deposit status
- Make sure you're using the correct wallet

---

## Architecture Details

### Why Backend is Required

**Security Reason**:
To send HBAR from the platform treasury to users, we need the treasury's **private key**. This key must **NEVER** be exposed in frontend code.

**Solution**:
Backend service holds the private key securely and executes transactions on behalf of the platform.

### Transaction Flow

```
User Deposits:
User Wallet → Platform Treasury
(Signed by user's HashPack)

User Withdraws:
Platform Treasury → User Wallet
(Signed by backend with platform key)
```

### Database Updates

**On successful withdrawal:**
```sql
-- Update deposit status
UPDATE deposits
SET status = 'withdrawn',
    withdrawn_at = NOW()
WHERE id = depositId;

-- Update pool stats
UPDATE pool_stats
SET tier1_total = tier1_total - amount,
    tier1_utilization = recalculated,
    total_volume = total_volume + amount;
```

---

## Next Steps

### Features Still Missing:

1. **Loan Distribution** - Backend needs to send borrowed HBAR to borrowers
2. **Collateral Return** - After loan repayment, return collateral to borrower
3. **Withdrawal Request Processing** - Cron job to process Tier 2/3 requests after notice period
4. **Earnings Accrual** - Daily cron to calculate and add interest to deposits
5. **Interest Accrual on Loans** - Daily cron to increase loan debt
6. **Staking Integration** - Stake collateral and distribute rewards

### Recommended Implementation Order:

1. ✅ **Tier 1 Withdrawals** (DONE)
2. **Loan Distribution** - Let borrowers actually receive HBAR
3. **Collateral Return** - Complete the loan repayment cycle
4. **Tier 2/3 Withdrawal Processing** - Cron job for notice periods
5. **Earnings/Interest Accrual** - Daily calculations

---

## API Endpoints

### POST `/api/withdrawals/process`

**Request:**
```json
{
  "depositId": "uuid",
  "userWallet": "0.0.xxxxx",
  "tier": 1
}
```

**Response (Tier 1):**
```json
{
  "success": true,
  "message": "Withdrawal completed successfully",
  "transactionId": "0.0.xxxxx@1234567890.123456789",
  "amount": 100,
  "tier": 1
}
```

**Response (Tier 2/3):**
```json
{
  "success": true,
  "message": "Withdrawal request submitted. Funds will be available in 30 days.",
  "availableDate": "2025-11-21T...",
  "amount": 100,
  "tier": 2
}
```

### GET `/api/withdrawals/pending/:userWallet`

**Response:**
```json
{
  "pendingWithdrawals": [
    {
      "id": "uuid",
      "amount": 100,
      "tier": 2,
      "withdrawal_request_date": "2025-10-22T...",
      "tier2_available_date": "2025-11-21T..."
    }
  ],
  "count": 1
}
```

---

## Security Considerations

1. **Private Key Storage**:
   - Backend private key stored in `.env` file (not in code)
   - `.env` is in `.gitignore`
   - Never commit or share the private key

2. **API Validation**:
   - Backend validates deposit ownership before withdrawal
   - Checks wallet address matches deposit record
   - Verifies deposit status is 'active'

3. **Liquidity Checks**:
   - Backend enforces 30% lendable rule for Tier 1
   - Prevents over-withdrawal

4. **Production Recommendations**:
   - Use environment variable managers (AWS Secrets Manager, HashiCorp Vault)
   - Implement rate limiting on API endpoints
   - Add authentication/authorization (JWT tokens)
   - Use HTTPS for all API calls
   - Implement transaction monitoring and alerts

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend connects to backend
- [ ] Can make a Tier 1 deposit
- [ ] Can withdraw from Tier 1
- [ ] HBAR actually appears in wallet
- [ ] Transaction ID is valid on HashScan
- [ ] Deposit status updates to 'withdrawn'
- [ ] Pool stats update correctly
- [ ] Can request Tier 2 withdrawal
- [ ] Pending status shows correctly
- [ ] Error handling works (insufficient liquidity, backend down, etc.)

---

## HashScan Verification

After each withdrawal, verify the transaction on HashScan:

**Testnet**: `https://hashscan.io/testnet/transaction/{transactionId}`

**Example**:
```
Transaction ID: 0.0.7094264@1698765432.123456789
URL: https://hashscan.io/testnet/transaction/0.0.7094264@1698765432.123456789
```

**What to check**:
- Status: SUCCESS
- From: 0.0.7094264 (Platform Treasury)
- To: 0.0.xxxxx (Your wallet)
- Amount: Matches withdrawal amount
- Memo: (if any)
