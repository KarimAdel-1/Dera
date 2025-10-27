'use client';
import { ArrowUpRight, ArrowDownLeft, Clock, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';

const TransactionHistory = ({ transactions }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);
  const getIcon = (type) => {
    if (type === 'supply' || type === 'repay') {
      return <ArrowUpRight className="w-5 h-5 text-green-600" />;
    }
    return <ArrowDownLeft className="w-5 h-5 text-blue-600" />;
  };

  const getTypeLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
      <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-[var(--color-text-muted)]" />
        Transaction History
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">No transactions yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currentTransactions.map(tx => (
              <div key={tx.id} className="bg-[var(--color-bg-tertiary)] p-3 rounded-[12px] border border-[var(--color-border-secondary)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-[var(--color-bg-secondary)] p-2 rounded-[8px]">
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium text-[14px]">
                        {getTypeLabel(tx.type)} {tx.asset}
                      </p>
                      <p className="text-[12px] text-[var(--color-text-muted)]">
                        {tx.amount.toLocaleString()} {tx.asset}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[var(--color-text-muted)]">
                      {formatTime(tx.timestamp)}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Gas: {tx.gasUsed} HBAR
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-secondary)]">
                  <a
                    href={`https://hashscan.io/testnet/transaction/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[var(--color-primary)] hover:text-[var(--color-primary)]/90 flex items-center gap-1 transition-all"
                  >
                    {tx.hash?.slice(0, 10)}...{tx.hash?.slice(-8)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[11px] text-green-600 font-medium">{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border-primary)]">
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Showing {startIndex + 1}-{Math.min(endIndex, transactions.length)} of {transactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-[8px] border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
                <span className="text-[12px] text-[var(--color-text-muted)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-[8px] border border-[var(--color-border-primary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransactionHistory;
