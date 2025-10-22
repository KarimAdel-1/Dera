-- =====================================================
-- INITIALIZE POOL STATS
-- =====================================================
-- This script creates the initial pool_stats row
-- Run this AFTER running the merged-schema.sql
-- =====================================================

-- Insert initial pool stats row (if not exists)
INSERT INTO pool_stats (
  tier1_total,
  tier2_total,
  tier3_total,
  tier1_borrowed,
  tier2_borrowed,
  tier3_borrowed,
  tier1_utilization,
  tier2_utilization,
  tier3_utilization,
  tier1_apy,
  tier2_apy,
  tier3_apy,
  total_volume,
  last_update
) VALUES (
  0,      -- tier1_total
  0,      -- tier2_total
  0,      -- tier3_total
  0,      -- tier1_borrowed
  0,      -- tier2_borrowed
  0,      -- tier3_borrowed
  0,      -- tier1_utilization
  0,      -- tier2_utilization
  0,      -- tier3_utilization
  4.5,    -- tier1_apy (Instant Access)
  5.85,   -- tier2_apy (30-Day Notice)
  7.65,   -- tier3_apy (90-Day Locked)
  0,      -- total_volume
  NOW()   -- last_update
)
ON CONFLICT DO NOTHING;

-- Verify the row was created
SELECT * FROM pool_stats;
