import React from 'react';

const SidebarSection = () => {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-secondary)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Quick Actions
      </h3>
      <div className="space-y-3">
        <button className="w-full text-left p-3 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
          <span className="text-[var(--color-text-primary)]">View Transactions</span>
        </button>
        <button className="w-full text-left p-3 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
          <span className="text-[var(--color-text-primary)]">Analytics</span>
        </button>
        <button className="w-full text-left p-3 bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] rounded-lg transition-colors">
          <span className="text-[var(--color-text-primary)]">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarSection;