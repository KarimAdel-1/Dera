import React from 'react';

const StatisticsSection = () => {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-secondary)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Statistics
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-[var(--color-bg-primary)] rounded-lg">
          <p className="text-2xl font-bold text-[var(--color-primary)]">0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Total Transactions</p>
        </div>
        <div className="text-center p-3 bg-[var(--color-bg-primary)] rounded-lg">
          <p className="text-2xl font-bold text-[var(--color-primary)]">0</p>
          <p className="text-sm text-[var(--color-text-muted)]">Balance</p>
        </div>
      </div>
    </div>
  );
};

export default StatisticsSection;