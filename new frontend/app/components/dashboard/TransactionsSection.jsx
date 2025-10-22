import React from 'react';

const TransactionsSection = () => {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-secondary)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Recent Transactions
      </h3>
      <div className="space-y-3">
        <div className="text-center py-8">
          <p className="text-[var(--color-text-muted)]">No transactions yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">
            Your transaction history will appear here
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionsSection;