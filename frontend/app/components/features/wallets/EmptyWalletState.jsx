import React, { memo } from 'react';
import { Wallet } from 'lucide-react';

/**
 * Empty wallet state component
 * Displayed when no wallets are connected
 */
const EmptyWalletState = memo(() => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border p-4 sm:p-6 text-center">
    <Wallet className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
    <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-2">
      No Wallet Connected
    </h3>
    <p className="text-[var(--color-text-muted)] text-sm">
      Connect your crypto wallet to view your assets
    </p>
  </div>
));

EmptyWalletState.displayName = 'EmptyWalletState';

export default EmptyWalletState;
