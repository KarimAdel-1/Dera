import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter, Coins, Copy, ChevronDown } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { StatCardSkeleton } from './SkeletonLoaders';
import { setWalletData, setFetchingData, connectWallet } from '../store/walletSlice';
import { hederaService } from '../../services/hederaService';
import { supabaseService } from '../../services/supabaseService';

const TransactionsTab = () => {
  const { address, isConnected, transactions, transactionStats, hbarPrice, isLoadingTransactions, wallets, activeWalletId, walletsData, isFetchingData, currentUser } = useSelector((state) => state.wallet);
  const dispatch = useDispatch();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedWalletFilter, setSelectedWalletFilter] = useState('all');
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalSent, setTotalSent] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [totalFees, setTotalFees] = useState(0);
  const [hbarPriceUSD, setHbarPriceUSD] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  // Load wallets from database when component mounts
  useEffect(() => {
    console.log('TransactionsTab - Load wallets effect triggered');
    console.log('currentUser:', currentUser);
    console.log('wallets.length:', wallets.length);
    
    const loadWallets = async () => {
      if (!currentUser) {
        console.log('TransactionsTab - No current user');
        return;
      }
      
      console.log('TransactionsTab - Loading wallets from database...');
      try {
        const userWallets = await supabaseService.getUserWallets(currentUser.id);
        console.log('TransactionsTab - User wallets from DB:', userWallets);
        
        // Check which wallets are not already in Redux state
        const existingAddresses = wallets.map(w => w.address);
        const newWallets = userWallets.filter(wallet => 
          !existingAddresses.includes(wallet.wallet_address)
        );
        
        console.log('TransactionsTab - New wallets to add:', newWallets.length);
        
        newWallets.forEach(wallet => {
          console.log('TransactionsTab - Adding wallet to Redux:', wallet.wallet_address);
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

  // Fetch HBAR price from CoinGecko
  useEffect(() => {
    const fetchHbarPrice = async () => {
      const { priceService } = await import('../../services/priceService');
      const price = await priceService.fetchHbarPrice();
      setHbarPriceUSD(price);
      dispatch(setHbarPrice(price));
    };

    fetchHbarPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchHbarPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Fetch wallet data when wallets are available
  useEffect(() => {
    console.log('TransactionsTab - Fetch data effect triggered');
    console.log('wallets:', wallets);
    console.log('walletsData keys:', Object.keys(walletsData));
    
    const fetchWalletData = async () => {
      if (wallets.length === 0) {
        console.log('TransactionsTab - No wallets to fetch data for');
        return;
      }
      
      console.log('TransactionsTab - Fetching data for', wallets.length, 'wallets');
      dispatch(setFetchingData(true));
      
      try {
        await Promise.all(
          wallets.map(async (wallet) => {
            console.log('TransactionsTab - Fetching data for wallet:', wallet.address);
            const balanceData = await hederaService.getAccountBalance(wallet.address);
            const transactions = await hederaService.getAccountTransactions(wallet.address, 10);
            
            console.log('TransactionsTab - Got', transactions.length, 'transactions for', wallet.address);
            
            dispatch(setWalletData({
              accountId: wallet.address,
              data: {
                hbarBalance: balanceData.hbarBalance,
                transactions,
              },
            }));
          })
        );
        console.log('TransactionsTab - Finished fetching all wallet data');
      } catch (error) {
        console.error('Error fetching wallet data:', error);
      } finally {
        dispatch(setFetchingData(false));
      }
    };

    fetchWalletData();
  }, [wallets, dispatch]);


  const getTransactionType = (tx, accountId) => {
    const transfer = tx.transfers?.find(t => t.account === accountId);
    if (!transfer) return 'Unknown';
    return transfer.amount > 0 ? 'Received' : 'Sent';
  };

  const getTransactionAmount = (tx, accountId) => {
    const transfer = tx.transfers?.find(t => t.account === accountId);
    return transfer ? transfer.amount : 0;
  };

  const formatAmount = (amount) => {
    return (amount / 100000000).toFixed(4);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const openTransactionModal = (tx) => {
    setSelectedTransaction(tx);
    setShowModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Transaction ID copied to clipboard!');
  };
  
  // Get all transactions from all wallets
  const getAllTransactions = () => {
    const allTransactions = [];
    wallets.forEach(wallet => {
      const walletData = walletsData[wallet.address];
      if (walletData?.transactions) {
        walletData.transactions.forEach(tx => {
          allTransactions.push({ ...tx, walletAddress: wallet.address, walletId: wallet.id });
        });
      }
    });
    return allTransactions.sort((a, b) => b.consensus_timestamp - a.consensus_timestamp);
  };

  const allTransactions = getAllTransactions();

  // Calculate aggregated statistics based on wallet filter
  useEffect(() => {
    let received = 0;
    let sent = 0;
    let fees = 0;

    const transactionsToCalculate = allTransactions.filter(tx => 
      selectedWalletFilter === 'all' || tx.walletId === selectedWalletFilter
    );

    transactionsToCalculate.forEach(tx => {
      const amount = getTransactionAmount(tx, tx.walletAddress);
      if (amount > 0) {
        received += amount / 100000000;
      } else {
        sent += Math.abs(amount) / 100000000;
      }
      fees += (tx.charged_tx_fee || 0) / 100000000;
    });

    setTotalReceived(received);
    setTotalSent(sent);
    setNetBalance(received - sent);
    setTotalFees(fees);
  }, [allTransactions, selectedWalletFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFilter, selectedWalletFilter]);

  // Check if data is still loading
  const isLoading = isFetchingData || (wallets.length > 0 && Object.keys(walletsData).length === 0);

  // Show skeleton loader while data is loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Wallet Filter Dropdown Skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-24"></div>
            <div className="h-8 bg-[var(--color-bg-hover)] rounded animate-pulse w-32"></div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        
        {/* Transaction section skeleton */}
        <div className="transition-all duration-200 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl overflow-hidden p-3 md:p-6">
          {/* Header skeleton */}
          <div className="p-0 md:p-6 border-b border-[var(--color-border-primary)]">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <div className="h-6 bg-[var(--color-bg-hover)] rounded animate-pulse w-48 mb-2"></div>
                <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-64"></div>
              </div>
              <div className="w-full mt-5 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <div className="h-8 bg-[var(--color-bg-hover)] rounded animate-pulse w-20"></div>
              </div>
            </div>
          </div>

          {/* Content skeleton */}
          <div className="p-0 md:p-6 mt-6 md:mt-0">
            <div className="w-full max-w-full overflow-hidden space-y-3 lg:space-y-4">
              {/* Search and filters skeleton */}
              <div className="space-y-3 lg:space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                  <div className="h-8 bg-[var(--color-bg-hover)] rounded animate-pulse w-full lg:max-w-sm"></div>
                </div>
                <div className="space-y-2 lg:space-y-3">
                  <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-20"></div>
                  <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-6 bg-[var(--color-bg-hover)] rounded-full animate-pulse w-16"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table skeleton */}
              <div className="w-full overflow-x-auto">
                <div className="hidden lg:block rounded-md border border-[var(--color-border-primary)]">
                  <div className="relative w-full overflow-auto">
                    {/* Table header skeleton */}
                    <div className="h-12 bg-[var(--color-bg-hover)] animate-pulse"></div>
                    {/* Table rows skeleton */}
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-[var(--color-bg-hover)]/50 animate-pulse border-t border-[var(--color-border-primary)]"></div>
                    ))}
                  </div>
                </div>

                {/* Mobile cards skeleton */}
                <div className="lg:hidden space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 bg-[var(--color-bg-hover)] rounded-full animate-pulse"></div>
                          <div className="min-w-0 flex-1">
                            <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-24 mb-1"></div>
                            <div className="h-3 bg-[var(--color-bg-hover)] rounded animate-pulse w-16"></div>
                          </div>
                        </div>
                        <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-20"></div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 bg-[var(--color-bg-hover)] rounded-full animate-pulse w-12"></div>
                          <div className="h-5 bg-[var(--color-bg-hover)] rounded-full animate-pulse w-16"></div>
                        </div>
                        <div className="h-3 bg-[var(--color-bg-hover)] rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination skeleton */}
              <div className="flex flex-col lg:flex-row items-center justify-between space-y-2 lg:space-y-0 lg:space-x-2 py-2 lg:py-4">
                <div className="h-4 bg-[var(--color-bg-hover)] rounded animate-pulse w-48"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-8 bg-[var(--color-bg-hover)] rounded animate-pulse w-20"></div>
                  <div className="h-8 bg-[var(--color-bg-hover)] rounded animate-pulse w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const filteredTransactions = allTransactions.filter(tx => {
    const matchesSearch = !searchTerm || tx.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const txType = getTransactionType(tx, tx.walletAddress);
    const status = tx.result === 'SUCCESS' ? 'completed' : 'pending';
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'received' && txType === 'Received') ||
      (selectedFilter === 'sent' && txType === 'Sent') ||
      (selectedFilter === 'pending' && status === 'pending') ||
      (selectedFilter === 'completed' && status === 'completed');
    const matchesWallet = selectedWalletFilter === 'all' || tx.walletId === selectedWalletFilter;
    return matchesSearch && matchesFilter && matchesWallet;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);



  return (
    <div className="space-y-6">
      {/* Wallet Filter Dropdown */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="text-[var(--color-text-primary)] font-medium">Filter by wallet:</span>
          
          {/* Wallet Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowWalletDropdown(!showWalletDropdown)}
              className="inline-flex items-center justify-between gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] rounded-md px-3 py-2 text-sm min-w-[140px]"
            >
              <span>{selectedWalletFilter === 'all' ? 'All Wallets' : `Wallet ${selectedWalletFilter}`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showWalletDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded-md shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => {
                    setSelectedWalletFilter('all');
                    setShowWalletDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] rounded-t-md"
                >
                  All Wallets
                </button>
                {wallets.map(wallet => (
                  <button
                    key={wallet.id}
                    onClick={() => {
                      setSelectedWalletFilter(wallet.id);
                      setShowWalletDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] last:rounded-b-md"
                  >
                    Wallet {wallet.id} ({wallet.address.substring(0, 8)}...)
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div
            role="button"
            tabIndex="0"
            aria-disabled="false"
            aria-roledescription="sortable"
            aria-describedby="DndDescribedBy-6"
            className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-2 xl:mb-3">
              <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
                Total Received
              </h3>
              <Coins className="w-4 h-4" />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
              <div className="flex flex-col">
                <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {isLoadingTransactions ? 'Loading...' : `${totalReceived.toFixed(2)} HBAR`}
                </span>
                {!isLoadingTransactions && hbarPriceUSD > 0 && (
                  <span className="text-[var(--color-text-muted)] text-[10px] lg:text-[11px] xl:text-[12px]">
                    ${(totalReceived * hbarPriceUSD).toFixed(2)} USD
                  </span>
                )}
              </div>
              <div className="min-h-[16px] xl:min-h-[18px]"></div>
            </div>
          </div>

          <div
            role="button"
            tabIndex="0"
            aria-disabled="false"
            aria-roledescription="sortable"
            aria-describedby="DndDescribedBy-6"
            className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-2 xl:mb-3">
              <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
                Total Sent
              </h3>
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
              <div className="flex flex-col">
                <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {isLoadingTransactions ? 'Loading...' : `${totalSent.toFixed(2)} HBAR`}
                </span>
                {!isLoadingTransactions && hbarPriceUSD > 0 && (
                  <span className="text-[var(--color-text-muted)] text-[10px] lg:text-[11px] xl:text-[12px]">
                    ${(totalSent * hbarPriceUSD).toFixed(2)} USD
                  </span>
                )}
              </div>
              <div className="min-h-[16px] xl:min-h-[18px]"></div>
            </div>
          </div>

          <div
            role="button"
            tabIndex="0"
            aria-disabled="false"
            aria-roledescription="sortable"
            aria-describedby="DndDescribedBy-6"
            className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-2 xl:mb-3">
              <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
                Net Balance
              </h3>
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
              <div className="flex flex-col">
                <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {isLoadingTransactions ? 'Loading...' : `${netBalance.toFixed(2)} HBAR`}
                </span>
                {!isLoadingTransactions && hbarPriceUSD > 0 && (
                  <span className="text-[var(--color-text-muted)] text-[10px] lg:text-[11px] xl:text-[12px]">
                    ${(netBalance * hbarPriceUSD).toFixed(2)} USD
                  </span>
                )}
              </div>
              <div className="min-h-[16px] xl:min-h-[18px]"></div>
            </div>
          </div>

          <div
            role="button"
            tabIndex="0"
            aria-disabled="false"
            aria-roledescription="sortable"
            aria-describedby="DndDescribedBy-6"
            className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-2 xl:mb-3">
              <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
                Gas Fees Paid
              </h3>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
              <div className="flex flex-col">
                <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {isLoadingTransactions ? 'Loading...' : `${totalFees.toFixed(4)} HBAR`}
                </span>
                {!isLoadingTransactions && hbarPriceUSD > 0 && (
                  <span className="text-[var(--color-text-muted)] text-[10px] lg:text-[11px] xl:text-[12px]">
                    ${(totalFees * hbarPriceUSD).toFixed(4)} USD
                  </span>
                )}
              </div>
              <div className="min-h-[16px] xl:min-h-[18px]">
                <span className="text-[var(--color-text-muted)] text-[12px] lg:text-[13px] xl:text-[14px] font-normal"></span>
              </div>
            </div>
          </div>
        </div>

        <div id="DndDescribedBy-6" style={{ display: 'none' }}>
          To pick up a draggable item, press the space bar. While dragging, use
          the arrow keys to move the item. Press space again to drop the item in
          its new position, or press escape to cancel.
        </div>
        <div
          id="DndLiveRegion-6"
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            position: 'fixed',
            top: '0px',
            left: '0px',
            width: '1px',
            height: '1px',
            margin: '-1px',
            border: '0px',
            padding: '0px',
            overflow: 'hidden',
            clip: 'rect(0px, 0px, 0px, 0px)',
            clipPath: 'inset(100%)',
            whiteSpace: 'nowrap',
          }}
        ></div>
      </div>

      <div className="transition-all duration-200 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl overflow-hidden p-3 md:p-6">
        <div className="p-0 md:p-6 border-b border-[var(--color-border-primary)]">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div>
              <h2 className="text-[var(--color-text-primary)] text-xl font-semibold mb-2">
                Crypto Transaction History
              </h2>
              <p className="text-[var(--color-text-muted)] text-sm">
                View, search, and filter all your crypto transactions on Hedera
              </p>
            </div>
            <div className="w-full mt-5 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                data-slot="button"
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-download w-4 h-4 me-2"
                  aria-hidden="true"
                >
                  <path d="M12 15V3"></path>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <path d="m7 10 5 5 5-5"></path>
                </svg>
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="p-0 md:p-6 mt-6 md:mt-0">
          <div className="w-full max-w-full overflow-hidden space-y-3 lg:space-y-4">
            <div className="space-y-3 lg:space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
                <div className="relative w-full lg:max-w-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="m21 21-4.34-4.34"></path>
                    <circle cx="11" cy="11" r="8"></circle>
                  </svg>
                  <div className="w-full">
                    <input
                      className="flex w-full rounded-lg border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--color-bg-input)] border-[var(--color-border-input)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]/50 h-8 px-3 py-2 text-sm pl-10 pr-4"
                      placeholder="Search transactions..."
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 lg:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-muted)] font-medium">
                    Quick filters
                  </span>
                </div>
                <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
                  <div 
                    onClick={() => setSelectedFilter('all')}
                    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
                      selectedFilter === 'all' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    All
                  </div>
                  <div 
                    onClick={() => setSelectedFilter('received')}
                    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
                      selectedFilter === 'received' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    Received
                  </div>
                  <div 
                    onClick={() => setSelectedFilter('sent')}
                    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
                      selectedFilter === 'sent' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    Sent
                  </div>
                  <div 
                    onClick={() => setSelectedFilter('pending')}
                    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
                      selectedFilter === 'pending' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    Pending
                  </div>
                  <div 
                    onClick={() => setSelectedFilter('completed')}
                    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
                      selectedFilter === 'completed' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    Completed
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="hidden lg:block rounded-md border border-[var(--color-border-primary)]">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b border-[var(--color-border-primary)]">
                      <tr className="border-b border-[var(--color-border-primary)] transition-colors hover:bg-[var(--color-bg-hover)] data-[state=selected]:bg-[var(--color-bg-hover)]">
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0">
                          <button
                            data-slot="button"
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 hover:text-accent-foreground dark:hover:bg-accent/50 has-[>svg]:px-3 h-auto p-0 hover:bg-transparent"
                          >
                            Transaction Hash
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-arrow-up-down ml-2 h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="m21 16-4 4-4-4"></path>
                              <path d="M17 20V4"></path>
                              <path d="m3 8 4-4 4 4"></path>
                              <path d="M7 4v16"></path>
                            </svg>
                          </button>
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0">
                          <button
                            data-slot="button"
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 hover:text-accent-foreground dark:hover:bg-accent/50 has-[>svg]:px-3 h-auto p-0 hover:bg-transparent"
                          >
                            Amount
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-arrow-up-down ml-2 h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="m21 16-4 4-4-4"></path>
                              <path d="M17 20V4"></path>
                              <path d="m3 8 4-4 4 4"></path>
                              <path d="M7 4v16"></path>
                            </svg>
                          </button>
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0">
                          Type
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0">
                          Status
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0">
                          <button
                            data-slot="button"
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 hover:text-accent-foreground dark:hover:bg-accent/50 has-[>svg]:px-3 h-auto p-0 hover:bg-transparent"
                          >
                            Date
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-arrow-up-down ml-2 h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="m21 16-4 4-4-4"></path>
                              <path d="M17 20V4"></path>
                              <path d="m3 8 4-4 4 4"></path>
                              <path d="M7 4v16"></path>
                            </svg>
                          </button>
                        </th>
                        <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)] [&:has([role=checkbox])]:pr-0"></th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {wallets.length === 0 ? (
                        <tr><td colSpan="6" className="p-4 text-center text-[var(--color-text-muted)]">No wallets connected</td></tr>
                      ) : allTransactions.length === 0 ? (
                        <tr><td colSpan="6" className="p-4 text-center text-[var(--color-text-muted)]">No transactions found</td></tr>
                      ) : (
                        paginatedTransactions.map((tx, index) => {
                          const txType = getTransactionType(tx, tx.walletAddress);
                          const amount = getTransactionAmount(tx, tx.walletAddress);
                          const isReceived = amount > 0;
                          return (
                            <tr key={`${tx.walletAddress}-${startIndex + index}`} className="border-b border-[var(--color-border-primary)] transition-colors hover:bg-[var(--color-bg-hover)]">
                              <td className="p-4 align-middle text-[var(--color-text-primary)]">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-full ${isReceived ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                    {isReceived ? <ArrowDownLeft className="w-4 h-4 text-green-400" /> : <ArrowUpRight className="w-4 h-4 text-red-400" />}
                                  </div>
                                  <div>
                                    <div className="text-[var(--color-text-primary)] font-medium text-xs">
                                      {tx.transaction_id?.substring(0, 20)}...
                                    </div>
                                    <div className="text-[var(--color-text-muted)] text-sm">
                                      HBAR Transfer
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 align-middle">
                                <span className={`font-medium ${isReceived ? 'text-green-400' : 'text-red-400'}`}>
                                  {isReceived ? '+' : ''}{formatAmount(amount)} HBAR
                                </span>
                              </td>
                              <td className="p-4 align-middle">
                                <div className="inline-flex items-center gap-1.5 rounded-full border font-medium px-2 py-1 text-xs text-[var(--color-text-primary)] border-[var(--color-border-primary)]">
                                  {txType}
                                </div>
                              </td>
                              <td className="p-4 align-middle">
                                <div className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 py-1 text-xs ${
                                  tx.result === 'SUCCESS' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}>
                                  {tx.result === 'SUCCESS' ? 'Success' : 'Pending'}
                                </div>
                              </td>
                              <td className="p-4 align-middle">
                                <span className="text-[var(--color-text-secondary)]">
                                  {formatDate(tx.consensus_timestamp)}
                                </span>
                              </td>
                              <td className="p-4 align-middle">
                                <button 
                                  onClick={() => openTransactionModal(tx)}
                                  className="opacity-60 hover:opacity-100 p-2"
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:hidden space-y-2">
                {wallets.length === 0 ? (
                  <div className="p-4 text-center text-[var(--color-text-muted)]">No wallets connected</div>
                ) : allTransactions.length === 0 ? (
                  <div className="p-4 text-center text-[var(--color-text-muted)]">No transactions found</div>
                ) : (
                  paginatedTransactions.map((tx, index) => {
                    const txType = getTransactionType(tx, tx.walletAddress);
                    const amount = getTransactionAmount(tx, tx.walletAddress);
                    const isReceived = amount > 0;
                    return (
                      <div key={`${tx.walletAddress}-${startIndex + index}`} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`p-1.5 rounded-full flex-shrink-0 ${isReceived ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                              {isReceived ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" /> : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[var(--color-text-primary)] font-medium truncate text-sm">
                                {tx.transaction_id?.substring(0, 15)}...
                              </div>
                              <div className="text-[var(--color-text-muted)] text-xs truncate">
                                HBAR Transfer
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-sm">
                              <span className={`font-semibold ${isReceived ? 'text-green-400' : 'text-red-400'}`}>
                                {isReceived ? '+' : ''}{formatAmount(amount)} HBAR
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <div className="inline-flex items-center gap-1.5 rounded-full border font-medium px-2 py-1 text-xs text-[var(--color-text-primary)] border-[var(--color-border-primary)]">
                              {txType}
                            </div>
                            <div className={`inline-flex items-center gap-1.5 rounded-full border font-medium px-2 py-1 text-xs ${
                              tx.result === 'SUCCESS' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                              {tx.result === 'SUCCESS' ? 'Success' : 'Pending'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                              {formatDate(tx.consensus_timestamp)}
                            </span>
                            <button 
                              onClick={() => openTransactionModal(tx)}
                              className="opacity-60 hover:opacity-100 p-1"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between space-y-2 lg:space-y-0 lg:space-x-2 py-2 lg:py-4">
              <div className="text-sm text-[var(--color-text-muted)] text-center lg:text-left">
                Showing {paginatedTransactions.length > 0 ? `${startIndex + 1} to ${startIndex + paginatedTransactions.length}` : '0'} of {filteredTransactions.length} crypto transactions
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 h-8 rounded-md px-3 has-[>svg]:px-2.5 flex items-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-left h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="m15 18-6-6 6-6"></path>
                  </svg>
                  <span className="hidden lg:inline">Previous</span>
                </button>
                <span className="text-sm text-[var(--color-text-muted)] px-2">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([className*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 h-8 rounded-md px-3 has-[>svg]:px-2.5 flex items-center gap-1"
                >
                  <span className="hidden lg:inline">Next</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-chevron-right h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {showModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] rounded-2xl p-8 shadow-2xl max-w-lg w-full backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  getTransactionAmount(selectedTransaction, selectedTransaction.walletAddress) > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {getTransactionAmount(selectedTransaction, selectedTransaction.walletAddress) > 0 ? 
                    <ArrowDownLeft className="w-5 h-5 text-green-400" /> : 
                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                  }
                </div>
                <div>
                  <h2 className="text-[var(--color-text-primary)] text-xl font-semibold">Transaction Details</h2>
                  <p className="text-[var(--color-text-muted)] text-sm">{getTransactionType(selectedTransaction, selectedTransaction.walletAddress)} Transaction</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-2 hover:bg-[var(--color-bg-hover)] rounded-lg"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="bg-[var(--color-bg-tertiary)]/30 rounded-xl p-4 mb-6">
              <div className="text-center">
                <span className={`text-3xl font-bold block mb-3 ${
                  getTransactionAmount(selectedTransaction, selectedTransaction.walletAddress) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {getTransactionAmount(selectedTransaction, selectedTransaction.walletAddress) > 0 ? '+' : ''}{formatAmount(getTransactionAmount(selectedTransaction, selectedTransaction.walletAddress))} HBAR
                </span>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  selectedTransaction.result === 'SUCCESS' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    selectedTransaction.result === 'SUCCESS' ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  {selectedTransaction.result === 'SUCCESS' ? 'Completed' : 'Pending'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-3">
                <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-1">Date & Time</span>
                <span className="text-[var(--color-text-primary)] text-sm font-medium">{formatDateTime(selectedTransaction.consensus_timestamp)}</span>
              </div>
              <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-3">
                <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-1">Network Fee</span>
                <span className="text-[var(--color-text-primary)] text-sm font-medium">{formatAmount(selectedTransaction.charged_tx_fee || 0)} HBAR</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-4">
                <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-2">Transaction Hash</span>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text-primary)] text-xs font-mono break-all flex-1">{selectedTransaction.transaction_id}</span>
                  <button 
                    onClick={() => copyToClipboard(selectedTransaction.transaction_id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {selectedTransaction.transfers && selectedTransaction.transfers.length > 0 && (
                <div className="bg-[var(--color-bg-tertiary)]/20 rounded-lg p-4">
                  <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-wide block mb-3">Transfer Details</span>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedTransaction.transfers.map((transfer, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-[var(--color-bg-secondary)]/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            transfer.amount > 0 ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <span className="text-[var(--color-text-secondary)] text-xs font-mono">{transfer.account}</span>
                        </div>
                        <span className={`text-xs font-semibold ${
                          transfer.amount > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transfer.amount > 0 ? '+' : ''}{formatAmount(transfer.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default TransactionsTab;
