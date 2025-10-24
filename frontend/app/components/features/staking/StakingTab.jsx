import React from 'react';
import { Coins, TrendingUp, Clock, Award } from 'lucide-react';

const StakingTab = () => {
  return (
    <div className="space-y-6 p-0 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-1">
            Staking
          </h2>
          <p className="text-[var(--color-text-muted)] text-[13px] sm:text-[14px]">
            Stake your HBAR and earn rewards
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StakingStatCard
          icon={Coins}
          title="Total Staked"
          value="0 HBAR"
          subtitle="$0.00"
        />
        <StakingStatCard
          icon={TrendingUp}
          title="Rewards Earned"
          value="0 HBAR"
          subtitle="$0.00"
        />
        <StakingStatCard
          icon={Clock}
          title="Staking Period"
          value="0 days"
          subtitle="Active"
        />
        <StakingStatCard
          icon={Award}
          title="APY"
          value="6.5%"
          subtitle="Current rate"
        />
      </div>

      {/* Staking Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stake Section */}
        <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-6">
          <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
            Stake HBAR
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[var(--color-text-muted)] text-sm mb-2">
                Amount to Stake
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] text-sm">
                  HBAR
                </span>
              </div>
            </div>
            <button className="w-full bg-[var(--color-primary)] text-white rounded-lg py-3 font-medium hover:bg-[var(--color-primary)]/90 transition-colors">
              Stake HBAR
            </button>
          </div>
        </div>

        {/* Unstake Section */}
        <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-6">
          <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
            Unstake HBAR
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[var(--color-text-muted)] text-sm mb-2">
                Amount to Unstake
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-lg px-4 py-3 text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] text-sm">
                  HBAR
                </span>
              </div>
            </div>
            <button className="w-full bg-red-600 text-white rounded-lg py-3 font-medium hover:bg-red-700 transition-colors">
              Unstake HBAR
            </button>
          </div>
        </div>
      </div>

      {/* Staking History */}
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-6">
        <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
          Staking History
        </h3>
        <div className="text-center py-8">
          <p className="text-[var(--color-text-muted)]">No staking history yet</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Start staking to see your transaction history
          </p>
        </div>
      </div>
    </div>
  );
};

const StakingStatCard = ({ icon: Icon, title, value, subtitle }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-8 h-8 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-[var(--color-primary)]" />
      </div>
      <span className="text-[var(--color-text-muted)] text-sm">{title}</span>
    </div>
    <div className="space-y-1">
      <p className="text-[var(--color-text-primary)] text-lg font-medium">{value}</p>
      <p className="text-[var(--color-text-muted)] text-xs">{subtitle}</p>
    </div>
  </div>
);

export default StakingTab;