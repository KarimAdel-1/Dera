# 🏆 Hackathon Judge Quickstart Guide

**Setup Time: < 10 minutes** | **Difficulty: Easy** | **Prerequisites: Node.js 18+**

---

## ✅ Pre-Deployment Checklist

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] Hedera testnet account created ([Portal](https://portal.hedera.com/))
- [ ] At least 100 HBAR in account (free from faucet)
- [ ] Supabase project created (optional, for frontend features)
- [ ] WalletConnect project created (optional, for wallet integration)
- [ ] Git installed (optional)

---

## 🚀 3-Step Quick Deployment

### Step 1: Clone Repository (30 seconds)

```bash
git clone https://github.com/KarimAdel-1/Dera.git
cd Dera
```

---

### Step 2: Deploy Everything with Interactive Setup (5-8 minutes) ⭐

```bash
npm run deploy:hackathon
```

**The script will interactively prompt you for:**

1. **Hedera Credentials** (3 prompts):
   - Hedera Operator ID (format: 0.0.xxxxx)
   - Hedera Operator Key (DER encoded private key)
   - EVM Private Key (64 hex characters, without 0x)

2. **Supabase Credentials** (3 prompts):
   - Supabase URL (https://xxxxx.supabase.co)
   - Supabase Anon/Public Key
   - Supabase Service Role Key

3. **WalletConnect** (1 prompt):
   - WalletConnect Project ID

**💡 Get credentials from:**
- **Hedera:** https://portal.hedera.com/ (create testnet account)
- **Supabase:** https://app.supabase.com/project/_/settings/api
- **WalletConnect:** https://cloud.walletconnect.com/

**📝 Note:** The script automatically creates all `.env` files and fills credentials everywhere. You don't need to manually edit any files!

**Expected output:**
```
✅ All dependencies installed!
✅ Contracts compiled successfully!
✅ Contracts deployed successfully!
✅ HCS topics created successfully!
✅ Frontend environment configured
🎉 DEPLOYMENT COMPLETE!
```

**What gets deployed:**
- 8 smart contracts (Pool, Oracle, Staking, etc.)
- 5 HCS topics (Supply, Withdraw, Borrow, Repay, Liquidation)
- Frontend configuration

**Grab a coffee ☕ while it runs!**

---

### Step 3: Start Frontend (1 minute)

```bash
cd frontend
npm install  # If not already done
npm run dev
```

**Open browser:** http://localhost:3000

---

## 🎮 Testing the Protocol (5 minutes)

### 1. Connect Wallet

- Install [HashPack](https://www.hashpack.app/) extension
- Click "Connect Wallet" on frontend
- Approve connection

### 2. Get Test HBAR (if needed)

- Visit https://portal.hedera.com/
- Request 100 HBAR from faucet
- Wait ~30 seconds

### 3. Supply HBAR

- Navigate to "Supply" page
- Enter amount (e.g., 10 HBAR)
- Approve transaction
- View updated balance (takes 3-5 seconds)

### 4. View on HashScan

- Click transaction link
- See contract execution
- View HCS event logs

### 5. Check HCS Topics

- Open `contracts/hcs-topics.json`
- Copy a topic ID
- Visit https://hashscan.io/testnet/topic/YOUR_TOPIC_ID
- See immutable event logs

---

## 📊 What to Look For (Judge Criteria)

### ✅ Hedera Integration

**Check these files:**
- `contracts/contracts/hedera/DeraHCSEventStreamer.sol` - HCS integration
- `contracts/contracts/hedera/DeraNodeStaking.sol` - Node staking
- `contracts/contracts/protocol/pool/Pool.sol` - HTS integration (line 200-450)
- `backend/hcs-event-service/src/HCSEventService.js` - Backend HCS logic

**Key features:**
- [ ] All transactions logged to HCS topics
- [ ] HTS precompile used for token operations (address `0x167`)
- [ ] Node staking for dual yield
- [ ] Mirror Node queries for analytics

### ✅ Economic Model

**Cost comparison:**
- Supply transaction: $0.05 (vs. $20-100 on Ethereum)
- Total 5 transactions: $0.45 (vs. $240-800 on Ethereum)
- HCS logging: $0.0001 per event (vs. $2-5 on Ethereum)

**See:** README.md "Economic Model" section

### ✅ Code Quality

**Check:**
- [ ] Clear function names (`supply()`, `borrow()`, `withdraw()`)
- [ ] NatSpec documentation on all public functions
- [ ] OpenZeppelin standards
- [ ] No hardcoded credentials in repo
- [ ] Clean git history

**Run:**
```bash
cd contracts
npx hardhat compile  # Should compile without warnings
```

### ✅ Architecture

**Verify:**
- [ ] Frontend queries Mirror Node for data
- [ ] Backend services submit to HCS topics
- [ ] Smart contracts emit events
- [ ] Node staking service manages rewards

**See:** README.md architecture diagram

---

## 📁 Key Files for Review

### Smart Contracts (40+ files)
```
contracts/contracts/
├── hedera/
│   ├── DeraHCSEventStreamer.sol      # HCS integration ⭐
│   ├── DeraNodeStaking.sol           # Node staking ⭐
│   └── DeraMirrorNodeAnalytics.sol   # Analytics
├── protocol/
│   ├── pool/Pool.sol                 # Core lending logic ⭐
│   └── pool/PoolConfigurator.sol     # Admin functions
```

### Backend Services (6 services)
```
backend/
├── hcs-event-service/                # HCS submission ⭐
├── node-staking-service/             # Staking automation ⭐
└── liquidation-bot/                  # Position monitoring
```

### Frontend (Next.js)
```
frontend/
├── services/
│   ├── deraProtocolService.js        # Contract interaction ⭐
│   ├── hederaService.js              # Mirror Node queries ⭐
│   └── stakingService.js             # Staking interface
```

---

## 🔍 Deployed Resources

After deployment, check:

### 1. Contract Addresses
```bash
cat contracts/deployment-info.json
```

View on HashScan:
```
https://hashscan.io/testnet/contract/CONTRACT_ADDRESS
```

### 2. HCS Topics
```bash
cat contracts/hcs-topics.json
```

View on HashScan:
```
https://hashscan.io/testnet/topic/TOPIC_ID
```

### 3. Transactions
All transactions visible on HashScan with:
- Gas costs (in HBAR)
- Execution status
- Event logs
- HCS message references

---

## 🆘 Troubleshooting

### Deployment fails

**Common fixes:**
```bash
# Missing dependencies
npm install

# Credential validation failed
# Re-run deployment and carefully enter credentials when prompted
npm run deploy:hackathon

# Low HBAR balance
# Request more from https://portal.hedera.com/
```

**Credential Format Requirements:**
- Hedera Operator ID: Must be `0.0.xxxxx` format
- Hedera Operator Key: Min 64 characters (DER encoded)
- EVM Private Key: Exactly 64 hex characters (no 0x prefix)
- Supabase URL: Must start with `https://`
- Supabase Keys: Min 100 characters (JWT tokens)
- WalletConnect ID: Min 32 characters

### Frontend won't start

**Check:**
```bash
ls frontend/.env.local  # Should exist after deployment
cat frontend/.env.local  # Should have contract addresses
```

**Fix:**
```bash
cd frontend
npm install
npm run build  # Check for errors
npm run dev
```

### Contract calls fail

**Check:**
- HashPack wallet connected
- Account has HBAR for gas
- Contract addresses correct in frontend/.env.local
- Network is testnet (not mainnet)

---

## 📞 Quick Links

- **Hedera Portal:** https://portal.hedera.com/ (get HBAR)
- **HashScan:** https://hashscan.io/ (view transactions)
- **HashPack:** https://www.hashpack.app/ (wallet)
- **Hedera Status:** https://status.hedera.com/ (network health)

---

## 💡 Pro Tips for Judges

1. **Interactive setup:** The deployment script guides you through all credential setup
2. **Keep deployment logs:** `contracts/deployment-info.json` has all addresses
3. **Check HashScan:** All transactions are publicly verifiable
4. **Test with small amounts:** Start with 1-5 HBAR for supply/borrow
5. **View HCS topics:** Immutable audit log is the key feature
6. **Credentials filled automatically:** Enter once during deployment, used in 7+ env files

---

## 📊 Expected Results

After successful deployment:

- **8 smart contracts** deployed to Hedera testnet
- **5 HCS topics** created for event logging
- **Frontend running** at http://localhost:3000
- **Total cost:** ~50-100 HBAR (~$2-4 USD)
- **Total time:** 5-8 minutes

---

## ✅ Submission Checklist

Use this to verify the submission:

- [ ] **Hedera Integration**
  - [ ] HCS topics created and visible on HashScan
  - [ ] HTS operations in Pool.sol
  - [ ] Node staking contract deployed
  - [ ] Mirror Node queries working

- [ ] **Documentation**
  - [ ] README.md comprehensive (check ✅)
  - [ ] Architecture diagram present
  - [ ] Economic justification clear
  - [ ] Deployment instructions < 10 min

- [ ] **Code Quality**
  - [ ] No private keys in repo
  - [ ] Clear function names
  - [ ] Contracts compile without errors
  - [ ] Clean git history

- [ ] **Functionality**
  - [ ] Can supply assets
  - [ ] Can borrow against collateral
  - [ ] Events logged to HCS
  - [ ] Frontend displays data

---

**Ready to deploy? Run `npm run deploy:hackathon` 🚀**

---

## 🏆 Why This Project Stands Out

1. **Deep Hedera Integration:** Not just EVM contracts - native HCS, HTS, node staking
2. **Production-Ready:** Comprehensive error handling, testing, documentation
3. **Real-World Use Case:** Solving actual problems for African DeFi users
4. **Economic Innovation:** Dual yield mechanism (lending + staking)
5. **Complete Solution:** Full stack (contracts, backend, frontend, docs)
6. **One-Command Deploy:** Judges can test in < 10 minutes

---

**Thank you for reviewing Dera Protocol! 🌍**

Built with ❤️ for Hedera and the African DeFi ecosystem.
