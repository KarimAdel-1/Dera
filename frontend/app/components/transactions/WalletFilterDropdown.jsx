import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Dropdown to filter transactions by wallet
 */
const WalletFilterDropdown = ({ wallets, selectedWalletFilter, onSelectWallet }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getDisplayText = () => {
    if (selectedWalletFilter === 'all') return 'All Wallets';
    const wallet = wallets.find(w => w.id === selectedWalletFilter);
    return wallet ? `${wallet.address.substring(0, 12)}...` : 'Select Wallet';
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <span className="text-[var(--color-text-primary)] font-medium">Filter by wallet:</span>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center justify-between gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] rounded-md px-3 py-2 text-sm min-w-[140px]"
          >
            <span>{getDisplayText()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-md shadow-lg z-10 min-w-[200px]">
              <button
                onClick={() => {
                  onSelectWallet('all');
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-t-md"
              >
                All Wallets
              </button>
              {wallets.map(wallet => (
                <button
                  key={wallet.id}
                  onClick={() => {
                    onSelectWallet(wallet.id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] last:rounded-b-md"
                >
                  {wallet.address} ({wallet.walletType})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletFilterDropdown;
