-- Disable RLS temporarily to allow inserts
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;

-- Create simple policies that allow all operations for now
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Allow all operations on users table
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

-- Allow all operations on wallets table  
CREATE POLICY "Allow all operations on wallets" ON wallets
  FOR ALL USING (true) WITH CHECK (true);