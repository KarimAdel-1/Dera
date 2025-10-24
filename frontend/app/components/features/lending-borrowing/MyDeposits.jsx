'use client'

import { useSelector } from 'react-redux'
import { useState } from 'react'
import WithdrawalForm from './WithdrawalForm'
import EarningsDisplay from './EarningsDisplay'
import WithdrawalRequestTracker from './WithdrawalRequestTracker'
import { Clock, TrendingUp } from 'lucide-react'

export default function MyDeposits() {
  const { isConnected } = useSelector((state) => state.wallet)
  const { deposits, withdrawalRequests } = useSelector((state) => state.lending)
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [showEarnings, setShowEarnings] = useState({})

  // Only show real deposits from Redux state - NO DUMMY DATA
  const displayDeposits = deposits || []

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          My Deposits
        </h2>
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
          <p className="text-[var(--color-text-muted)] text-center py-8">
            Connect your wallet to view your deposits
          </p>
        </div>
      </div>
    )
  }

  if (displayDeposits.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          My Deposits
        </h2>
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-border-secondary)]">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              No Deposits Yet
            </h3>
            <p className="text-[var(--color-text-muted)] mb-6">
              Make your first deposit above to start earning interest on your HBAR!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          My Deposits
        </h2>
        <span className="text-sm text-[var(--color-text-muted)]">
          {displayDeposits.length} Active Deposit{displayDeposits.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-4">
        {displayDeposits.map((deposit, index) => {
          const hasWithdrawalRequest = withdrawalRequests?.some(
            req => req.depositId === deposit.id && req.status === 'pending'
          )

          const depositDate = new Date(deposit.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })

          return (
            <div key={deposit.id || index} className="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-border-secondary)] hover:border-[var(--color-primary)]/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-[var(--color-text-primary)] mb-1">
                    {deposit.tierName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <Clock className="w-3 h-3" />
                    <span>Deposited on {depositDate}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-[var(--color-text-muted)] mb-1">APY</div>
                  <div className="text-2xl font-bold text-[var(--color-primary)]">
                    {deposit.apy}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Balance</p>
                  <p className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {parseFloat(deposit.balance).toFixed(2)} HBAR
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">Earned</p>
                  <p className="text-lg font-semibold text-green-500">
                    +{parseFloat(deposit.earned || 0).toFixed(4)} HBAR
                  </p>
                </div>
              </div>

              {hasWithdrawalRequest && (
                <div className="mb-4">
                  <WithdrawalRequestTracker deposit={deposit} />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDeposit(selectedDeposit?.id === deposit.id ? null : deposit)}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
                  disabled={hasWithdrawalRequest}
                >
                  {selectedDeposit?.id === deposit.id ? 'Cancel Withdrawal' : 'Withdraw'}
                </button>
                <button
                  onClick={() => setShowEarnings(prev => ({ ...prev, [deposit.id]: !prev[deposit.id] }))}
                  className="px-4 py-2.5 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg text-sm transition-colors border border-[var(--color-border-secondary)]"
                >
                  {showEarnings[deposit.id] ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              {showEarnings[deposit.id] && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)]">
                  <EarningsDisplay deposit={deposit} />
                </div>
              )}

              {selectedDeposit?.id === deposit.id && !hasWithdrawalRequest && (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)]">
                  <WithdrawalForm deposit={deposit} onClose={() => setSelectedDeposit(null)} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}