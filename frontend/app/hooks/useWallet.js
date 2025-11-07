import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useEffect } from 'react';
import {
  setConnecting,
  addWallet,
  removeWallet,
  setDefaultWallet,
  setError,
  clearWallets,
  setWalletData,
  setFetchingData,
} from '../store/walletSlice';
import { hashpackService } from '../../services/hashpackService';
import { hederaService } from '../../services/hederaService';

export const useWallet = () => {
  const dispatch = useDispatch();
  const {
    wallets,
    defaultWallet,
    isConnecting,
    error,
    walletsData,
    isFetchingData,
  } = useSelector((state) => state.wallet);

  // Initialize HashConnect on mount
  useEffect(() => {
    const init = async () => {
      try {
        await hashpackService.initialize();

        // Check if already connected (from previous session)
        if (hashpackService.isConnected()) {
          const accountIds = hashpackService.getConnectedAccountIds();
          accountIds.forEach((accountId) => {
            const wallet = {
              accountId,
              address: accountId,
              walletType: 'hashpack',
              network: 'testnet',
              isDefault: false,
              connectedAt: Date.now(),
            };
            dispatch(addWallet(wallet));
          });


        }
      } catch (err) {
        console.error('Failed to initialize HashConnect:', err);
        dispatch(setError('Failed to initialize wallet service'));
      }
    };

    init();
  }, [dispatch]);

  // Load wallets from localStorage on mount (only once)
  useEffect(() => {
    const savedWallets = localStorage.getItem('connectedWallets');
    if (savedWallets) {
      try {
        const parsed = JSON.parse(savedWallets);
        // Only add wallets that aren't already in state
        parsed.forEach((wallet) => {
          const exists = wallets.find((w) => w.accountId === wallet.accountId);
          if (!exists) {
            dispatch(addWallet(wallet));
          }
        });


      } catch (err) {
        console.error('Error loading saved wallets:', err);
        localStorage.removeItem('connectedWallets');
      }
    }

    const savedDefault = localStorage.getItem('defaultWallet');
    if (savedDefault) {
      dispatch(setDefaultWallet(savedDefault));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - run only once on mount

  // Save wallets to localStorage when they change
  useEffect(() => {
    if (wallets.length > 0) {
      localStorage.setItem('connectedWallets', JSON.stringify(wallets));
    } else {
      localStorage.removeItem('connectedWallets');
    }
  }, [wallets]);

  // Save default wallet to localStorage
  useEffect(() => {
    if (defaultWallet) {
      localStorage.setItem('defaultWallet', defaultWallet);
    } else {
      localStorage.removeItem('defaultWallet');
    }
  }, [defaultWallet]);

  const connectWallet = useCallback(async () => {
    dispatch(setConnecting(true));
    dispatch(setError(null));

    try {
      // Get all accounts from HashPack
      const allAccounts = await hashpackService.connectWallet();

      // Filter out accounts that are already connected
      const newAccounts = allAccounts.filter(
        (account) => !wallets.some((w) => w.accountId === account.accountId)
      );

      // Add only new accounts to Redux store
      newAccounts.forEach((walletData, index) => {
        const newWallet = {
          accountId: walletData.accountId,
          address: walletData.address,
          walletType: 'hashpack',
          network: walletData.network,
          isDefault: wallets.length === 0 && index === 0,
          connectedAt: Date.now(),
        };
        dispatch(addWallet(newWallet));
      });

      // Fetch account data for all newly connected accounts
      if (newAccounts.length > 0) {
        await fetchAllWalletsData(newAccounts.map((a) => a.accountId));
      }



      // If reconnecting and no new accounts, still return the existing ones
      if (newAccounts.length === 0 && allAccounts.length > 0) {
        console.log('All accounts already connected');
        return wallets.filter((w) =>
          allAccounts.some((a) => a.accountId === w.accountId)
        );
      }

      return allAccounts;
    } catch (err) {
      const errorMsg = err?.message || 'Failed to connect wallet';
      dispatch(setError(errorMsg));
      throw err;
    } finally {
      dispatch(setConnecting(false));
    }
  }, [dispatch, wallets]);

  const disconnectWallet = useCallback(
    async (accountId) => {
      try {
        // Disconnect from HashPack
        await hashpackService.disconnectWallet();

        // Remove wallet from Redux store
        dispatch(removeWallet(accountId));

        // Clear localStorage to prevent re-adding on next connect
        const savedWallets = localStorage.getItem('connectedWallets');
        if (savedWallets) {
          try {
            const parsed = JSON.parse(savedWallets);
            const filtered = parsed.filter((w) => w.accountId !== accountId);
            if (filtered.length > 0) {
              localStorage.setItem(
                'connectedWallets',
                JSON.stringify(filtered)
              );
            } else {
              localStorage.removeItem('connectedWallets');
            }
          } catch (err) {
            console.error('Error updating saved wallets:', err);
          }
        }
      } catch (err) {
        const errorMsg = err?.message || 'Failed to disconnect wallet';
        dispatch(setError(errorMsg));
        throw err;
      }
    },
    [dispatch]
  );

  const changeDefaultWallet = useCallback(
    (accountId) => {
      dispatch(setDefaultWallet(accountId));
    },
    [dispatch]
  );

  const disconnectAll = useCallback(async () => {
    try {
      await hashpackService.disconnectWallet();
      dispatch(clearWallets());

      // Clear localStorage
      localStorage.removeItem('connectedWallets');
      localStorage.removeItem('defaultWallet');
    } catch (err) {
      const errorMsg = err?.message || 'Failed to disconnect wallets';
      dispatch(setError(errorMsg));
      throw err;
    }
  }, [dispatch]);

  const getDefaultWallet = useCallback(() => {
    return wallets.find((w) => w.accountId === defaultWallet) || null;
  }, [wallets, defaultWallet]);

  const sendTransaction = useCallback(
    async (transaction, accountId) => {
      const walletToUse = accountId || defaultWallet;

      if (!walletToUse) {
        throw new Error('No wallet selected');
      }

      try {
        const response = await hashpackService.sendTransaction(
          walletToUse,
          transaction
        );
        return response;
      } catch (err) {
        console.error('Transaction failed:', err);
        throw err;
      }
    },
    [defaultWallet]
  );

  const fetchWalletData = useCallback(
    async (accountId) => {
      dispatch(setFetchingData(true));

      try {
        const balanceData = await hederaService.getAccountBalance(accountId);
        const transactions = await hederaService.getAccountTransactions(
          accountId,
          10
        );

        dispatch(
          setWalletData({
            accountId,
            data: {
              balance: balanceData.hbarBalance,
              balanceUSD: balanceData.balance,
              transactions,
            },
          })
        );
      } catch (err) {
        console.error(`Error fetching data for ${accountId}:`, err);
      } finally {
        dispatch(setFetchingData(false));
      }
    },
    [dispatch]
  );

  const fetchAllWalletsData = useCallback(
    async (accountIds) => {
      dispatch(setFetchingData(true));

      try {
        await Promise.all(
          accountIds.map((accountId) => fetchWalletData(accountId))
        );
      } catch (err) {
        console.error('Error fetching wallets data:', err);
      } finally {
        dispatch(setFetchingData(false));
      }
    },
    [dispatch, fetchWalletData]
  );

  // Fetch data for all wallets on mount or when wallets change
  useEffect(() => {
    if (wallets.length > 0) {
      const accountIds = wallets.map((w) => w.accountId);
      fetchAllWalletsData(accountIds);
    }
  }, [wallets.length]);

  return {
    wallets,
    defaultWallet: getDefaultWallet(),
    isConnecting,
    error,
    walletsData,
    isFetchingData,
    connectWallet,
    disconnectWallet,
    changeDefaultWallet,
    disconnectAll,
    sendTransaction,
    fetchWalletData,
    fetchAllWalletsData,
  };
};
