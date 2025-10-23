import React from 'react';
import { Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { StatCardSkeleton } from '../SkeletonLoaders';

/**
 * Display transaction statistics as cards
 */
const TransactionStatsCards = ({ statistics, hbarPriceUSD, isLoading }) => {
  const { totalReceived, totalSent, netBalance, totalFees } = statistics;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
            <StatCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Received"
        icon={<Coins className="w-4 h-4" />}
        value={`${totalReceived.toFixed(2)} HBAR`}
        usdValue={hbarPriceUSD > 0 ? `$${(totalReceived * hbarPriceUSD).toFixed(2)} USD` : null}
      />

      <StatCard
        title="Total Sent"
        icon={<ArrowUpRight className="w-4 h-4" />}
        value={`${totalSent.toFixed(2)} HBAR`}
        usdValue={hbarPriceUSD > 0 ? `$${(totalSent * hbarPriceUSD).toFixed(2)} USD` : null}
      />

      <StatCard
        title="Net Balance"
        icon={<ArrowDownLeft className="w-4 h-4" />}
        value={`${netBalance.toFixed(2)} HBAR`}
        usdValue={hbarPriceUSD > 0 ? `$${(netBalance * hbarPriceUSD).toFixed(2)} USD` : null}
      />

      <StatCard
        title="Gas Fees Paid"
        icon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        value={`${totalFees.toFixed(4)} HBAR`}
        usdValue={hbarPriceUSD > 0 ? `$${(totalFees * hbarPriceUSD).toFixed(4)} USD` : null}
      />
    </div>
  );
};

const StatCard = ({ title, icon, value, usdValue }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md">
    <div className="flex items-start justify-between mb-2 xl:mb-3">
      <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
        {title}
      </h3>
      <div className="text-[var(--color-text-muted)]">{icon}</div>
    </div>
    <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
      <div className="flex flex-col">
        <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </span>
        {usdValue && (
          <span className="text-[var(--color-text-muted)] text-[10px] lg:text-[11px] xl:text-[12px]">
            {usdValue}
          </span>
        )}
      </div>
      <div className="min-h-[16px] xl:min-h-[18px]"></div>
    </div>
  </div>
);

export default TransactionStatsCards;
