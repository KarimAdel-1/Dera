# Dera Platform - Setup Instructions

## 🚨 Quick Fix for RLS Error

If you're seeing this error:
```
new row violates row-level security policy for table "users"
```

Follow these steps:

---

## Step 1: Environment Variables

### ✅ Correct Location
The `.env.local` file must be in the **`new frontend`** folder (same directory as `package.json` and `next.config.js`).

### Create `.env.local` file:

```bash
cd "new frontend"
cp .env.local.example .env.local
```

### Edit `.env.local` with your Supabase credentials:

```env
# Get these from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key

# CoinGecko API (for HBAR price - leave as is)
NEXT_PUBLIC_COINGECKO_API=https://api.coingecko.com/api/v3/

# Hedera Network
NEXT_PUBLIC_HEDERA_NETWORK=testnet
```

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Click "Settings" (gear icon) in the left sidebar
3. Click "API" under Project Settings
4. Copy:
   - **URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 2: Fix Database RLS Policies

The database has restrictive Row-Level Security policies that block inserts. You need to run the fix script.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `new frontend/fix-rls.sql`
5. Paste into the SQL editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the fix
supabase db execute --file "new frontend/fix-rls.sql"
```

---

## Step 3: Initialize Pool Stats (First Time Only)

The `pool_stats` table needs an initial row. Run this SQL in Supabase SQL Editor:

```sql
-- Initialize pool stats if not exists
INSERT INTO pool_stats (
  tier1_total, tier2_total, tier3_total,
  tier1_borrowed, tier2_borrowed, tier3_borrowed,
  tier1_utilization, tier2_utilization, tier3_utilization,
  tier1_apy, tier2_apy, tier3_apy,
  total_volume
) VALUES (
  0, 0, 0,  -- tier totals
  0, 0, 0,  -- tier borrowed
  0, 0, 0,  -- tier utilization
  4.5, 5.85, 7.65,  -- tier APYs
  0  -- total volume
)
ON CONFLICT DO NOTHING;
```

---

## Step 4: Start the Application

```bash
cd "new frontend"
npm install
npm run dev
```

The app should now be running at `http://localhost:3000`

---

## Step 5: Test the Integration

1. **Connect your HashPack wallet**
   - Click "Connect Wallet"
   - Approve the connection in HashPack
   - You should see your wallet connected (no RLS errors!)

2. **Test Lending**
   - Go to "Lending" tab
   - Try depositing some HBAR
   - Check Supabase dashboard → Table Editor → `deposits` table
   - You should see your deposit record!

3. **Test Borrowing**
   - Go to "Borrowing" tab
   - Enter collateral and borrow amount
   - Create a loan
   - Check Supabase dashboard → Table Editor → `loans` table
   - You should see your loan record!

---

## ⚠️ Important Notes

### About RLS Policies
The `fix-rls.sql` script creates **permissive policies** that allow all operations:

```sql
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);
```

**This is fine for development**, but for production you should:
- Implement proper user authentication (Supabase Auth)
- Create restrictive policies based on authenticated user ID
- Use service role key for backend operations

### File Locations
```
Dera/
├── new frontend/              ← Your working directory
│   ├── .env.local            ← CREATE THIS (your Supabase keys)
│   ├── .env.local.example    ← Template
│   ├── fix-rls.sql           ← Run this on Supabase
│   ├── package.json
│   ├── next.config.js
│   └── ...
└── .env                      ← Backend only (not used by frontend)
```

---

## Troubleshooting

### Still seeing RLS errors?
1. Double-check you ran `fix-rls.sql` on Supabase
2. Verify the SQL ran without errors
3. Check Supabase Dashboard → Database → Policies
4. You should see policies named "Allow all operations on..."

### Environment variables not working?
1. File must be named `.env.local` (not `.env`)
2. File must be in `new frontend` folder
3. Restart the dev server after creating/editing `.env.local`
4. Check browser console for Supabase connection logs

### Wallet connection works but no data saves?
1. Check Supabase URL and anon key are correct
2. Open browser DevTools → Network tab
3. Look for failed requests to Supabase
4. Check the error message in the console

### Tables don't exist?
Run the merged schema first:
```bash
# In Supabase SQL Editor, run:
cat "backend/database/merged-schema.sql"
# Then run fix-rls.sql
```

---

## Need Help?

Check these in order:
1. Browser console (F12) → Look for errors
2. Supabase Dashboard → Logs → Look for failed queries
3. Verify all SQL scripts ran successfully
4. Make sure `.env.local` is in the correct location with valid keys
