import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

/**
 * Mobile card view for transactions
 */
const TransactionList = ({
  transactions,
  startIndex,
  getTransactionType,
  getTransactionAmount,
  onTransactionClick
}) => {
  const formatAmount = (amount) => (amount / 100000000).toFixed(4);
  const formatDate = (timestamp) => new Date(timestamp * 1000).toLocaleDateString();

  if (transactions.length === 0) {
    return (
      <div className="lg:hidden p-8 text-center text-[var(--color-text-muted)]">
        No transactions found
      </div>
    );
  }

  return (
    <div className="lg:hidden space-y-2">
      {transactions.map((tx, index) => {
        const txType = getTransactionType(tx, tx.walletAddress);
        const amount = getTransactionAmount(tx, tx.walletAddress);
        const isReceived = amount > 0;

        return (
          <div
            key={`${tx.walletAddress}-${startIndex + index}`}
            className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={`p-1.5 rounded-full flex-shrink-0 ${isReceived ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {isReceived ? (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                  )}
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
                  tx.result === 'SUCCESS'
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                }`}>
                  {tx.result === 'SUCCESS' ? 'Success' : 'Pending'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                  {formatDate(tx.consensus_timestamp)}
                </span>
                <button
                  onClick={() => onTransactionClick(tx)}
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
      })}
    </div>
  );
};

export default TransactionList;
