import React from 'react';
import { DollarSign, Users, Activity, TrendingUp } from 'lucide-react';

/**
 * Display Hedera network overview statistics
 */
const OverviewCards = ({ overview, timeframe }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
      <StatCard
        title={`Network Fees (${timeframe})`}
        icon={<DollarSign />}
        value={`${overview.networkFees?.toFixed(0) || 0} ℏ`}
      />
      <StatCard
        title="New Accounts (1hr)"
        icon={<Users />}
        value={overview.newAccounts1h?.toLocaleString() || 0}
      />
      <StatCard
        title="Active Accounts (1hr)"
        icon={<Activity />}
        value={overview.activeAccounts1h?.toLocaleString() || 0}
      />
      <StatCard
        title="HBAR (USD)"
        icon={<TrendingUp />}
        value={`$${overview.hbarUSD?.toFixed(4) || '0.0000'}`}
      />
      <StatCard
        title="Hedera TVL"
        icon={<DollarSign />}
        value={`$${overview.hederaTVL?.toFixed(2) || '0.00'}M`}
      />
      <StatCard
        title="Stable Coin MC"
        icon={<DollarSign />}
        value={`$${overview.stablecoinMC?.toFixed(2) || '0.00'}M`}
      />
    </div>
  );
};

const StatCard = ({ title, icon, value }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:shadow-md">
    <div className="flex items-start justify-between mb-2 xl:mb-3">
      <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal">
        {title}
      </h3>
      <div className="w-4 h-4 text-[var(--color-text-muted)]">{icon}</div>
    </div>
    <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal">
      {value}
    </span>
  </div>
);

export default OverviewCards;
