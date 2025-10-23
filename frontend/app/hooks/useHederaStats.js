import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchNetworkData,
  fetchEcosystemMetrics,
  fetchTransactionTypes,
  fetchNewTransactionTypes,
  networkSlice,
} from '../store/hederaSlice';

/**
 * Custom hook for managing Hedera network statistics
 * Handles fetching and refreshing network data
 */
export const useHederaStats = () => {
  const dispatch = useDispatch();
  const {
    overview,
    performance,
    transactions,
    status,
    error,
    lastFetched,
    timeframe,
    transactionTab,
    transactionTimeframe,
  } = useSelector((state) => state.network);

  // Fetch on mount + auto-refresh every 5 minutes
  useEffect(() => {
    fetchAllData();

    const interval = setInterval(() => {
      fetchAllData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [timeframe, transactionTimeframe]);

  const fetchAllData = () => {
    dispatch(fetchNetworkData(timeframe));
    dispatch(fetchEcosystemMetrics());
    dispatch(fetchTransactionTypes(transactionTimeframe));
    dispatch(fetchNewTransactionTypes(transactionTimeframe));
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleTimeframeChange = (newTimeframe) => {
    dispatch(networkSlice.actions.setTimeframe(newTimeframe));
  };

  const handleTransactionTimeframeChange = (newTimeframe) => {
    dispatch(networkSlice.actions.setTransactionTimeframe(newTimeframe));
  };

  const handleTransactionTabChange = (tab) => {
    dispatch(networkSlice.actions.setTransactionTab(tab));
  };

  const formattedTime = lastFetched
    ? new Date(lastFetched).toLocaleTimeString()
    : null;

  const isLoading = status === 'loading';

  return {
    // Data
    overview,
    performance,
    transactions,
    transactionTab,
    transactionTimeframe,
    timeframe,
    formattedTime,
    isLoading,
    error,

    // Actions
    handleRefresh,
    handleTimeframeChange,
    handleTransactionTimeframeChange,
    handleTransactionTabChange,
  };
};
