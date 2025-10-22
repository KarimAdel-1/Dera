-- =====================================================
-- FIX ROW LEVEL SECURITY POLICIES FOR DERA PLATFORM
-- =====================================================
-- This script disables restrictive RLS policies and creates
-- permissive ones that allow the frontend to interact with
-- the database using the anon key.
--
-- ⚠️ WARNING: These policies are permissive for development.
-- For production, implement proper user authentication and
-- more restrictive policies.
-- =====================================================

-- Disable RLS temporarily
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pool_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proxy_accounts DISABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can view own deposits" ON deposits;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Anyone can view pool stats" ON pool_stats;
DROP POLICY IF EXISTS "Users can view their own proxy accounts" ON proxy_accounts;

-- Re-enable RLS (required for policies to work)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pool_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proxy_accounts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development

-- Users table: Allow all operations
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Wallets table: Allow all operations
CREATE POLICY "Allow all operations on wallets" ON wallets
  FOR ALL USING (true) WITH CHECK (true);

-- Deposits table: Allow all operations
CREATE POLICY "Allow all operations on deposits" ON deposits
  FOR ALL USING (true) WITH CHECK (true);

-- Loans table: Allow all operations
CREATE POLICY "Allow all operations on loans" ON loans
  FOR ALL USING (true) WITH CHECK (true);

-- Pool stats table: Allow all operations (mostly reads)
CREATE POLICY "Allow all operations on pool_stats" ON pool_stats
  FOR ALL USING (true) WITH CHECK (true);

-- Proxy accounts table: Allow all operations
CREATE POLICY "Allow all operations on proxy_accounts" ON proxy_accounts
  FOR ALL USING (true) WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('users', 'wallets', 'deposits', 'loans', 'pool_stats', 'proxy_accounts')
ORDER BY tablename, policyname;