import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { useHederaStats } from '../hooks/useHederaStats';
import HederaStatsSkeleton from './HederaStatsSkeleton';
import OverviewCards from './hedera/OverviewCards';
import NetworkPerformanceCards from './hedera/NetworkPerformanceCards';
import TransactionStatsCards from './hedera/TransactionStatsCards';
import TransactionTypeChart from './hedera/TransactionTypeChart';

/**
 * Main Hedera Stats Tab Component
 * Displays real-time Hedera network statistics and performance metrics
 */
const HederaStatsTab = () => {
  const {
    overview,
    performance,
    transactions,
    transactionTab,
    transactionTimeframe,
    timeframe,
    formattedTime,
    isLoading,
    error,
    handleRefresh,
    handleTransactionTimeframeChange,
    handleTransactionTabChange,
  } = useHederaStats();

  // Loading UI
  if (isLoading) {
    return (
      <div className="p-0 sm:p-0">
        <HederaStatsSkeleton />
      </div>
    );
  }

  // Error UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-400 font-bold mb-2">Error</p>
        <p className="text-[var(--color-text-muted)] mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-0">
      <div className="space-y-6">
        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[var(--color-text-muted)] text-sm">
              Real-time network data
            </p>
            {formattedTime && (
              <p className="text-[var(--color-text-muted)] text-xs mt-1">
                Last updated: {formattedTime}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="cursor-pointer p-1.5 xl:p-2 bg-[var(--color-bg-hover)]/50 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none flex-shrink-0"
            title="Refresh data"
          >
            <RefreshCcw className="w-4 h-4 xl:w-5 xl:h-5" />
          </button>
        </div>

        {/* Overview Section */}
        <Section title="Overview">
          <OverviewCards overview={overview} timeframe={timeframe} />
        </Section>

        {/* Network Performance Section */}
        <Section title="Network Performance">
          <NetworkPerformanceCards performance={performance} overview={overview} />
        </Section>

        {/* Transactions Section */}
        <div>
          <h2 className="text-[var(--color-text-secondary)] text-[18px] font-normal mb-4">
            Transactions
          </h2>
          <TransactionStatsCards transactions={transactions} />
          <TransactionTypeChart
            transactions={transactions}
            transactionTab={transactionTab}
            transactionTimeframe={transactionTimeframe}
            onTabChange={handleTransactionTabChange}
            onTimeframeChange={handleTransactionTimeframeChange}
          />
        </div>
      </div>
    </div>
  );
};

// Reusable section wrapper
const Section = ({ title, children }) => (
  <div>
    <h2 className="text-[var(--color-text-secondary)} text-[18px] font-normal mb-4">
      {title}
    </h2>
    {children}
  </div>
);

export default HederaStatsTab;
