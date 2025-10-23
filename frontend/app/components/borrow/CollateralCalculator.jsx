'use client'

export default function CollateralCalculator({ 
  borrowAmount, 
  setBorrowAmount, 
  collateralAmount, 
  setCollateralAmount 
}) {
  // TODO: Get actual HBAR price from API
  const hbarPrice = 0.05 // $0.05 per HBAR
  const collateralRatio = 1.5 // 150% for demo
  const stakingApy = 6 // 6% staking APY
  const borrowerRewardShare = 0.4 // 40% of staking rewards

  const quickBorrowAmounts = [100, 500, 1000, 2000]
  const quickCollateralAmounts = [200, 750, 1500, 3000]

  const handleBorrowAmountChange = (amount) => {
    setBorrowAmount(amount)
    if (amount) {
      const usdValue = parseFloat(amount) * hbarPrice
      const requiredCollateralUsd = usdValue * collateralRatio
      const requiredCollateralHbar = requiredCollateralUsd / hbarPrice
      setCollateralAmount(requiredCollateralHbar.toFixed(0))
    } else {
      setCollateralAmount('')
    }
  }

  const handleCollateralAmountChange = (amount) => {
    setCollateralAmount(amount)
    if (amount) {
      const collateralUsd = parseFloat(amount) * hbarPrice
      const maxBorrowUsd = collateralUsd / collateralRatio
      const maxBorrowHbar = maxBorrowUsd / hbarPrice
      setBorrowAmount(maxBorrowHbar.toFixed(0))
    } else {
      setBorrowAmount('')
    }
  }

  const stakedAmount = collateralAmount ? parseFloat(collateralAmount) * 0.8 : 0
  const annualStakingRewards = stakedAmount * (stakingApy / 100)
  const borrowerRewards = annualStakingRewards * borrowerRewardShare

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-secondary)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-6 border-b border-[var(--color-border-secondary)]">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Collateral Calculator
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Calculate your borrowing capacity and collateral requirements
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Borrow Amount */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            How much do you want to borrow?
          </label>
          <div className="relative">
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => handleBorrowAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 text-xl font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] font-medium">
              HBAR
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {quickBorrowAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleBorrowAmountChange(amount.toString())}
                className="px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-md text-sm font-medium transition-colors border border-[var(--color-border-secondary)] hover:border-[var(--color-primary)]"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Conversion Arrow */}
        <div className="flex justify-center">
          <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-full border border-[var(--color-border-secondary)]">
            <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>

        {/* Collateral Amount */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            Required collateral ({collateralRatio * 100}% ratio)
          </label>
          <div className="relative">
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => handleCollateralAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 text-xl font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] font-medium">
              HBAR
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {quickCollateralAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleCollateralAmountChange(amount.toString())}
                className="px-3 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-md text-sm font-medium transition-colors border border-[var(--color-border-secondary)] hover:border-[var(--color-primary)]"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Preview */}
        {borrowAmount && collateralAmount && parseFloat(borrowAmount) > 0 && parseFloat(collateralAmount) > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 flex items-center">
              <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Loan Summary
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">You borrow:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{borrowAmount} HBAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Collateral:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">{collateralAmount} HBAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Staked (80%):</span>
                  <span className="font-semibold text-blue-400">{stakedAmount.toFixed(0)} HBAR</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Health factor:</span>
                  <span className="font-semibold text-green-400">1.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Your rewards:</span>
                  <span className="font-semibold text-green-400">+{borrowerRewards.toFixed(2)} HBAR/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-secondary)]">Interest rate:</span>
                  <span className="font-semibold text-[var(--color-text-primary)]">8% APR</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}