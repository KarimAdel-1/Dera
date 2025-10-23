'use client'

import { useSelector } from 'react-redux'
import { useState } from 'react'
import HealthFactorMonitor from './HealthFactorMonitor'
import RepaymentForm from './RepaymentForm'
import StakingRewardsDisplay from './StakingRewardsDisplay'
import LoanInterestTracker from './LoanInterestTracker'

export default function MyLoans() {
  const { isConnected } = useSelector((state) => state.wallet)
  const { loans } = useSelector((state) => state.borrowing)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [showDetails, setShowDetails] = useState({})

  const displayLoans = loans?.length > 0 ? loans : [
    {
      id: 'loan_001',
      borrowed: '500',
      collateral: '1000',
      totalDebt: '510.5',
      interestRate: 8,
      healthFactor: 1.8,
      stakingRewards: '12.5',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'active'
    }
  ]

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          My Loans
        </h2>
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
          <p className="text-[var(--color-text-muted)] text-center py-8">
            Connect your wallet to view your loans
          </p>
        </div>
      </div>
    )
  }

  if (displayLoans.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          My Loans
        </h2>
        <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No active loans. Use the calculator above to start borrowing!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        My Loans
      </h2>
      
      <div className="grid gap-4">
        {displayLoans.map((loan, index) => (
          <div key={index} className="bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-[var(--color-text-primary)]">
                  Loan #{loan.id}
                </h3>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Borrowed: {loan.borrowed} HBAR
                </p>
              </div>
            </div>
            
            <HealthFactorMonitor healthFactor={loan.healthFactor} />
            
            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              <div>
                <span className="text-[var(--color-text-secondary)]">Collateral:</span>
                <span className="text-[var(--color-text-primary)] ml-2">{loan.collateral} HBAR</span>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Interest Rate:</span>
                <span className="text-[var(--color-text-primary)] ml-2">{loan.interestRate}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Total Debt:</span>
                <span className="text-[var(--color-text-primary)] ml-2">{loan.totalDebt} HBAR</span>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Staking Rewards:</span>
                <span className="text-green-500 ml-2">+{loan.stakingRewards} HBAR</span>
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              <button 
                onClick={() => setSelectedLoan(selectedLoan?.id === loan.id ? null : loan)}
                className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
              >
                {selectedLoan?.id === loan.id ? 'Cancel' : 'Repay Loan'}
              </button>
              <button className="flex-1 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] py-2 px-4 rounded-md text-sm font-medium transition-colors border border-[var(--color-border-secondary)]">
                Add Collateral
              </button>
              <button 
                onClick={() => setShowDetails(prev => ({ ...prev, [loan.id]: !prev[loan.id] }))}
                className="px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
              >
                {showDetails[loan.id] ? 'Hide' : 'Details'}
              </button>
            </div>
            
            {showDetails[loan.id] && (
              <div className="mt-4 space-y-4">
                <StakingRewardsDisplay loan={loan} />
                <LoanInterestTracker loan={loan} />
              </div>
            )}
            
            {selectedLoan?.id === loan.id && (
              <RepaymentForm loan={loan} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}