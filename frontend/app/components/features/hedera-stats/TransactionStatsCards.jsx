import React from 'react';
import { BarChart3, Activity } from 'lucide-react';

/**
 * Display transaction statistics cards
 */
const TransactionStatsCards = ({ transactions }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
      <StatCard
        title="Total Transactions"
        icon={<BarChart3 />}
        value={transactions.totalTx?.toLocaleString() || 0}
      />
      <StatCard
        title="New Transactions"
        icon={<Activity />}
        value={transactions.newTx1h?.toLocaleString() || 0}
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

export default TransactionStatsCards;
