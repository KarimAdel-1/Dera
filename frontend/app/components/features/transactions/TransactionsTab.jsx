import React, { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import TransactionStatsCards from './TransactionStatsCards';
import WalletFilterDropdown from './WalletFilterDropdown';
import TransactionFilters from './TransactionFilters';
import TransactionTable from './TransactionTable';
import TransactionList from './TransactionList';
import TransactionModal from './TransactionModal';
import Pagination from './Pagination';

/**
 * Main Transactions Tab Component
 * Displays transaction history with filtering, search, and pagination
 */
const TransactionsTab = () => {
  const {
    wallets,
    paginatedTransactions,
    filteredTransactions,
    statistics,
    hbarPriceUSD,
    isLoading,
    searchTerm,
    setSearchTerm,
    selectedFilter,
    setSelectedFilter,
    selectedWalletFilter,
    setSelectedWalletFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    transactionsPerPage,
    getTransactionType,
    getTransactionAmount,
  } = useTransactions();

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTransaction(null);
  };

  const endIndex = Math.min(
    startIndex + paginatedTransactions.length,
    filteredTransactions.length
  );

  return (
    <div className="space-y-6">
      {/* Wallet Filter */}
      <WalletFilterDropdown
        wallets={wallets}
        selectedWalletFilter={selectedWalletFilter}
        onSelectWallet={setSelectedWalletFilter}
      />

      {/* Statistics Cards */}
      <TransactionStatsCards
        statistics={statistics}
        hbarPriceUSD={hbarPriceUSD}
        isLoading={isLoading}
      />

      {/* Main Transaction Section */}
      <div className="transition-all duration-200 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl overflow-hidden p-3 md:p-6">
        {/* Header */}
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
              <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-8 rounded-md gap-1.5 px-3">
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
                  className="w-4 h-4 me-2"
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

        {/* Content */}
        <div className="p-0 md:p-6 mt-6 md:mt-0">
          <div className="w-full max-w-full overflow-hidden space-y-3 lg:space-y-4">
            {/* Search and Filters */}
            <TransactionFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />

            {/* Transaction Table/List */}
            <div className="w-full overflow-x-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-[var(--color-text-muted)]">Loading transactions...</p>
                </div>
              ) : wallets.length === 0 ? (
                <div className="p-8 text-center text-[var(--color-text-muted)]">
                  No wallets connected
                </div>
              ) : (
                <>
                  <TransactionTable
                    transactions={paginatedTransactions}
                    startIndex={startIndex}
                    getTransactionType={getTransactionType}
                    getTransactionAmount={getTransactionAmount}
                    onTransactionClick={handleTransactionClick}
                  />
                  <TransactionList
                    transactions={paginatedTransactions}
                    startIndex={startIndex}
                    getTransactionType={getTransactionType}
                    getTransactionAmount={getTransactionAmount}
                    onTransactionClick={handleTransactionClick}
                  />
                </>
              )}
            </div>

            {/* Pagination */}
            {!isLoading && wallets.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredTransactions.length}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {showModal && selectedTransaction && (
        <TransactionModal
          transaction={selectedTransaction}
          onClose={closeModal}
          getTransactionType={getTransactionType}
          getTransactionAmount={getTransactionAmount}
        />
      )}
    </div>
  );
};

export default TransactionsTab;
