'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useLendingActions } from '../../hooks/useLendingActions'
import toast from 'react-hot-toast'

export default function WithdrawalForm({ deposit, onClose }) {
  const { isConnected, activeWallet } = useSelector((state) => state.wallet)
  const { loading } = useSelector((state) => state.lending)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const { withdraw } = useLendingActions()

  if (!deposit) return null

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (parseFloat(withdrawAmount) > parseFloat(deposit.balance)) {
      toast.error('Insufficient balance')
      return
    }

    try {
      const amount = parseFloat(withdrawAmount)
      let loadingMessage = ''

      if (deposit.tier === 1) {
        loadingMessage = `Withdrawing ${amount} HBAR instantly...`
      } else if (deposit.tier === 2) {
        loadingMessage = `Requesting withdrawal of ${amount} HBAR...`
      } else {
        loadingMessage = `Withdrawing ${amount} HBAR...`
      }

      const loadingToast = toast.loading(loadingMessage)

      // Call withdraw hook
      await withdraw(deposit.id, amount, deposit.tier, activeWallet)

      toast.dismiss(loadingToast)

      if (deposit.tier === 1) {
        toast.success(`Successfully withdrew ${amount} HBAR!`, {
          duration: 5000,
          icon: '💰',
        })
      } else if (deposit.tier === 2) {
        toast.success('Withdrawal requested! 30-day notice period started.', {
          duration: 5000,
          icon: '⏰',
        })
      } else {
        toast.success(`Successfully withdrew ${amount} HBAR!`, {
          duration: 5000,
          icon: '💰',
        })
      }

      // Clear form and close
      setWithdrawAmount('')
      if (onClose) onClose()

    } catch (error) {
      console.error('Withdrawal failed:', error)

      let errorMessage = 'Failed to withdraw. Please try again.'

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('Lock period not met')) {
        errorMessage = 'Withdrawal period not met yet'
      } else if (error.message?.includes('Insufficient liquidity')) {
        errorMessage = 'Pool has insufficient liquidity'
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, { duration: 5000 })
    }
  }

  const canWithdraw = () => {
    if (deposit.tier === 1) return true
    if (deposit.tier === 2) return true // Can request
    if (deposit.tier === 3) {
      // Check if 90 days have passed
      const lockEndDate = new Date(deposit.createdAt)
      lockEndDate.setDate(lockEndDate.getDate() + 90)
      return new Date() > lockEndDate
    }
    return false
  }

  const getButtonText = () => {
    if (loading.withdraw) return 'Processing...'
    if (deposit.tier === 1) return 'Withdraw Instantly'
    if (deposit.tier === 2) return 'Request Withdrawal (30-day notice)'
    if (deposit.tier === 3) {
      const lockEndDate = new Date(deposit.createdAt)
      lockEndDate.setDate(lockEndDate.getDate() + 90)
      const daysLeft = Math.ceil((lockEndDate - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft > 0 ? `Locked (${daysLeft} days left)` : 'Withdraw'
    }
  }

  const getLockInfo = () => {
    if (deposit.tier === 3) {
      const lockEndDate = new Date(deposit.createdAt)
      lockEndDate.setDate(lockEndDate.getDate() + 90)
      const daysLeft = Math.ceil((lockEndDate - new Date()) / (1000 * 60 * 60 * 24))

      if (daysLeft > 0) {
        return (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md mb-3">
            <p className="text-yellow-400 text-sm">
              ⏳ This deposit is locked for {daysLeft} more days (90-day lock period)
            </p>
          </div>
        )
      }
    }
    return null
  }

  return (
    <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-lg">
      <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">
        Withdraw from {deposit.tierName}
      </h4>

      {getLockInfo()}

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
            Amount to withdraw
          </label>
          <div className="relative">
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0.00"
              max={deposit.balance}
              step="0.01"
              disabled={!canWithdraw() || loading.withdraw}
              className="w-full px-3 py-2 pr-16 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-md text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => setWithdrawAmount(deposit.balance)}
              disabled={!canWithdraw() || loading.withdraw}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white px-2 py-1 rounded disabled:opacity-50"
            >
              MAX
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Available: {parseFloat(deposit.balance).toFixed(2)} HBAR
          </p>
        </div>

        {deposit.tier === 2 && (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md">
            <p className="text-blue-400 text-sm">
              ℹ️ Tier 2 requires 30-day notice. After requesting, you can complete withdrawal in 30 days.
            </p>
          </div>
        )}

        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw() || !withdrawAmount || loading.withdraw}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          {loading.withdraw ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            getButtonText()
          )}
        </button>
      </div>
    </div>
  )
}
