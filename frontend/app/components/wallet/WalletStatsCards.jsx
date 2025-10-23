import { Wallet } from 'lucide-react'
import { StatCardSkeleton } from '../SkeletonLoaders'

export default function WalletStatsCards({ isLoading, wallets, walletsData, hbarPrice, walletDetails, network }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
            <StatCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  const totalHbarBalance = wallets.reduce((sum, wallet) => {
    const walletData = walletsData[wallet.address]
    if (walletData?.hbarBalance) {
      const hbarAmount = parseFloat(walletData.hbarBalance)
      if (!isNaN(hbarAmount)) {
        return sum + hbarAmount
      }
    }
    return sum
  }, 0)
  const totalUsdBalance = totalHbarBalance * (hbarPrice || 0)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md">
        <div className="flex items-start justify-between mb-2 xl:mb-3">
          <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
            Total Balance
          </h3>
          <div className="text-[var(--color-text-muted)] [&>svg]:w-4 [&>svg]:h-4 xl:[&>svg]:w-5 xl:[&>svg]:h-5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign w-5 h-5">
              <line x1="12" x2="12" y1="2" y2="22"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
          <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {totalUsdBalance > 0 ? `$${totalUsdBalance.toFixed(2)}` : '$0.00'}
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md">
        <div className="flex items-start justify-between mb-2 xl:mb-3">
          <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
            Connected Wallets
          </h3>
          <div className="text-[var(--color-text-muted)] [&>svg]:w-4 [&>svg]:h-4 xl:[&>svg]:w-5 xl:[&>svg]:h-5 flex-shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
          <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {wallets.length}
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md">
        <div className="flex items-start justify-between mb-2 xl:mb-3">
          <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
            Network
          </h3>
          <div className="text-[var(--color-text-muted)] [&>svg]:w-4 [&>svg]:h-4 xl:[&>svg]:w-5 xl:[&>svg]:h-5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up w-5 h-5">
              <path d="M16 7h6v6"></path>
              <path d="m22 7-8.5 8.5-5-5L2 17"></path>
            </svg>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
          <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            Hedera {walletDetails.network || network.charAt(0).toUpperCase() + network.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:bg-[var(--color-bg-secondary)]/40 hover:border-[var(--color-border-primary)]/80 flex flex-col h-full min-h-[110px] xl:min-h-[120px] cursor-grab active:cursor-grabbing hover:shadow-md">
        <div className="flex items-start justify-between mb-2 xl:mb-3">
          <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal leading-tight line-clamp-2 flex-1 pr-2">
            Security Status
          </h3>
          <div className="text-[var(--color-text-muted)] [&>svg]:w-4 [&>svg]:h-4 xl:[&>svg]:w-5 xl:[&>svg]:h-5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield w-5 h-5">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
            </svg>
          </div>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-1 xl:gap-2 mt-auto">
          <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
            Secure
          </span>
        </div>
      </div>
    </div>
  )
}