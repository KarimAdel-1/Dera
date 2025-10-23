'use client'

import { useSelector } from 'react-redux'
import { useState } from 'react'
import WithdrawalForm from './WithdrawalForm'
import EarningsDisplay from './EarningsDisplay'
import WithdrawalRequestTracker from './WithdrawalRequestTracker'

export default function MyDeposits() {
  const { isConnected } = useSelector((state) => state.wallet)
  const { deposits, withdrawalRequests } = useSelector((state) => state.lending)
  const [selectedDeposit, setSelectedDeposit] = useState(null)
  const [showEarnings, setShowEarnings] = useState({})

  const displayDeposits = deposits?.length > 0 ? deposits : [
    {
      id: 1,
      tier: 1,
      tierName: 'Tier 1 - Instant',
      amount: '1000',
      balance: '1005.2',
      apy: 4.5,
      earned: '5.2',
      createdAt: '2024-01-15T10:00:00Z'
    }
  ]

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
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No deposits found. Make your first deposit above to start earning!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        My Deposits
      </h2>
      
      <div className="grid gap-4">
        {displayDeposits.map((deposit, index) => {
          const hasWithdrawalRequest = withdrawalRequests?.some(
            req => req.depositId === deposit.id && req.status === 'pending'
          )
          
          return (
            <div key={index} className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">
                    {deposit.tierName}
                  </h3>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Balance: {deposit.balance} HBAR
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[var(--color-primary)] font-medium">
                    {deposit.apy}%
                  </p>
                  <p className="text-green-500 text-sm">
                    Earned: +{deposit.earned} HBAR
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <button 
                  onClick={() => setSelectedDeposit(selectedDeposit?.id === deposit.id ? null : deposit)}
                  className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                >
                  {selectedDeposit?.id === deposit.id ? 'Cancel' : 'Withdraw'}
                </button>
                <button 
                  onClick={() => setShowEarnings(prev => ({ ...prev, [deposit.id]: !prev[deposit.id] }))}
                  className="px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
                >
                  {showEarnings[deposit.id] ? 'Hide' : 'Earnings'}
                </button>
              </div>
              
              {showEarnings[deposit.id] && (
                <div className="mt-4">
                  <EarningsDisplay deposit={deposit} />
                </div>
              )}
              
              {hasWithdrawalRequest && (
                <WithdrawalRequestTracker deposit={deposit} />
              )}
              
              {selectedDeposit?.id === deposit.id && !hasWithdrawalRequest && (
                <WithdrawalForm deposit={deposit} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}