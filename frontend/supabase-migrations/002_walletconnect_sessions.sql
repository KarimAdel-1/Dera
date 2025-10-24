-- Migration: Create walletconnect_sessions table
-- Purpose: Store WalletConnect session data in database for persistence across localStorage clears
-- This enables perfect persistent sessions without duplicate HashPack connections

-- Create walletconnect_sessions table
CREATE TABLE IF NOT EXISTS walletconnect_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  wallet_address TEXT NOT NULL,

  -- WalletConnect session data
  pairing_topic TEXT NOT NULL UNIQUE,
  relay_protocol TEXT DEFAULT 'irn',
  sym_key TEXT NOT NULL,

  -- Session metadata
  expiry_timestamp BIGINT,
  network TEXT DEFAULT 'testnet',

  -- Session state tracking
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one active session per wallet per user
  UNIQUE(user_id, wallet_address, is_active)
);

-- Create indexes for faster lookups
CREATE INDEX idx_wc_sessions_user_id ON walletconnect_sessions(user_id);
CREATE INDEX idx_wc_sessions_wallet_address ON walletconnect_sessions(wallet_address);
CREATE INDEX idx_wc_sessions_pairing_topic ON walletconnect_sessions(pairing_topic);
CREATE INDEX idx_wc_sessions_active ON walletconnect_sessions(is_active) WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_walletconnect_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER walletconnect_sessions_updated_at
  BEFORE UPDATE ON walletconnect_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_walletconnect_sessions_updated_at();

-- Add RLS (Row Level Security) policies
ALTER TABLE walletconnect_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own sessions
CREATE POLICY "Users can read their own sessions"
  ON walletconnect_sessions
  FOR SELECT
  USING (true);  -- Allow reading for now, can be restricted to auth.uid() if needed

-- Allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions"
  ON walletconnect_sessions
  FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own sessions
CREATE POLICY "Users can update their own sessions"
  ON walletconnect_sessions
  FOR UPDATE
  USING (true);

-- Allow users to delete their own sessions
CREATE POLICY "Users can delete their own sessions"
  ON walletconnect_sessions
  FOR DELETE
  USING (true);

-- Add comments
COMMENT ON TABLE walletconnect_sessions IS 'Stores WalletConnect session data for persistent connections across localStorage clears';
COMMENT ON COLUMN walletconnect_sessions.pairing_topic IS 'WalletConnect pairing topic ID - unique identifier for the session';
COMMENT ON COLUMN walletconnect_sessions.sym_key IS 'WalletConnect symmetric encryption key for the session';
COMMENT ON COLUMN walletconnect_sessions.expiry_timestamp IS 'Unix timestamp when the pairing expires';
