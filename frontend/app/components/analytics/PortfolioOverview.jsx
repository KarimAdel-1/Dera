'use client'

import { useSelector } from 'react-redux'

export default function PortfolioOverview() {
  const { deposits, earnings } = useSelector((state) => state.lending)
  const { loans, stakingRewards } = useSelector((state) => state.borrowing)
  const { isConnected } = useSelector((state) => state.wallet)

  if (!isConnected) {
    return (
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
        <p className="text-[var(--color-text-muted)] text-center">
          Connect your wallet to view portfolio overview
        </p>
      </div>
    )
  }

  // Calculate portfolio metrics
  const totalDeposited = deposits.reduce((sum, deposit) => sum + parseFloat(deposit.amount || 0), 0)
  const totalBorrowed = loans.reduce((sum, loan) => sum + parseFloat(loan.borrowed || 0), 0)
  const totalCollateral = loans.reduce((sum, loan) => sum + parseFloat(loan.collateral || 0), 0)
  const totalEarnings = earnings.total || 0
  const totalStakingRewards = stakingRewards.earned || 0
  const netPosition = totalDeposited + totalCollateral - totalBorrowed

  // Calculate average health factor
  const activeLoans = loans.filter(loan => loan.status === 'active')
  const avgHealthFactor = activeLoans.length > 0 
    ? activeLoans.reduce((sum, loan) => sum + (loan.healthFactor || 0), 0) / activeLoans.length 
    : 0

  const getHealthFactorColor = (hf) => {
    if (hf >= 1.5) return 'text-green-500'
    if (hf >= 1.2) return 'text-yellow-500'
    if (hf >= 1.0) return 'text-orange-500'
    return 'text-red-500'
  }

  const stats = [
    {
      label: 'Total Deposited',
      value: `${totalDeposited.toFixed(2)} HBAR`,
      color: 'text-blue-500',
      icon: '💰'
    },
    {
      label: 'Total Borrowed',
      value: `${totalBorrowed.toFixed(2)} HBAR`,
      color: 'text-orange-500',
      icon: '📊'
    },
    {
      label: 'Total Collateral',
      value: `${totalCollateral.toFixed(2)} HBAR`,
      color: 'text-purple-500',
      icon: '🔒'
    },
    {
      label: 'Net Position',
      value: `${netPosition.toFixed(2)} HBAR`,
      color: netPosition >= 0 ? 'text-green-500' : 'text-red-500',
      icon: '📈'
    },
    {
      label: 'Total Earnings',
      value: `+${totalEarnings.toFixed(4)} HBAR`,
      color: 'text-green-500',
      icon: '💎'
    },
    {
      label: 'Staking Rewards',
      value: `+${totalStakingRewards.toFixed(4)} HBAR`,
      color: 'text-green-500',
      icon: '🏆'
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          Portfolio Overview
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Your complete lending and borrowing position
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  {stat.label}
                </p>
                <p className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <div className="text-2xl">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeLoans.length > 0 && (
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">
                Average Health Factor
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm">
                Across {activeLoans.length} active loan{activeLoans.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className={`text-2xl font-bold ${getHealthFactorColor(avgHealthFactor)}`}>
              {avgHealthFactor.toFixed(2)}
            </div>
          </div>
          
          {avgHealthFactor < 1.2 && (
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <p className="text-yellow-600 text-sm">
                ⚠️ Some loans have low health factors. Consider adding collateral.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">
            Active Positions
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Deposits:</span>
              <span className="text-[var(--color-text-primary)]">{deposits.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Active Loans:</span>
              <span className="text-[var(--color-text-primary)]">{activeLoans.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
          <h3 className="font-medium text-[var(--color-text-primary)] mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
              Make Deposit
            </button>
            <button className="w-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] py-2 px-4 rounded-md text-sm font-medium transition-colors border border-[var(--color-border-secondary)]">
              Borrow HBAR
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}