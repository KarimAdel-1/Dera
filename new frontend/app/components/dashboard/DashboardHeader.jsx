import React from 'react';

const DashboardHeader = () => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Welcome to Dashboard
      </h2>
      <p className="text-[var(--color-text-muted)] mt-2">
        Manage your wallets and transactions
      </p>
    </div>
  );
};

export default DashboardHeader;