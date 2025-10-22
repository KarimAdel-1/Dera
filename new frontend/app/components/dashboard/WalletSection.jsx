import React from 'react';
import { useSelector } from 'react-redux';

const WalletSection = () => {
  const { wallets, defaultWallet } = useSelector((state) => state.wallet);

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-secondary)] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Connected Wallets
      </h3>
      {wallets.length > 0 ? (
        <div className="space-y-3">
          {wallets.map((wallet, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-bg-primary)] rounded-lg">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">{wallet.walletType}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{wallet.address}</p>
              </div>
              {wallet.address === defaultWallet && (
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Default</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[var(--color-text-muted)]">No wallets connected</p>
      )}
    </div>
  );
};

export default WalletSection;