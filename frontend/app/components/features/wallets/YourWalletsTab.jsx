import React, { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { useWalletManagement } from '../../../hooks/useWalletManagement';
import { WalletCardSkeleton, WalletDetailsSkeleton } from '../../common/SkeletonLoaders';
import WalletStatsCards from './WalletStatsCards';
import WalletCard from './WalletCard';
import WalletDetails from './WalletDetails';
import ConnectWalletModal from './ConnectWalletModal';
import AssetsModal from './AssetsModal';
import EmptyWalletState from './EmptyWalletState';

/**
 * Your Wallets Tab Component
 * Displays and manages user's connected Hedera wallets
 *
 * Features:
 * - Multi-wallet support
 * - Real-time balance updates
 * - Wallet connection (HashPack, Kabila, Blade)
 * - Card skin customization
 * - Token and NFT viewing
 */
const YourWalletsTab = () => {
  const {
    wallets,
    activeWalletId,
    walletsData,
    hbarPrice,
    walletDetails,
    network,
    tempWallet,
    isLoading,
    isConnecting,
    newlyConnectedWallet,
    connectToHashPack,
    connectToKabila,
    connectToBlade,
    refreshWalletDetails,
    updateWalletCardSkin,
    setNewlyConnectedWallet,
    createTempWallet,
    updateTempWallet,
    deleteTempWallet,
    setDefaultWallet,
  } = useWalletManagement();

  // Local UI state
  const [showModal, setShowModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [showAssetsModal, setShowAssetsModal] = useState(false);

  // Handlers
  const handleOpenConnectModal = () => {
    createTempWallet();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWallet(null);
    setNewlyConnectedWallet(null);
  };

  const handleEditWallet = (wallet) => {
    setEditingWallet(wallet);
    setShowModal(true);
  };

  const handleSkinChange = (skin) => {
    if (editingWallet) {
      setEditingWallet({ ...editingWallet, cardSkin: skin });
    } else {
      updateTempWallet({ cardSkin: skin });
    }
  };

  const activeWallet = wallets.find((w) => w.id === activeWalletId);

  return (
    <div className="space-y-6 p-0 sm:p-6">
      {/* Statistics Cards */}
      <WalletStatsCards
        isLoading={isLoading}
        wallets={wallets}
        walletsData={walletsData}
        hbarPrice={hbarPrice}
        walletDetails={walletDetails}
        network={network}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Wallets List Section */}
        <div className="xl:col-span-2 space-y-6">
          <WalletListHeader onConnectWallet={handleOpenConnectModal} />

          <div className="space-y-4">
            {isLoading ? (
              <WalletListSkeleton />
            ) : wallets.length > 0 ? (
              <WalletsList
                wallets={wallets}
                activeWalletId={activeWalletId}
                walletsData={walletsData}
                hbarPrice={hbarPrice}
                network={network}
                onEdit={handleEditWallet}
              />
            ) : (
              <EmptyWalletState />
            )}
          </div>
        </div>

        {/* Wallet Details Sidebar */}
        <div className="xl:col-span-1">
          {isLoading ? (
            <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
              <WalletDetailsSkeleton />
            </div>
          ) : (
            <WalletDetails
              wallets={wallets}
              activeWalletId={activeWalletId}
              walletsData={walletsData}
              hbarPrice={hbarPrice}
              walletDetails={walletDetails}
              network={network}
              refreshWalletDetails={refreshWalletDetails}
              setShowAssetsModal={setShowAssetsModal}
            />
          )}
        </div>
      </div>

      {/* Connect/Edit Wallet Modal */}
      <ConnectWalletModal
        show={showModal}
        onClose={handleCloseModal}
        editingWallet={editingWallet}
        newlyConnectedWallet={newlyConnectedWallet}
        tempWallet={tempWallet}
        wallets={wallets}
        isConnecting={isConnecting}
        onConnectHashPack={connectToHashPack}
        onConnectKabila={connectToKabila}
        onConnectBlade={connectToBlade}
        onUpdateTempWallet={handleSkinChange}
        onDeleteTempWallet={deleteTempWallet}
        onSetDefaultWallet={setDefaultWallet}
        onUpdateWalletCardSkin={updateWalletCardSkin}
      />

      {/* Assets Modal */}
      <AssetsModal
        show={showAssetsModal}
        onClose={() => setShowAssetsModal(false)}
        activeWallet={activeWallet}
        walletsData={walletsData}
      />
    </div>
  );
};

/**
 * Wallet list header with connect button
 */
const WalletListHeader = memo(({ onConnectWallet }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h2 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-1">
        Your Wallets
      </h2>
      <p className="text-[var(--color-text-muted)] text-[13px] sm:text-[14px]">
        Manage your crypto wallets and balances
      </p>
    </div>
    <button
      onClick={onConnectWallet}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-9 px-4 py-2 w-full sm:w-auto"
    >
      <Plus className="w-4 h-4" />
      Connect New Wallet
    </button>
  </div>
));

/**
 * Wallets list component
 */
const WalletsList = memo(({
  wallets,
  activeWalletId,
  walletsData,
  hbarPrice,
  network,
  onEdit,
}) => {
  const sortedWallets = [...wallets].sort(
    (a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)
  );

  return (
    <>
      {sortedWallets.map((wallet, index) => (
        <WalletCard
          key={wallet.id || `wallet-${index}`}
          wallet={wallet}
          activeWalletId={activeWalletId}
          walletsData={walletsData}
          hbarPrice={hbarPrice}
          network={network}
          onEdit={onEdit}
        />
      ))}
    </>
  );
});

/**
 * Skeleton loader for wallet list
 */
const WalletListSkeleton = memo(() => (
  <>
    {Array(2)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6"
        >
          <WalletCardSkeleton />
        </div>
      ))}
  </>
));

WalletListHeader.displayName = 'WalletListHeader';
WalletsList.displayName = 'WalletsList';
WalletListSkeleton.displayName = 'WalletListSkeleton';

export default YourWalletsTab;
