'use client';

import React from 'react';
import MultiAssetStaking from '../dera-protocol/components/MultiAssetStaking';

const StakingDashboard = () => {
  return (
    <div className="space-y-6 p-0 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-1">
          Multi-Asset Staking
        </h2>
        <p className="text-[var(--color-text-muted)] text-[13px] sm:text-[14px]">
          Stake HBAR, HTS tokens, NFTs, and RWAs to earn tiered APY rewards
        </p>
      </div>

      {/* Staking Component */}
      <MultiAssetStaking />
    </div>
  );
};

export default StakingDashboard;
