import React, { memo, useState, useEffect } from 'react';
import { WALLET_TYPES } from '../../../../services/walletProvider';
import { bladeService } from '../../../../services/bladeService';

/**
 * Wallet connection buttons component
 * Displays buttons for connecting HashPack and Blade wallets
 */
const WalletConnectionButtons = memo(({
  isConnecting,
  onConnectHashPack,
  onConnectBlade,
  onUpdateTempWallet,
}) => {
  const [isBladeInstalled, setIsBladeInstalled] = useState(false);

  useEffect(() => {
    // Check if Blade wallet is installed
    setIsBladeInstalled(bladeService.constructor.isInstalled());
  }, []);

  return (
    <div className="mb-6">
      <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
        Connect Wallet
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {/* HashPack Wallet */}
        <WalletButton
          walletType={WALLET_TYPES.HASHPACK}
          label="HashPack"
          description="Most popular Hedera wallet"
          icon="H"
          bgColor="blue-500"
          disabled={isConnecting}
          onClick={() => {
            onUpdateTempWallet({ walletType: WALLET_TYPES.HASHPACK });
            onConnectHashPack();
          }}
        />

        {/* Blade Wallet */}
        <WalletButton
          walletType={WALLET_TYPES.BLADE}
          label="Blade Wallet"
          description={isBladeInstalled ? "Browser extension wallet" : "Not installed"}
          icon="B"
          bgColor="purple-500"
          disabled={isConnecting || !isBladeInstalled}
          onClick={() => {
            if (isBladeInstalled && onConnectBlade) {
              onUpdateTempWallet({ walletType: WALLET_TYPES.BLADE });
              onConnectBlade();
            } else {
              window.open('https://bladewallet.io/', '_blank');
            }
          }}
          showInstallLink={!isBladeInstalled}
        />
      </div>
    </div>
  );
});

const WalletButton = memo(({
  walletType,
  label,
  description,
  icon,
  bgColor,
  disabled,
  onClick,
  showInstallLink
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--color-border-primary)]"
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 bg-${bgColor} rounded-full flex items-center justify-center`}>
        <span className="text-sm font-bold text-white">{icon}</span>
      </div>
      <div className="flex flex-col items-start">
        <span className="font-medium">{label}</span>
        {description && (
          <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
        )}
      </div>
    </div>
    {showInstallLink && (
      <span className="text-xs text-[var(--color-primary)]">Install</span>
    )}
  </button>
));

WalletButton.displayName = 'WalletButton';
WalletConnectionButtons.displayName = 'WalletConnectionButtons';

export default WalletConnectionButtons;
