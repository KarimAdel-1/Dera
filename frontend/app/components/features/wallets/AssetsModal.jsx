import React, { memo, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Assets modal component
 * Displays HTS tokens and NFTs for the active wallet
 */
const AssetsModal = memo(({ show, onClose, activeWallet, walletsData }) => {
  const [activeTab, setActiveTab] = useState('fungible');

  if (!show) return null;

  const walletData = activeWallet ? walletsData[activeWallet.address] : null;
  const tokenBalances = walletData?.tokenBalances || [];

  const fungibleTokens = tokenBalances.filter(
    (token) => token.type !== 'NON_FUNGIBLE_UNIQUE'
  );
  const nfts = tokenBalances.filter(
    (token) => token.type === 'NON_FUNGIBLE_UNIQUE'
  );

  // Mock NFT for UI testing
  const mockNFT = {
    token_id: '0.0.1234567',
    type: 'NON_FUNGIBLE_UNIQUE',
    balance: 1,
    name: 'Hedera Punk #1337',
  };

  const currentTokens =
    activeTab === 'fungible' ? fungibleTokens : [...nfts, mockNFT];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-xl w-[600px] h-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[var(--color-primary)] text-xl font-semibold mb-1">
              HTS Assets
            </h2>
            <p className="text-[var(--color-text-muted)] text-sm">
              Hedera Token Service
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border-primary)] mb-4">
          <TabButton
            label="Fungible Tokens"
            active={activeTab === 'fungible'}
            onClick={() => setActiveTab('fungible')}
          />
          <TabButton
            label="NFTs"
            active={activeTab === 'nfts'}
            onClick={() => setActiveTab('nfts')}
          />
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-80">
          {activeTab === 'fungible' ? (
            <FungibleTokensList tokens={currentTokens} />
          ) : (
            <NFTsList tokens={currentTokens} />
          )}
        </div>
      </div>
    </div>
  );
});

const TabButton = memo(({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
    }`}
  >
    {label}
  </button>
));

const FungibleTokensList = memo(({ tokens }) => {
  if (tokens.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[var(--color-text-muted)] text-sm">
          No fungible tokens found
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tokens.map((token, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 bg-[var(--color-bg-tertiary)]/20 rounded-lg border border-[var(--color-border-primary)]"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-full flex items-center justify-center">
                <span className="text-[var(--color-primary)] text-sm font-bold">
                  FT
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text-primary)] text-sm font-medium truncate">
                  {token.token_id}
                </p>
                <p className="text-[var(--color-text-muted)] text-xs">
                  Fungible Token
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[var(--color-text-primary)] text-sm font-medium">
              {(token.balance / Math.pow(10, token.decimals || 0)).toFixed(
                token.decimals > 0 ? 2 : 0
              )}
            </p>
            {token.decimals && (
              <p className="text-[var(--color-text-muted)] text-xs">
                {token.decimals} decimals
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

const NFTsList = memo(({ tokens }) => (
  <div className="grid grid-cols-2 gap-3">
    {tokens.map((token, index) => (
      <div
        key={index}
        className="bg-[var(--color-bg-tertiary)]/20 rounded-lg border border-[var(--color-border-primary)] overflow-hidden hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
      >
        <div className="aspect-square bg-gradient-to-br from-gray-200/80 to-white/60 flex items-center justify-center">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center border border-gray-300">
            <span className="text-gray-700 text-lg font-bold">NFT</span>
          </div>
        </div>
        <div className="p-3">
          <h4 className="text-[var(--color-text-primary)] text-xs font-medium truncate mb-1">
            {token.name || `NFT #${index + 1}`}
          </h4>
          <p className="text-[var(--color-text-muted)] text-xs truncate mb-2">
            {token.token_id}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)] text-xs">
              Qty: {token.balance}
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

TabButton.displayName = 'TabButton';
FungibleTokensList.displayName = 'FungibleTokensList';
NFTsList.displayName = 'NFTsList';
AssetsModal.displayName = 'AssetsModal';

export default AssetsModal;
