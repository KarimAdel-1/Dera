# Environment Management Scripts

This directory contains utility scripts for managing environment files across the Dera Protocol project.

## Scripts

### `setup-env-files.js`
**Purpose:** Initialize all `.env` files from `.env.example` templates

**Usage:**
```bash
npm run env:setup
# or
node scripts/setup-env-files.js
```

**What it does:**
- Creates `.env` files from `.env.example` templates if they don't exist
- Handles:
  - Root `.env` (from `.env.deployment.example`)
  - `contracts/.env` (from `contracts/.env.example`)
  - `frontend/.env.local` (from `frontend/.env.example`)
  - Backend service `.env` files (all services in `backend/`)
- **Preserves existing files** - won't overwrite

**When to use:**
- First time project setup
- After cloning the repository
- After pulling new changes that add new services

---

### `update-env-files.js`
**Purpose:** Update all `.env` files with deployed contract addresses and HCS topic IDs

**Usage:**
```bash
npm run env:update
# or
node scripts/update-env-files.js
```

**What it does:**
- Reads deployment data from:
  - `contracts/deployment-info.json`
  - `contracts/hcs-topics.json`
- Updates all `.env` files with:
  - Contract addresses (Pool, Oracle, Staking, etc.)
  - HCS topic IDs
  - Network configuration
- **Preserves existing values** for non-deployment variables

**When to use:**
- After running `npm run deploy:hackathon`
- After manual contract deployment
- To sync env files with latest deployment

---

## Environment Files Structure

### Root `.env`
- **Template:** `.env.deployment.example`
- **Purpose:** Root-level configuration
- **Variables:** Contract addresses, HCS topics, network config

### Contracts `.env`
- **Template:** `contracts/.env.example`
- **Purpose:** Hardhat deployment configuration
- **Variables:** Private keys, contract addresses, Pyth oracle config

### Frontend `.env.local`
- **Template:** `frontend/.env.example`
- **Purpose:** Next.js frontend configuration
- **Variables:** Contract addresses (with `NEXT_PUBLIC_` prefix), Supabase, WalletConnect

### Backend Services `.env`
Each service in `backend/` has its own `.env`:
- `hcs-event-service/.env`
- `liquidation-bot/.env`
- `monitoring-service/.env`
- `node-staking-service/.env`
- `rate-updater-service/.env`
- `rate-limiting-service/.env`

---

## Automatic Setup in Deployment

The `deploy:hackathon` script automatically:
1. **Before deployment:** Calls `setup-env-files.js` to ensure all env files exist
2. **After deployment:** Calls `update-env-files.js` to fill in contract addresses

No manual intervention needed! ✨

---

## Manual Setup Workflow

If you need to set up environment files manually:

```bash
# 1. Create all .env files from templates
npm run env:setup

# 2. Fill in your credentials in contracts/.env
#    - HEDERA_OPERATOR_ID
#    - HEDERA_OPERATOR_KEY
#    - PRIVATE_KEY

# 3. (Optional) Configure Supabase/WalletConnect in frontend/.env.local

# 4. Deploy contracts
npm run deploy:hackathon

# 5. Environment files are auto-updated with deployment data! ✅
```

---

## Security Notes

⚠️ **NEVER commit `.env` files to git!**

- All `.env` files are in `.gitignore`
- Only `.env.example` templates are committed
- Keep private keys secure
- Use separate accounts for testnet/mainnet

---

## Troubleshooting

**Problem:** "Environment file not found"
- **Solution:** Run `npm run env:setup` first

**Problem:** "Contract addresses are empty after deployment"
- **Solution:** Run `npm run env:update` manually

**Problem:** "Backend service env files missing"
- **Solution:** The setup script creates them automatically, but verify with `ls backend/*/. env`

---

For more information, see the main project README.
