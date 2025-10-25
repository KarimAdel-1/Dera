import React, { memo } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CardSkinSelector from './CardSkinSelector';
import WalletConnectionButtons from './WalletConnectionButtons';
import ConnectedWalletConfirmation from './ConnectedWalletConfirmation';

const CARD_SKINS = [
  'Card-1.png',
  'Card-2.png',
  'Card-3.png',
  'Card-4.png',
  'Card-5.png',
  'Card-6.png',
  'Card-7.png',
  'Card-8.png',
  'Card-9.png',
  'Card.png',
];

/**
 * Connect wallet modal component
 * Handles wallet connection and card skin selection
 */
const ConnectWalletModal = memo(({
  show,
  onClose,
  editingWallet,
  newlyConnectedWallet,
  tempWallet,
  wallets,
  isConnecting,
  onConnectHashPack,
  onUpdateTempWallet,
  onDeleteTempWallet,
  onSetDefaultWallet,
  onUpdateWalletCardSkin,
}) => {
  if (!show) return null;

  const handleSkinChange = (skin) => {
    if (editingWallet) {
      onUpdateTempWallet({ ...editingWallet, cardSkin: skin });
    } else {
      onUpdateTempWallet({ cardSkin: skin });
    }
  };

  const handleConfirm = async () => {
    if (editingWallet) {
      const result = await onUpdateWalletCardSkin(
        editingWallet.id,
        editingWallet.address,
        editingWallet.cardSkin
      );

      if (result.success) {
        toast.success('Card design updated!');
      } else {
        toast.error('Failed to save card design');
      }
    }

    onDeleteTempWallet();
    onClose();
  };

  const handleSetDefault = (wallet) => {
    const foundWallet = wallets.find(
      (w) => w.address === wallet.address && w.walletType === wallet.walletType
    );
    if (foundWallet) {
      onSetDefaultWallet(foundWallet.id);
    }
  };

  const selectedSkin = editingWallet
    ? editingWallet.cardSkin
    : tempWallet?.cardSkin || 'Card-1.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-xl max-w-4xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[var(--color-text-primary)] text-xl font-semibold">
            {editingWallet ? 'Change Card Design' : 'Connect New Wallet'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card Skin Selector */}
        <CardSkinSelector
          selectedSkin={selectedSkin}
          onSkinChange={handleSkinChange}
          cardSkins={CARD_SKINS}
        />

        {/* Connection Buttons or Confirmation */}
        {!newlyConnectedWallet && !editingWallet ? (
          <WalletConnectionButtons
            isConnecting={isConnecting}
            onConnectHashPack={onConnectHashPack}
            onUpdateTempWallet={onUpdateTempWallet}
          />
        ) : newlyConnectedWallet && !editingWallet ? (
          <ConnectedWalletConfirmation
            newlyConnectedWallet={newlyConnectedWallet}
            wallets={wallets}
            onSetDefault={handleSetDefault}
          />
        ) : null}

        {/* Footer Buttons */}
        <div className="flex justify-end items-center">
          <div className="flex gap-3">
            <button
              onClick={() => {
                onDeleteTempWallet();
                onClose();
              }}
              className="px-4 py-2 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-card)]/70 transition-colors"
            >
              Cancel
            </button>
            {(editingWallet || newlyConnectedWallet) && (
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Confirm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

ConnectWalletModal.displayName = 'ConnectWalletModal';

export default ConnectWalletModal;
