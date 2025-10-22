# Environment Configuration Guide

## Overview

The Dera platform uses a **single unified `.env` file** in the root directory for both backend and frontend configuration. This simplifies deployment and ensures consistency across the entire application.

---

## File Location

**All environment variables should be configured in:**
```
/Dera/.env
```

**Do NOT create:**
- ❌ `/Dera/frontend/.env`
- ❌ `/Dera/frontend/.env.local`
- ❌ `/Dera/backend/.env`

**Configuration is centralized in one place for simplicity.**

---

## How It Works

### Backend
The backend automatically loads environment variables from `/Dera/.env` using Node.js's `dotenv` package.

### Frontend
The frontend's `next.config.js` is configured to:
1. Load environment variables from the parent directory's `.env` file
2. Expose `NEXT_PUBLIC_*` variables to the browser
3. Keep sensitive variables (without `NEXT_PUBLIC_` prefix) secure on the server

---

## Setup Instructions

### 1. Copy the Example File

```bash
cd /home/user/Dera
cp .env.example .env
```

### 2. Fill in Required Values

Open `/Dera/.env` and configure the following sections:

#### A. Hedera Configuration (Required)

```bash
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.7094264  # Your platform treasury account
HEDERA_PRIVATE_KEY=302e...     # Your platform private key (KEEP SECRET!)
```

**Where to get these:**
- Create a Hedera testnet account at: https://portal.hedera.com
- Or use HashPack wallet to generate an account
- The private key is shown when creating the account (save it securely!)

#### B. Supabase Configuration (Required)

```bash
# Backend Supabase (server-side only)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Frontend Supabase (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

**Where to get these:**
1. Go to: https://supabase.com
2. Create a new project (or use existing)
3. Go to Settings → API
4. Copy:
   - `URL` → Use for both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
   - `service_role key` → Use for SUPABASE_SERVICE_KEY (backend only, NEVER expose to browser!)
   - `anon key` → Use for NEXT_PUBLIC_SUPABASE_ANON_KEY (safe to expose)

#### C. Frontend Configuration (Required)

```bash
# These are exposed to the browser
NEXT_PUBLIC_COINGECKO_API=https://api.coingecko.com/api/v3/
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0.0.7094264  # Same as HEDERA_ACCOUNT_ID
NEXT_PUBLIC_APP_NAME=Dera Platform
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Lending & Borrowing on Hedera
```

#### D. Backend Configuration (Optional)

```bash
PORT=3001
NODE_ENV=development
API_BASE_URL=http://localhost:3001
```

---

## Environment Variable Types

### 🔒 Server-Side Only (Secure)
These variables are **NEVER** exposed to the browser:
- `HEDERA_PRIVATE_KEY` - Platform's private key
- `SUPABASE_SERVICE_KEY` - Full database access
- `MASTER_PASSWORD` - Encryption password
- Any variable **without** `NEXT_PUBLIC_` prefix

### 🌐 Client-Side (Public)
These variables are exposed to the browser:
- `NEXT_PUBLIC_*` - All variables with this prefix
- Safe to expose: API URLs, public keys, app names, etc.
- **NEVER** put secrets in NEXT_PUBLIC_ variables!

---

## Verification

### Check Backend Configuration

```bash
cd /home/user/Dera/backend
node -e "require('dotenv').config({path:'../.env'}); console.log('HEDERA_ACCOUNT_ID:', process.env.HEDERA_ACCOUNT_ID);"
```

**Expected output:**
```
HEDERA_ACCOUNT_ID: 0.0.7094264
```

### Check Frontend Configuration

```bash
cd /home/user/Dera/frontend
npm run dev
```

Then open browser console and check:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
// Should show your Supabase URL
```

---

## Complete .env Template

Here's a minimal working `.env` file:

```bash
# Hedera Configuration
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.7094264
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420...

# Supabase (Backend)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase (Frontend)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend
NEXT_PUBLIC_COINGECKO_API=https://api.coingecko.com/api/v3/
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_LENDING_POOL_ADDRESS=0.0.7094264
NEXT_PUBLIC_APP_NAME=Dera Platform
NEXT_PUBLIC_APP_DESCRIPTION=Decentralized Lending & Borrowing on Hedera

# Backend
PORT=3001
NODE_ENV=development
```

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Cause:** Frontend can't find `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Fix:**
1. Check `/Dera/.env` has the `NEXT_PUBLIC_SUPABASE_*` variables
2. Restart the frontend dev server: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R)

### Error: "Hedera client not initialized"

**Cause:** Backend can't find `HEDERA_ACCOUNT_ID` or `HEDERA_PRIVATE_KEY`

**Fix:**
1. Check `/Dera/.env` has the `HEDERA_*` variables
2. Restart backend: `node src/index.js`

### Frontend shows undefined for env variables

**Cause:**
- Environment variables not prefixed with `NEXT_PUBLIC_`
- Or dev server not restarted after adding variables

**Fix:**
1. Ensure all frontend variables start with `NEXT_PUBLIC_`
2. Stop and restart: `npm run dev`
3. Clear browser cache

### Backend can see variables, frontend cannot

**Cause:** Variables need `NEXT_PUBLIC_` prefix to be exposed to browser

**Fix:**
Add `NEXT_PUBLIC_` prefix:
```bash
# Wrong (won't work in browser):
SUPABASE_URL=https://...

# Correct (works in browser):
NEXT_PUBLIC_SUPABASE_URL=https://...
```

---

## Security Best Practices

### ✅ DO:
- Keep `.env` file in `.gitignore` (already configured)
- Use `NEXT_PUBLIC_` only for non-sensitive data
- Regenerate keys if accidentally committed
- Use different accounts for development and production

### ❌ DON'T:
- Put private keys in `NEXT_PUBLIC_*` variables
- Commit `.env` file to git
- Share `.env` file publicly
- Use production keys in development

---

## Migration from Old Setup

If you previously had a separate `frontend/.env.local` file:

### Step 1: Copy Variables
Copy all `NEXT_PUBLIC_*` variables from `frontend/.env.local` to `/Dera/.env`

### Step 2: Delete Old File
```bash
rm /home/user/Dera/frontend/.env.local
```

### Step 3: Restart Services
```bash
# Restart backend
cd /home/user/Dera/backend
node src/index.js

# Restart frontend
cd /home/user/Dera/frontend
npm run dev
```

**The old `frontend/.env.local` file is now deprecated and will be ignored.**

---

## Advanced Configuration

### Production Deployment

For production, use environment variables from your hosting provider:
- Vercel: Add in Project Settings → Environment Variables
- Heroku: Use `heroku config:set`
- AWS: Use Systems Manager Parameter Store
- Docker: Use `--env-file` flag

### Multiple Environments

For different environments (dev, staging, prod):

```bash
# Development
.env

# Staging
.env.staging

# Production
.env.production
```

Load the appropriate file:
```bash
# In next.config.js
dotenv.config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV}`) });
```

---

## Summary

✅ **One `.env` file** in `/Dera/` directory
✅ **Used by both** backend and frontend
✅ **Server variables** don't have `NEXT_PUBLIC_` prefix
✅ **Browser variables** must have `NEXT_PUBLIC_` prefix
✅ **Never commit** `.env` to git
✅ **See `.env.example`** for complete template

Questions? Check the [WITHDRAWAL_SETUP.md](WITHDRAWAL_SETUP.md) for specific withdrawal feature configuration.
