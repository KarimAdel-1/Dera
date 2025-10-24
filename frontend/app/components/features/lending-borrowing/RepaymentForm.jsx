'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useBorrowingActions } from '../../../hooks/useBorrowingActions'
import toast from 'react-hot-toast'

export default function RepaymentForm({ loan }) {
  const { isConnected, activeWallet } = useSelector((state) => state.wallet)
  const { loading } = useSelector((state) => state.borrowing)
  const [repayAmount, setRepayAmount] = useState('')
  const { repay } = useBorrowingActions()

  if (!loan) return null

  const handleRepay = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast.error('Please enter a valid repayment amount')
      return
    }

    const repayAmountNum = parseFloat(repayAmount)
    const totalDebt = parseFloat(loan.totalDebt)
    const isFullRepayment = repayAmountNum >= totalDebt

    // Validate repayment amount
    if (repayAmountNum > totalDebt) {
      toast.error(`Repayment amount cannot exceed total debt (${totalDebt.toFixed(2)} HBAR)`)
      return
    }

    try {
      let loadingMessage = ''
      if (isFullRepayment) {
        loadingMessage = `Repaying full loan (${repayAmountNum.toFixed(2)} HBAR)...`
      } else {
        loadingMessage = `Making partial payment (${repayAmountNum.toFixed(2)} HBAR)...`
      }

      const loadingToast = toast.loading(loadingMessage)

      // Call repay hook
      await repay(loan.id, repayAmountNum, isFullRepayment, activeWallet)

      toast.dismiss(loadingToast)

      if (isFullRepayment) {
        const totalReturn = parseFloat(loan.collateral) + parseFloat(loan.stakingRewards || 0)
        toast.success(
          `Loan fully repaid! You received ${loan.collateral} HBAR collateral + ${loan.stakingRewards || 0} HBAR staking rewards = ${totalReturn.toFixed(2)} HBAR total!`,
          {
            duration: 6000,
            icon: '🎉',
          }
        )
      } else {
        const remainingDebt = totalDebt - repayAmountNum
        toast.success(
          `Payment of ${repayAmountNum.toFixed(2)} HBAR successful! Remaining debt: ${remainingDebt.toFixed(2)} HBAR`,
          {
            duration: 5000,
            icon: '💰',
          }
        )
      }

      // Clear form
      setRepayAmount('')

    } catch (error) {
      console.error('Repayment failed:', error)

      let errorMessage = 'Failed to process repayment. Please try again.'

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient HBAR balance for repayment'
      } else if (error.message?.includes('No active loan')) {
        errorMessage = 'No active loan found'
      } else if (error.message?.includes('Invalid repayment amount')) {
        errorMessage = 'Invalid repayment amount'
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, { duration: 5000 })
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
          disabled={!repayAmount || loading.repay}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          {loading.repay ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : isFullRepayment ? 'Repay Full Loan' : 'Make Payment'}
        </button>
      </div>
    </div>
  )
}