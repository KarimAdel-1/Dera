import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useTransactions } from '../../../hooks/useTransactions';

const TransactionsSection = () => {
  const { allTransactions, getTransactionType, getTransactionAmount } =
    useTransactions();

  const groupedTransactions = useMemo(() => {
    const sorted = allTransactions.slice(0, 5);
    const grouped = {};
    const today = new Date().toDateString();

    sorted.forEach((tx) => {
      const txDate = new Date(parseFloat(tx.consensus_timestamp) * 1000);
      const dateKey =
        txDate.toDateString() === today
          ? 'Today'
          : txDate.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            });
      if (!grouped[dateKey]) grouped[dateKey] = [];

      const txType = getTransactionType(tx, tx.walletAddress);
      const amount = getTransactionAmount(tx, tx.walletAddress) / 100000000;
      const isReceived = amount > 0;
      const otherAccount =
        tx.transfers?.find((t) => t.account !== tx.walletAddress)?.account ||
        'Unknown';

      grouped[dateKey].push({
        id: `${tx.walletAddress}-${tx.transaction_id}-${tx.consensus_timestamp}`,
        description: `${isReceived ? 'From' : 'To'} ${otherAccount.substring(0, 10)}...`,
        category: tx.name || 'Crypto transfer',
        amount,
        currency: 'HBAR',
        isReceived,
        timestamp: tx.consensus_timestamp,
      });
    });

    return grouped;
  }, [allTransactions, getTransactionType, getTransactionAmount]);

  return (
    <div className="col-span-1 xl:row-start-2 xl:col-start-1 h-[280px] sm:h-auto md:h-[350px] xl:h-[500px] ">
      <div
        className="h-full w-full relative "
        style={{ opacity: '1', transform: 'none' }}
      >
        <div className="h-full w-full">
          <div className="bg-[var(--color-bg-card)] rounded-[12px] sm:rounded-[20px] border border-[var(--color-border-primary)] h-full">
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal">
                  Recent Transactions
                </h3>
                {/* <span className="text-[var(--color-primary)] text-[12px] sm:text-[13px] font-normal cursor-pointer hover:opacity-80">
                  Show more
                </span> */}
              </div>
              {Object.entries(groupedTransactions).map(
                ([date, transactions], index) => (
                  <div
                    key={date}
                    className={`mb-3 sm:mb-4 ${index > 0 ? 'hidden sm:block' : ''}`}
                  >
                    <div className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal mb-2 sm:mb-3">
                      {date}
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                      {transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3"
                        >
                          <div className="bg-[var(--color-bg-icon)] flex items-center justify-center p-1.5 sm:p-2 rounded-full w-8 h-8 sm:w-10 sm:h-10">
                            {transaction.isReceived ? (
                              <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-muted)] rtl:scale-x-[-1]" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-text-muted)] rtl:scale-x-[-1]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[var(--color-text-primary)] text-[13px] sm:text-[14px] font-normal truncate">
                              {transaction.description}
                            </div>
                            <div className="text-[var(--color-text-muted)] text-[11px] sm:text-[12px] font-normal">
                              {transaction.category}
                            </div>
                          </div>
                          <div className="text-[var(--color-primary)] text-[13px] sm:text-[15px] font-normal whitespace-nowrap">
                            {transaction.isReceived ? '+' : ''}
                            {transaction.amount.toFixed(4)}{' '}
                            <span className="text-[10px] sm:text-[11px] text-[var(--color-primary)]">
                              {transaction.currency}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsSection;
