import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

/**
 * Desktop table view for transactions
 */
const TransactionTable = ({
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
      <div className="hidden lg:block rounded-md border border-[var(--color-border-primary)]">
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          No transactions found
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:block rounded-md border border-[var(--color-border-primary)]">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b border-[var(--color-border-primary)]">
            <tr className="border-b border-[var(--color-border-primary)] transition-colors hover:bg-[var(--color-bg-hover)]">
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]">
                Transaction Hash
              </th>
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]">
                Amount
              </th>
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]">
                Type
              </th>
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]">
                Status
              </th>
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]">
                Date
              </th>
              <th className="h-12 px-4 text-start align-middle font-medium text-[var(--color-text-secondary)]"></th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {transactions.map((tx, index) => {
              const txType = getTransactionType(tx, tx.walletAddress);
              const amount = getTransactionAmount(tx, tx.walletAddress);
              const isReceived = amount > 0;

              return (
                <tr
                  key={`${tx.walletAddress}-${startIndex + index}`}
                  className="border-b border-[var(--color-border-primary)] transition-colors hover:bg-[var(--color-bg-hover)]"
                >
                  <td className="p-4 align-middle text-[var(--color-text-primary)]">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isReceived ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        {isReceived ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
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
                      tx.result === 'SUCCESS'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
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
                      onClick={() => onTransactionClick(tx)}
                      className="opacity-60 hover:opacity-100 p-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
