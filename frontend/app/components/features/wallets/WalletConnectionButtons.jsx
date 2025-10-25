import React, { memo } from 'react';

/**
 * Wallet connection buttons component
 * Displays button for connecting HashPack wallet
 */
const WalletConnectionButtons = memo(({
  isConnecting,
  onConnectHashPack,
  onUpdateTempWallet,
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
        Connect Wallet
      </h3>
      <div className="grid grid-cols-1 gap-3">
        <WalletButton
          walletType="hashpack"
          label="HashPack"
          icon="H"
          bgColor="blue-500"
          disabled={isConnecting}
          onClick={() => {
            onUpdateTempWallet({ walletType: 'hashpack' });
            onConnectHashPack();
          }}
        />
      </div>
    </div>
  );
});

const WalletButton = memo(({ walletType, label, icon, bgColor, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-center gap-3 px-4 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--color-border-primary)]"
  >
    <div className={`w-6 h-6 bg-${bgColor} rounded-full flex items-center justify-center`}>
      <span className="text-xs font-bold text-white">{icon}</span>
    </div>
    {label}
  </button>
));

WalletButton.displayName = 'WalletButton';
WalletConnectionButtons.displayName = 'WalletConnectionButtons';

export default WalletConnectionButtons;
