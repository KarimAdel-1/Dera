import { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setWalletData, setFetchingData, connectWallet, setHbarPrice } from '../store/walletSlice';
import { hederaService } from '../../services/hederaService';
import { supabaseService } from '../../services/supabaseService';

/**
 * Custom hook for managing transaction data and statistics
 * Handles fetching, filtering, and calculating transaction metrics
 */
export const useTransactions = () => {
  const dispatch = useDispatch();
  const {
    wallets,
    walletsData,
    currentUser,
    hbarPrice,
    isFetchingData
  } = useSelector((state) => state.wallet);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedWalletFilter, setSelectedWalletFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hbarPriceUSD, setHbarPriceUSD] = useState(0);

  const transactionsPerPage = 10;

  // Load wallets from database when component mounts
  useEffect(() => {
    const loadWallets = async () => {
      if (!currentUser) return;

      try {
        const userWallets = await supabaseService.getUserWallets(currentUser.id);
        const existingAddresses = wallets.map(w => w.address);
        const newWallets = userWallets.filter(wallet =>
          !existingAddresses.includes(wallet.wallet_address)
        );

        newWallets.forEach(wallet => {
          dispatch(connectWallet({
            address: wallet.wallet_address,
            walletType: wallet.wallet_type,
            cardSkin: wallet.card_skin,
          }));
        });
      } catch (error) {
        console.error('Error loading wallets:', error);
      }
    };

    loadWallets();
  }, [currentUser, dispatch]);

  // Fetch HBAR price
  useEffect(() => {
    const fetchHbarPrice = async () => {
      const { priceService } = await import('../../services/priceService');
      const price = await priceService.fetchHbarPrice();
      setHbarPriceUSD(price);
      dispatch(setHbarPrice(price));
    };

    fetchHbarPrice();
    const interval = setInterval(fetchHbarPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Fetch wallet data when wallets are available
  useEffect(() => {
    const fetchWalletData = async () => {
      if (wallets.length === 0) return;

      dispatch(setFetchingData(true));

      try {
        await Promise.all(
          wallets.map(async (wallet) => {
            const balanceData = await hederaService.getAccountBalance(wallet.address);
            const transactions = await hederaService.getAccountTransactions(wallet.address, 100);

            dispatch(setWalletData({
              accountId: wallet.address,
              data: {
                hbarBalance: balanceData.hbarBalance,
                transactions,
              },
            }));
          })
        );
      } catch (error) {
        console.error('Error fetching wallet data:', error);
      } finally {
        dispatch(setFetchingData(false));
      }
    };

    fetchWalletData();
  }, [wallets, dispatch]);

  // Get all transactions from all wallets
  const allTransactions = useMemo(() => {
    const transactions = [];
    wallets.forEach(wallet => {
      const walletData = walletsData[wallet.address];
      if (walletData?.transactions) {
        walletData.transactions.forEach(tx => {
          transactions.push({
            ...tx,
            walletAddress: wallet.address,
            walletId: wallet.id
          });
        });
      }
    });
    return transactions.sort((a, b) => b.consensus_timestamp - a.consensus_timestamp);
  }, [wallets, walletsData]);

  // Calculate transaction statistics
  const statistics = useMemo(() => {
    let received = 0;
    let sent = 0;
    let fees = 0;

    const transactionsToCalculate = allTransactions.filter(tx =>
      selectedWalletFilter === 'all' || tx.walletId === selectedWalletFilter
    );

    transactionsToCalculate.forEach(tx => {
      const transfer = tx.transfers?.find(t => t.account === tx.walletAddress);
      const amount = transfer ? transfer.amount : 0;

      if (amount > 0) {
        received += amount / 100000000;
      } else {
        sent += Math.abs(amount) / 100000000;
      }
      fees += (tx.charged_tx_fee || 0) / 100000000;
    });

    return {
      totalReceived: received,
      totalSent: sent,
      netBalance: received - sent,
      totalFees: fees,
    };
  }, [allTransactions, selectedWalletFilter]);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      // Search filter
      const matchesSearch = !searchTerm ||
        tx.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const transfer = tx.transfers?.find(t => t.account === tx.walletAddress);
      const txType = transfer && transfer.amount > 0 ? 'Received' : 'Sent';
      const status = tx.result === 'SUCCESS' ? 'completed' : 'pending';

      const matchesFilter = selectedFilter === 'all' ||
        (selectedFilter === 'received' && txType === 'Received') ||
        (selectedFilter === 'sent' && txType === 'Sent') ||
        (selectedFilter === 'pending' && status === 'pending') ||
        (selectedFilter === 'completed' && status === 'completed');

      // Wallet filter
      const matchesWallet = selectedWalletFilter === 'all' ||
        tx.walletId === selectedWalletFilter;

      return matchesSearch && matchesFilter && matchesWallet;
    });
  }, [allTransactions, searchTerm, selectedFilter, selectedWalletFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + transactionsPerPage
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, selectedWalletFilter]);

  // Helper functions
  const getTransactionType = (tx, accountId) => {
    const transfer = tx.transfers?.find(t => t.account === accountId);
    if (!transfer) return 'Unknown';
    return transfer.amount > 0 ? 'Received' : 'Sent';
  };

  const getTransactionAmount = (tx, accountId) => {
    const transfer = tx.transfers?.find(t => t.account === accountId);
    return transfer ? transfer.amount : 0;
  };

  const isLoading = isFetchingData ||
    (wallets.length > 0 && Object.keys(walletsData).length === 0);

  return {
    // Data
    wallets,
    allTransactions,
    filteredTransactions,
    paginatedTransactions,
    statistics,
    hbarPriceUSD,
    isLoading,

    // Filters
    searchTerm,
    setSearchTerm,
    selectedFilter,
    setSelectedFilter,
    selectedWalletFilter,
    setSelectedWalletFilter,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    transactionsPerPage,

    // Helpers
    getTransactionType,
    getTransactionAmount,
  };
};
