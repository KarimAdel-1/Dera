import React, { useState, useEffect } from 'react';
import { Wallet, Plus, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import {
  connectWallet,
  setWalletDetails,
  setWalletLoading,
  setDefaultWallet,
  createTempWallet,
  updateTempWallet,
  deleteTempWallet,
  updateWallet,
  saveWalletToSupabase,
  setWalletData,
  setHbarPrice,
} from '../store/walletSlice';
import { supabaseService } from '../../services/supabaseService';
import { toast } from 'react-hot-toast';
import { WalletCardSkeleton, WalletDetailsSkeleton } from './SkeletonLoaders';
import WalletStatsCards from './wallet/WalletStatsCards';
import WalletCard from './wallet/WalletCard';
import WalletDetails from './wallet/WalletDetails';

const YourWalletsTab = () => {
  const {
    address,
    isConnected,
    walletType,
    network,
    walletDetails,
    wallets,
    activeWalletId,
    tempWallet,
    walletsData,
    currentUser,
    hbarPrice,
  } = useSelector((state) => state.wallet);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  console.log('Wallets array:', wallets);
  console.log('Temp wallet:', tempWallet);

  const [showModal, setShowModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);

  const [isConnecting, setIsConnecting] = useState(false);
  const [newlyConnectedWallet, setNewlyConnectedWallet] = useState(null);
  const [selectedSkin, setSelectedSkin] = useState('Card-1.png');
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [activeAssetsTab, setActiveAssetsTab] = useState('fungible');

  const cardSkins = [
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

  const formatAddress = (addr) => {
    if (!addr) return 'Not Connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const connectToHashPack = async () => {
    // Always create fresh temp wallet
    dispatch(createTempWallet({ walletType: 'hashpack' }));

    setIsConnecting(true);
    try {
      const { hashpackService } = await import(
        '../../services/hashpackService'
      );
      const accounts = await hashpackService.connectWallet();

      if (accounts && accounts.length > 0) {
        // Find accounts that aren't already connected
        const existingAddresses = wallets.map((w) => w.address);
        const newAccounts = accounts.filter(
          (acc) => !existingAddresses.includes(acc.accountId)
        );

        if (newAccounts.length > 0) {
          // Use the first new account
          const newAccount = newAccounts[0];

          // Update temp wallet with actual connected wallet data
          dispatch(
            updateTempWallet({
              id: `temp_hashpack_${newAccount.accountId.replace(/\./g, '_')}`,
              walletAddress: newAccount.accountId,
              walletId: newAccount.accountId,
              connectedAt: new Date().toISOString(),
            })
          );

          const walletData = {
            address: newAccount.accountId,
            walletType: 'hashpack',
            cardSkin: tempWallet?.cardSkin || 'Card-1.png',
            walletId: newAccount.accountId,
            connectedAt: new Date().toISOString(),
          };

          dispatch(connectWallet(walletData));

          // Save to Supabase using temp wallet data
          await dispatch(saveWalletToSupabase(walletData));

          setNewlyConnectedWallet({
            address: newAccount.accountId,
            walletType: 'hashpack',
          });
        }

        // Don't close modal immediately, let user see success state
        // Modal will be closed when user clicks Confirm button
      }
    } catch (error) {
      console.error('HashPack connection failed:', error);
      dispatch(deleteTempWallet());
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const handleHashPackConnection = (event) => {
      const walletData = {
        address: event.detail.address,
        walletType: event.detail.walletType,
        cardSkin: 'Card-1.png',
      };

      // Save to Supabase
      dispatch(saveWalletToSupabase(walletData));

      setNewlyConnectedWallet(event.detail);
    };

    window.addEventListener('hashpackConnected', handleHashPackConnection);
    return () =>
      window.removeEventListener('hashpackConnected', handleHashPackConnection);
  }, [dispatch]);

  // Load user's wallets from Supabase when currentUser changes

  useEffect(() => {
    const loadUserWallets = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const userWallets = await supabaseService.getUserWallets(
            currentUser.id
          );
          userWallets.forEach(async (wallet) => {
            dispatch(
              connectWallet({
                address: wallet.wallet_address,
                walletType: wallet.wallet_type,
                cardSkin: wallet.card_skin,
              })
            );

            // Fetch balance and transactions for each wallet
            try {
              const { hederaService } = await import(
                '../../services/hederaService'
              );
              const balanceData = await hederaService.getAccountBalance(
                wallet.wallet_address
              );
              const transactions = await hederaService.getAccountTransactions(
                wallet.wallet_address,
                10
              );

              // Fetch token balances and NFTs
              const tokenBalances = await hederaService.getTokenBalances(
                wallet.wallet_address
              );

              console.log(
                'Account Holdings for',
                wallet.wallet_address,
                ':',
                tokenBalances
              );
              console.log('Token count:', tokenBalances?.length || 0);
              if (tokenBalances && tokenBalances.length > 0) {
                tokenBalances.forEach((token, index) => {
                  console.log(`Token ${index + 1}:`, {
                    token_id: token.token_id,
                    type: token.type,
                    balance: token.balance,
                    decimals: token.decimals,
                  });
                });
              }

              dispatch(
                setWalletData({
                  accountId: wallet.wallet_address,
                  data: {
                    hbarBalance: balanceData.hbarBalance,
                    transactions,
                    tokenBalances: tokenBalances || [],
                  },
                })
              );
            } catch (error) {
              console.error(
                `Error fetching data for wallet ${wallet.wallet_address}:`,
                error
              );
            }
          });
          setTimeout(() => setIsLoading(false), 1500);
        } catch (error) {
          console.error('Failed to load user wallets:', error);
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadUserWallets();
  }, [currentUser, dispatch]);

  // Fetch HBAR price
  useEffect(() => {
    const fetchHbarPrice = async () => {
      const { priceService } = await import('../../services/priceService');
      const price = await priceService.fetchHbarPrice();
      dispatch(setHbarPrice(price));
    };

    fetchHbarPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchHbarPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const updateAllWalletDetails = async () => {
      if (wallets.length === 0) return;

      dispatch(setWalletLoading(true));
      try {
        // Mock wallet details without HBAR price fetching
        dispatch(
          setWalletDetails({
            balance: '$0.00',
            hbarBalance: '0',
            network: network,
          })
        );
      } catch (error) {
        console.error('Failed to update wallet details:', error);
      } finally {
        dispatch(setWalletLoading(false));
      }
    };

    updateAllWalletDetails();
  }, [wallets.length, network, dispatch]);

  const connectToKabila = async () => {
    if (!tempWallet) return;

    setIsConnecting(true);
    try {
      if (window.kabila && window.kabila.isKabila) {
        const accounts = await window.kabila.request({
          method: 'hedera_requestAccounts',
        });
        const address = accounts[0];
        if (address) {
          const walletData = {
            address,
            walletType: 'kabila',
            cardSkin: tempWallet.cardSkin,
          };

          dispatch(connectWallet(walletData));

          // Save to Supabase
          dispatch(saveWalletToSupabase(walletData));

          dispatch(deleteTempWallet());
          setNewlyConnectedWallet({ address, walletType: 'kabila' });
          setTimeout(() => {
            setShowModal(false);
            setNewlyConnectedWallet(null);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Kabila connection failed:', error);
      dispatch(deleteTempWallet());
    } finally {
      setIsConnecting(false);
    }
  };

  const connectToBlade = async () => {
    if (!tempWallet) return;

    setIsConnecting(true);
    try {
      if (window.bladeWallet) {
        const result = await window.bladeWallet.connect();
        if (result.accountId) {
          const walletData = {
            address: result.accountId,
            walletType: 'blade',
            cardSkin: tempWallet.cardSkin,
          };

          dispatch(connectWallet(walletData));

          // Save to Supabase
          dispatch(saveWalletToSupabase(walletData));

          dispatch(deleteTempWallet());
          setNewlyConnectedWallet({
            address: result.accountId,
            walletType: 'blade',
          });
          setTimeout(() => {
            setShowModal(false);
            setNewlyConnectedWallet(null);
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Blade connection failed:', error);
      dispatch(deleteTempWallet());
    } finally {
      setIsConnecting(false);
    }
  };

  const refreshWalletDetails = async () => {
    if (!address || !isConnected) return;

    dispatch(setWalletLoading(true));
    try {
      // Mock wallet details
      dispatch(
        setWalletDetails({
          balance: '$0.00',
          hbarBalance: '0',
          network: network,
        })
      );
    } catch (error) {
      console.error('Failed to refresh wallet details:', error);
    } finally {
      dispatch(setWalletLoading(false));
    }
  };

  return (
    <div className="space-y-6 p-0 sm:p-6">
      <WalletStatsCards 
        isLoading={isLoading}
        wallets={wallets}
        walletsData={walletsData}
        hbarPrice={hbarPrice}
        walletDetails={walletDetails}
        network={network}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
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
              onClick={() => {
                dispatch(createTempWallet({ walletType: 'hashpack' }));
                console.log('Created temp wallet');
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-9 px-4 py-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Connect New Wallet
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              Array(2)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6"
                  >
                    <WalletCardSkeleton />
                  </div>
                ))
            ) : wallets.length > 0 ? (
              [...wallets]
                .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
                .map((wallet, index) => (
                  <WalletCard
                    key={wallet.id || `wallet-${index}`}
                    wallet={wallet}
                    activeWalletId={activeWalletId}
                    walletsData={walletsData}
                    hbarPrice={hbarPrice}
                    network={network}
                    onEdit={(wallet) => {
                      setEditingWallet(wallet)
                      setShowModal(true)
                    }}
                  />
                ))
            ) : (
              <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border p-4 sm:p-6 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-muted)]" />
                <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-2">
                  No Wallet Connected
                </h3>
                <p className="text-[var(--color-text-muted)] text-sm">
                  Connect your crypto wallet to view your assets
                </p>
              </div>
            )}
          </div>
        </div>

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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          ></div>
          <div className="relative bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-xl max-w-4xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[var(--color-text-primary)] text-xl font-semibold">
                {editingWallet ? 'Change Card Design' : 'Connect New Wallet'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingWallet(null);
                }}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
                Choose Card Design
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {cardSkins.map((skin) => (
                  <label key={skin} className="cursor-pointer">
                    <input
                      type="radio"
                      name="cardSkin"
                      value={skin}
                      checked={
                        editingWallet
                          ? editingWallet.cardSkin === skin
                          : tempWallet?.cardSkin === skin
                      }
                      onChange={() => {
                        if (editingWallet) {
                          setEditingWallet({
                            ...editingWallet,
                            cardSkin: skin,
                          });
                        } else {
                          dispatch(updateTempWallet({ cardSkin: skin }));
                        }
                      }}
                      className="sr-only"
                    />
                    <div
                      className={`rounded-lg overflow-hidden transition-all ${
                        (
                          editingWallet
                            ? editingWallet.cardSkin === skin
                            : tempWallet?.cardSkin === skin
                        )
                          ? 'ring-2 ring-[var(--color-primary)] scale-105'
                          : 'hover:scale-102'
                      }`}
                    >
                      <div
                        className="w-full h-24 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(/assets/cards/${skin})`,
                        }}
                      ></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {!newlyConnectedWallet && !editingWallet ? (
              <div className="mb-6">
                <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-4">
                  Select Wallet Type
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      dispatch(updateTempWallet({ walletType: 'hashpack' }));
                      connectToHashPack();
                    }}
                    disabled={isConnecting}
                    className="flex items-center justify-center gap-3 px-4 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--color-border-primary)]"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">H</span>
                    </div>
                    HashPack
                  </button>

                  {!wallets.some((w) => w.walletType === 'kabila') && (
                    <button
                      onClick={() => {
                        dispatch(updateTempWallet({ walletType: 'kabila' }));
                        connectToKabila();
                      }}
                      disabled={isConnecting}
                      className="flex items-center justify-center gap-3 px-4 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--color-border-primary)]"
                    >
                      <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">K</span>
                      </div>
                      Kabila
                    </button>
                  )}

                  {!wallets.some((w) => w.walletType === 'blade') && (
                    <button
                      onClick={() => {
                        dispatch(updateTempWallet({ walletType: 'blade' }));
                        connectToBlade();
                      }}
                      disabled={isConnecting}
                      className="flex items-center justify-center gap-3 px-4 py-3 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg transition-colors disabled:opacity-50 border border-[var(--color-border-primary)]"
                    >
                      <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">B</span>
                      </div>
                      Blade Wallet
                    </button>
                  )}
                </div>
              </div>
            ) : newlyConnectedWallet && !editingWallet ? (
              <div className="mb-6 p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-green-500/30">
                <h3 className="text-[var(--color-text-primary)] text-lg font-medium mb-3">
                  Wallet Connected!
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[var(--color-text-secondary)] text-sm">
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
                          const wallet = wallets.find(
                            (w) =>
                              w.address === newlyConnectedWallet.address &&
                              w.walletType === newlyConnectedWallet.walletType
                          );
                          if (wallet) dispatch(setDefaultWallet(wallet.id));
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
            ) : null}

            <div className="flex justify-end items-center">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNewlyConnectedWallet(null);
                    setEditingWallet(null);
                    dispatch(deleteTempWallet());
                  }}
                  className="px-4 py-2 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] rounded-md hover:bg-[var(--color-bg-card)]/70 transition-colors"
                >
                  Cancel
                </button>
                {(editingWallet || newlyConnectedWallet) && (
                  <button
                    onClick={async () => {
                      if (editingWallet) {
                        // Update Redux state
                        dispatch(
                          updateWallet({
                            id: editingWallet.id,
                            updates: { cardSkin: editingWallet.cardSkin },
                          })
                        );

                        // Update database
                        try {
                          await supabaseService.updateWalletCardSkin(
                            editingWallet.address,
                            editingWallet.cardSkin
                          );
                          toast.success('Card design updated!');
                        } catch (error) {
                          console.error(
                            'Failed to update card skin in database:',
                            error
                          );
                          toast.error('Failed to save card design');
                        }
                      }
                      // Clean up temp wallet after confirmation
                      dispatch(deleteTempWallet());
                      setShowModal(false);
                      setNewlyConnectedWallet(null);
                      setEditingWallet(null);
                    }}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary)]/90 transition-colors"
                  >
                    Confirm
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAssetsModal(false)}
          ></div>
          <div className="relative bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-xl w-[600px] h-[500px] overflow-hidden">
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
                onClick={() => setShowAssetsModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-[var(--color-border-primary)] mb-4">
              <button
                onClick={() => setActiveAssetsTab('fungible')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeAssetsTab === 'fungible'
                    ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Fungible Tokens
              </button>
              <button
                onClick={() => setActiveAssetsTab('nfts')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeAssetsTab === 'nfts'
                    ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                NFTs
              </button>
            </div>

            <div className="overflow-y-auto h-80">
              {(() => {
                const activeWallet = wallets.find(
                  (w) => w.id === activeWalletId
                );
                const walletData = activeWallet
                  ? walletsData[activeWallet.address]
                  : null;
                const tokenBalances = walletData?.tokenBalances || [];

                const fungibleTokens = tokenBalances.filter(
                  (token) => token.type !== 'NON_FUNGIBLE_UNIQUE'
                );
                const nfts = tokenBalances.filter(
                  (token) => token.type === 'NON_FUNGIBLE_UNIQUE'
                );

                // Add mock NFT for UI testing
                const mockNFT = {
                  token_id: '0.0.1234567',
                  type: 'NON_FUNGIBLE_UNIQUE',
                  balance: 1,
                  name: 'Hedera Punk #1337',
                };

                const currentTokens =
                  activeAssetsTab === 'fungible'
                    ? fungibleTokens
                    : [...nfts, mockNFT];

                if (
                  activeAssetsTab === 'fungible' &&
                  currentTokens.length === 0
                ) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-[var(--color-text-muted)] text-sm">
                        No fungible tokens found
                      </p>
                    </div>
                  );
                }

                if (activeAssetsTab === 'nfts') {
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {currentTokens.map((token, index) => (
                        <div
                          key={index}
                          className="bg-[var(--color-bg-tertiary)]/20 rounded-lg border border-[var(--color-border-primary)] overflow-hidden hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer"
                        >
                          <div className="aspect-square bg-gradient-to-br from-gray-200/80 to-white/60 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center border border-gray-300">
                              <span className="text-gray-700 text-lg font-bold">
                                NFT
                              </span>
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
                  );
                }

                return (
                  <div className="space-y-3">
                    {currentTokens.map((token, index) => (
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
                            {(
                              token.balance / Math.pow(10, token.decimals || 0)
                            ).toFixed(token.decimals > 0 ? 2 : 0)}
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
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default YourWalletsTab;
