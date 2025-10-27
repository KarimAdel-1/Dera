import { useState, useEffect, useCallback } from 'react';
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

/**
 * Custom hook for managing wallet operations
 * Handles wallet connections, data fetching, and user interactions
 */
export const useWalletManagement = () => {
  const dispatch = useDispatch();
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

  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [newlyConnectedWallet, setNewlyConnectedWallet] = useState(null);

  // Load user's wallets from Supabase when currentUser changes
  useEffect(() => {
    const loadUserWallets = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Initialize hashpackService if not already initialized
        const { hashpackService } = await import('../../services/hashpackService');
        if (!hashpackService.getHashConnect()) {
          await hashpackService.initialize();
        }

        const userWallets = await supabaseService.getUserWallets(currentUser.id);

        // Load wallets in parallel
        await Promise.all(
          userWallets.map(async (wallet) => {
            dispatch(
              connectWallet({
                address: wallet.wallet_address,
                walletType: wallet.wallet_type,
                cardSkin: wallet.card_skin,
                isActive: wallet.is_active,
              })
            );

            // Fetch wallet data
            try {
              const { hederaService } = await import('../../services/hederaService');
              const [balanceData, transactions, tokenBalances] = await Promise.all([
                hederaService.getAccountBalance(wallet.wallet_address),
                hederaService.getAccountTransactions(wallet.wallet_address, 10),
                hederaService.getTokenBalances(wallet.wallet_address),
              ]);

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
          })
        );

        setTimeout(() => setIsLoading(false), 1500);
      } catch (error) {
        console.error('Failed to load user wallets:', error);
        setIsLoading(false);
      }
    };

    loadUserWallets();
  }, [currentUser, dispatch]);

  // Fetch HBAR price with auto-refresh
  useEffect(() => {
    const fetchHbarPrice = async () => {
      const { priceService } = await import('../../services/priceService');
      const price = await priceService.fetchHbarPrice();
      dispatch(setHbarPrice(price));
    };

    fetchHbarPrice();
    const interval = setInterval(fetchHbarPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Update wallet details when wallets change
  useEffect(() => {
    const updateAllWalletDetails = async () => {
      if (wallets.length === 0) return;

      dispatch(setWalletLoading(true));
      try {
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

  // HashPack connection/disconnection event listeners
  useEffect(() => {
    const handleHashPackConnection = async (event) => {
      const walletData = {
        address: event.detail.address,
        walletType: event.detail.walletType,
        cardSkin: 'Card-1.png',
      };

      dispatch(saveWalletToSupabase(walletData));
      setNewlyConnectedWallet(event.detail);
      
      const { toast } = await import('react-hot-toast');
      toast.success('Wallet connected successfully!');
    };

    const handleHashPackDisconnection = async (event) => {
      const disconnectedAddress = event.detail.address;
      
      if (currentUser && disconnectedAddress) {
        try {
          await supabaseService.deactivateWallet(currentUser.id, disconnectedAddress);
          
          // Update wallet state
          const wallet = wallets.find(w => w.address === disconnectedAddress);
          if (wallet) {
            dispatch(updateWallet({ id: wallet.id, updates: { isActive: false } }));
          }
          
          const { toast } = await import('react-hot-toast');
          toast.error('Wallet disconnected');
        } catch (error) {
          console.error('Failed to handle wallet disconnection:', error);
        }
      }
    };

    window.addEventListener('hashpackConnected', handleHashPackConnection);
    window.addEventListener('hashpackDisconnected', handleHashPackDisconnection);
    
    return () => {
      window.removeEventListener('hashpackConnected', handleHashPackConnection);
      window.removeEventListener('hashpackDisconnected', handleHashPackDisconnection);
    };
  }, [dispatch, currentUser, wallets]);

  // Connect to HashPack
  const connectToHashPack = useCallback(async () => {
    dispatch(createTempWallet({ walletType: 'hashpack' }));
    setIsConnecting(true);

    try {
      const { walletManager } = await import('../../services/MultiWalletManager');
      const accountIds = await walletManager.connectWallet();

      if (accountIds && accountIds.length > 0) {
        const existingAddresses = wallets.map((w) => w.address);
        const newAccountIds = accountIds.filter(
          (id) => !existingAddresses.includes(id)
        );

        if (newAccountIds.length === 0) {
          const { toast } = await import('react-hot-toast');
          toast.error('Wallet is already connected');
          dispatch(deleteTempWallet());
          return;
        }

        if (newAccountIds.length > 0) {
          const newAccountId = newAccountIds[0];

          dispatch(
            updateTempWallet({
              id: `temp_hashpack_${newAccountId.replace(/\./g, '_')}`,
              walletAddress: newAccountId,
              walletId: newAccountId,
              connectedAt: new Date().toISOString(),
            })
          );

          const walletData = {
            address: newAccountId,
            walletType: 'hashpack',
            cardSkin: tempWallet?.cardSkin || 'Card-1.png',
            walletId: newAccountId,
            connectedAt: new Date().toISOString(),
          };

          dispatch(connectWallet(walletData));
          await dispatch(saveWalletToSupabase(walletData));

          setNewlyConnectedWallet({
            address: newAccountId,
            walletType: 'hashpack',
          });

          // Register with walletManager
          walletManager.registerWallet(newAccountId);

          // Fetch wallet data for the newly connected wallet
          try {
            const { hederaService } = await import('../../services/hederaService');
            const [balanceData, transactions, tokenBalances] = await Promise.all([
              hederaService.getAccountBalance(newAccountId),
              hederaService.getAccountTransactions(newAccountId, 10),
              hederaService.getTokenBalances(newAccountId),
            ]);

            dispatch(
              setWalletData({
                accountId: newAccountId,
                data: {
                  hbarBalance: balanceData.hbarBalance,
                  transactions,
                  tokenBalances: tokenBalances || [],
                },
              })
            );
          } catch (error) {
            console.error(`Error fetching data for new wallet ${newAccountId}:`, error);
          }
        }
      } else {
        const { toast } = await import('react-hot-toast');
        toast.error('Wallet connection was cancelled');
        dispatch(deleteTempWallet());
      }
    } catch (error) {
      console.error('HashPack connection failed:', error);
      const { toast } = await import('react-hot-toast');
      if (error.message?.includes('Connection timeout')) {
        toast.error('Connection timeout - please try again');
      } else {
        toast.error('Failed to connect wallet');
      }
      dispatch(deleteTempWallet());
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch, wallets, tempWallet]);



  // Reconnect a disconnected wallet
  const reconnectWallet = useCallback(async (walletToReconnect) => {
    if (!walletToReconnect) return;

    setIsConnecting(true);
    console.log('🔄 Reconnecting wallet:', walletToReconnect.address);

    try {
      const { walletManager } = await import('../../services/MultiWalletManager');
      const { toast } = await import('react-hot-toast');

      // Open HashConnect pairing modal
      toast.loading('Opening HashPack...');
      const accountIds = await walletManager.connectWallet();

      if (accountIds && accountIds.length > 0) {
        const connectedAddress = accountIds[0];

        // Verify it's the same wallet
        if (connectedAddress !== walletToReconnect.address) {
          toast.dismiss();
          toast.error(`Please connect with wallet ${walletToReconnect.address}`);
          // Disconnect the wrong wallet
          await walletManager.disconnectWallet(connectedAddress);
          setIsConnecting(false);
          return;
        }

        // Reactivate the wallet in database
        if (currentUser) {
          const { supabaseService } = await import('../../services/supabaseService');
          await supabaseService.reactivateWallet(currentUser.id, walletToReconnect.address);
        }

        // Update wallet in Redux to mark as active
        dispatch(updateWallet({
          id: walletToReconnect.id,
          updates: {
            isActive: true,
            connectedAt: new Date().toISOString()
          }
        }));

        // Register with walletManager
        walletManager.registerWallet(connectedAddress);

        toast.dismiss();
        toast.success('Wallet reconnected successfully!');
      } else {
        toast.dismiss();
        toast.error('Connection was cancelled');
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
      const { toast } = await import('react-hot-toast');
      toast.dismiss();

      if (error.message?.includes('Connection timeout')) {
        toast.error('Connection timeout - please try again');
      } else {
        toast.error('Failed to reconnect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch, currentUser, wallets]);

  // Refresh wallet details
  const refreshWalletDetails = useCallback(async () => {
    if (!address || !isConnected) return;

    dispatch(setWalletLoading(true));
    try {
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
  }, [address, isConnected, network, dispatch]);

  // Update wallet card skin
  const updateWalletCardSkin = useCallback(
    async (walletId, address, newCardSkin) => {
      dispatch(
        updateWallet({
          id: walletId,
          updates: { cardSkin: newCardSkin },
        })
      );

      try {
        await supabaseService.updateWalletCardSkin(address, newCardSkin);
        return { success: true };
      } catch (error) {
        console.error('Failed to update card skin in database:', error);
        return { success: false, error };
      }
    },
    [dispatch]
  );

  return {
    // State
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

    // Actions
    connectToHashPack,
    reconnectWallet,
    refreshWalletDetails,
    updateWalletCardSkin,
    setNewlyConnectedWallet,

    // Dispatch helpers
    dispatch,
    createTempWallet: () => dispatch(createTempWallet({ walletType: 'hashpack' })),
    updateTempWallet: (updates) => dispatch(updateTempWallet(updates)),
    deleteTempWallet: () => dispatch(deleteTempWallet()),
    setDefaultWallet: (id) => dispatch(setDefaultWallet(id)),
  };
};
