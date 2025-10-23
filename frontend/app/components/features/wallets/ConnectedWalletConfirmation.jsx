import React, { memo } from 'react';

/**
 * Connected wallet confirmation component
 * Shows success state after wallet connection
 */
const ConnectedWalletConfirmation = memo(({
  newlyConnectedWallet,
  wallets,
  onSetDefault,
}) => {
  const formatAddress = (addr) => {
    if (!addr) return 'Not Connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="mb-6 p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-green-500/30">
      <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-3">
        Wallet Connected!
      </h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--color-text-secondary)] text-sm capitalize">
            {newlyConnectedWallet?.walletType} Wallet
          </p>
          <p className="text-[var(--color-text-muted)] text-xs">
            {formatAddress(newlyConnectedWallet?.address)}
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            defaultChecked={wallets.length === 1}
            onChange={(e) => {
              if (e.target.checked) {
                onSetDefault(newlyConnectedWallet);
              }
            }}
            className="rounded"
          />
          <span className="text-[var(--color-text-secondary)] text-sm">
            Set as default
          </span>
        </label>
      </div>
    </div>
  );
});

ConnectedWalletConfirmation.displayName = 'ConnectedWalletConfirmation';

export default ConnectedWalletConfirmation;
