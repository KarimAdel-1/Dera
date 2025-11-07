-- Migration: Create walletconnect_sessions table
-- This table stores WalletConnect pairing sessions for persistence across browser sessions

CREATE TABLE IF NOT EXISTS walletconnect_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  pairing_topic TEXT UNIQUE NOT NULL,
  relay_protocol TEXT DEFAULT 'irn',
  sym_key TEXT NOT NULL,
  expiry_timestamp BIGINT,
  network TEXT DEFAULT 'testnet',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_walletconnect_sessions_user_id ON walletconnect_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_walletconnect_sessions_wallet_address ON walletconnect_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_walletconnect_sessions_pairing_topic ON walletconnect_sessions(pairing_topic);
CREATE INDEX IF NOT EXISTS idx_walletconnect_sessions_is_active ON walletconnect_sessions(is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_walletconnect_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_walletconnect_sessions_updated_at
  BEFORE UPDATE ON walletconnect_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_walletconnect_sessions_updated_at();

-- Add RLS policies
ALTER TABLE walletconnect_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can view their own sessions" ON walletconnect_sessions
  FOR SELECT USING (true);  -- Allow all reads for now

CREATE POLICY "Users can insert their own sessions" ON walletconnect_sessions
  FOR INSERT WITH CHECK (true);  -- Allow all inserts for now

CREATE POLICY "Users can update their own sessions" ON walletconnect_sessions
  FOR UPDATE USING (true);  -- Allow all updates for now

CREATE POLICY "Users can delete their own sessions" ON walletconnect_sessions
  FOR DELETE USING (true);  -- Allow all deletes for now

-- Add comments
COMMENT ON TABLE walletconnect_sessions IS 'Stores WalletConnect pairing sessions for persistence across browser sessions';
COMMENT ON COLUMN walletconnect_sessions.pairing_topic IS 'Unique WalletConnect pairing topic';
COMMENT ON COLUMN walletconnect_sessions.sym_key IS 'Symmetric key for WalletConnect session (stored as JSON)';
COMMENT ON COLUMN walletconnect_sessions.expiry_timestamp IS 'Unix timestamp when the session expires';
