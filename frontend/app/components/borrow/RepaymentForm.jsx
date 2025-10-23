'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'

export default function RepaymentForm({ loan }) {
  const { isConnected } = useSelector((state) => state.wallet)
  const [repayAmount, setRepayAmount] = useState('')

  if (!loan) return null

  const handleRepay = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // TODO: Implement actual repayment logic
    const isFullRepayment = parseFloat(repayAmount) >= loan.totalDebt
    
    if (isFullRepayment) {
      alert(`Repaying full loan: ${repayAmount} HBAR. You will receive ${loan.collateral} HBAR collateral + ${loan.stakingRewards} HBAR staking rewards`)
    } else {
      alert(`Partial repayment: ${repayAmount} HBAR. Remaining debt: ${(loan.totalDebt - parseFloat(repayAmount)).toFixed(2)} HBAR`)
    }
  }

  const isFullRepayment = repayAmount && parseFloat(repayAmount) >= loan.totalDebt

  return (
    <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-md mt-4">
      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">
        Repay Loan
      </h4>
      
      <div className="space-y-3">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Total Debt:</span>
            <span className="text-[var(--color-text-primary)]">{loan.totalDebt} HBAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Collateral:</span>
            <span className="text-[var(--color-text-primary)]">{loan.collateral} HBAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-secondary)]">Staking Rewards:</span>
            <span className="text-green-500">+{loan.stakingRewards} HBAR</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            Repayment Amount (HBAR)
          </label>
          <input
            type="number"
            value={repayAmount}
            onChange={(e) => setRepayAmount(e.target.value)}
            placeholder={`Min: 0, Max: ${loan.totalDebt}`}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-md text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => setRepayAmount((loan.totalDebt * 0.25).toFixed(2))}
              className="text-xs bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] px-2 py-1 rounded border border-[var(--color-border-secondary)]"
            >
              25%
            </button>
            <button
              onClick={() => setRepayAmount((loan.totalDebt * 0.5).toFixed(2))}
              className="text-xs bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] px-2 py-1 rounded border border-[var(--color-border-secondary)]"
            >
              50%
            </button>
            <button
              onClick={() => setRepayAmount(loan.totalDebt)}
              className="text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-2 py-1 rounded"
            >
              Full
            </button>
          </div>
        </div>

        {isFullRepayment && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-md">
            <h5 className="font-medium text-green-400 mb-1">Full Repayment</h5>
            <p className="text-green-300 text-sm">
              You will receive: {loan.collateral} HBAR collateral + {loan.stakingRewards} HBAR rewards = {(parseFloat(loan.collateral) + parseFloat(loan.stakingRewards)).toFixed(2)} HBAR total
            </p>
          </div>
        )}

        <button
          onClick={handleRepay}
          disabled={!repayAmount}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          {isFullRepayment ? 'Repay Full Loan' : 'Make Payment'}
        </button>
      </div>
    </div>
  )
}