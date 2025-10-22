-- Dera Platform Complete Database Schema
-- PostgreSQL / Supabase
-- Merged: Users/Wallets + Lending/Borrowing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & WALLETS (New Frontend Schema)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  unique_identifier TEXT UNIQUE NOT NULL,
  wallet_address VARCHAR(42) UNIQUE, -- Primary wallet address
  iscore INTEGER DEFAULT 500 CHECK (iscore >= 300 AND iscore <= 1000),
  total_loans INTEGER DEFAULT 0,
  total_repaid DECIMAL(20, 8) DEFAULT 0,
  total_liquidations INTEGER DEFAULT 0,
  on_time_repayments INTEGER DEFAULT 0,
  account_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_score_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table (multi-wallet support)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  card_skin TEXT DEFAULT 'Card-1.png',
  wallet_type TEXT NOT NULL DEFAULT 'hashpack',
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)
);

-- ============================================
-- LENDING & BORROWING (Backend Schema)
-- ============================================

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_wallet VARCHAR(42) NOT NULL,
  collateral_amount DECIMAL(20, 8) NOT NULL,
  borrowed_amount_usd DECIMAL(20, 8) NOT NULL,
  borrowed_amount_hbar DECIMAL(20, 8) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL,
  iscore INTEGER NOT NULL,
  proxy_account_id VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'liquidated', 'pending_liquidation')),
  health_factor DECIMAL(10, 4),
  last_health_check TIMESTAMP,
  transaction_id VARCHAR(100),
  liquidator VARCHAR(42),
  created_at TIMESTAMP DEFAULT NOW(),
  repaid_at TIMESTAMP,
  liquidated_at TIMESTAMP,
  liquidation_triggered_at TIMESTAMP
);

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_wallet VARCHAR(42) NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
  amount DECIMAL(20, 8) NOT NULL,
  lp_tokens DECIMAL(20, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'pending_withdrawal')),
  withdrawal_request_date TIMESTAMP,
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP
);

-- Pool Stats Table
CREATE TABLE IF NOT EXISTS pool_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier1_total DECIMAL(20, 8) DEFAULT 0,
  tier2_total DECIMAL(20, 8) DEFAULT 0,
  tier3_total DECIMAL(20, 8) DEFAULT 0,
  tier1_borrowed DECIMAL(20, 8) DEFAULT 0,
  tier2_borrowed DECIMAL(20, 8) DEFAULT 0,
  tier3_borrowed DECIMAL(20, 8) DEFAULT 0,
  tier1_utilization DECIMAL(5, 2) DEFAULT 0,
  tier2_utilization DECIMAL(5, 2) DEFAULT 0,
  tier3_utilization DECIMAL(5, 2) DEFAULT 0,
  tier1_apy DECIMAL(5, 2) DEFAULT 4.5,
  tier2_apy DECIMAL(5, 2) DEFAULT 5.85,
  tier3_apy DECIMAL(5, 2) DEFAULT 7.65,
  total_volume DECIMAL(20, 8) DEFAULT 0,
  last_update TIMESTAMP DEFAULT NOW()
);

-- Proxy Accounts Table
CREATE TABLE IF NOT EXISTS proxy_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  borrower_wallet VARCHAR(42) NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  initial_balance DECIMAL(20, 8) NOT NULL,
  staked_amount DECIMAL(20, 8) NOT NULL,
  unstaked_amount DECIMAL(20, 8) NOT NULL,
  staking_node_id VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'liquidated')),
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Reward Distributions Table
CREATE TABLE IF NOT EXISTS reward_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proxy_account_id VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  borrower_wallet VARCHAR(42) NOT NULL,
  total_rewards DECIMAL(20, 8) NOT NULL,
  borrower_share DECIMAL(20, 8) NOT NULL,
  protocol_share DECIMAL(20, 8) NOT NULL,
  lender_share DECIMAL(20, 8) NOT NULL,
  insurance_share DECIMAL(20, 8) NOT NULL,
  transaction_id VARCHAR(100),
  distributed_at TIMESTAMP DEFAULT NOW()
);

-- Event Logs Table
CREATE TABLE IF NOT EXISTS event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_wallet VARCHAR(42),
  transaction_id VARCHAR(100),
  data JSONB,
  processed_at TIMESTAMP DEFAULT NOW()
);

-- Loan Warnings Table
CREATE TABLE IF NOT EXISTS loan_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_wallet VARCHAR(42) NOT NULL,
  health_factor DECIMAL(10, 4) NOT NULL,
  warning_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_unique_identifier ON users(unique_identifier);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_default ON wallets(user_id, is_default) WHERE is_default = true;

-- Loans indexes
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_wallet ON loans(user_wallet);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- Deposits indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_user_wallet ON deposits(user_wallet);
CREATE INDEX IF NOT EXISTS idx_deposits_tier ON deposits(tier);

-- Proxy accounts indexes
CREATE INDEX IF NOT EXISTS idx_proxy_accounts_user_id ON proxy_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_proxy_accounts_borrower ON proxy_accounts(borrower_wallet);
CREATE INDEX IF NOT EXISTS idx_proxy_accounts_status ON proxy_accounts(status);

-- Event logs indexes
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_wallet ON event_logs(user_wallet);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own data" ON users
  FOR ALL USING (unique_identifier = current_setting('app.current_user', true));

CREATE POLICY "Users can view their own wallets" ON wallets
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

CREATE POLICY "Users can view their own loans" ON loans
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

CREATE POLICY "Users can view their own deposits" ON deposits
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

CREATE POLICY "Users can view their own proxy accounts" ON proxy_accounts
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

CREATE POLICY "Users can view their own rewards" ON reward_distributions
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

CREATE POLICY "Users can view their own warnings" ON loan_warnings
  FOR ALL USING (user_id IN (
    SELECT id FROM users WHERE unique_identifier = current_setting('app.current_user', true)
  ));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default pool stats record
INSERT INTO pool_stats (id, tier1_apy, tier2_apy, tier3_apy)
VALUES (uuid_generate_v4(), 4.5, 5.85, 7.65)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE users IS 'User profiles with credit scores and multi-wallet support';
COMMENT ON TABLE wallets IS 'Multiple wallet addresses per user';
COMMENT ON TABLE loans IS 'Loan records and transaction history';
COMMENT ON TABLE deposits IS 'Lender deposit records across three tiers';
COMMENT ON TABLE pool_stats IS 'Pool statistics and analytics';
COMMENT ON TABLE proxy_accounts IS 'Hedera proxy accounts for collateral staking';
COMMENT ON TABLE reward_distributions IS 'Staking reward distribution records';
COMMENT ON TABLE event_logs IS 'Blockchain event processing logs';
COMMENT ON TABLE loan_warnings IS 'Loan health factor warnings';
