'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'

export default function WithdrawalForm({ deposit }) {
  const { isConnected } = useSelector((state) => state.wallet)
  const [withdrawAmount, setWithdrawAmount] = useState('')

  if (!deposit) return null

  const handleWithdraw = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (parseFloat(withdrawAmount) > deposit.balance) {
      alert('Insufficient balance')
      return
    }

    // TODO: Implement actual withdrawal logic based on tier
    if (deposit.tier === 1) {
      alert(`Withdrawing ${withdrawAmount} HBAR instantly`)
    } else if (deposit.tier === 2) {
      alert(`Requesting withdrawal of ${withdrawAmount} HBAR (30-day notice period)`)
    } else {
      alert('Tier 3 withdrawals are locked for 90 days')
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
    if (deposit.tier === 1) return 'Withdraw Instantly'
    if (deposit.tier === 2) return 'Request Withdrawal (30-day notice)'
    if (deposit.tier === 3) {
      const lockEndDate = new Date(deposit.createdAt)
      lockEndDate.setDate(lockEndDate.getDate() + 90)
      const daysLeft = Math.ceil((lockEndDate - new Date()) / (1000 * 60 * 60 * 24))
      return daysLeft > 0 ? `Locked (${daysLeft} days left)` : 'Withdraw'
    }
  }

  return (
    <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-md mt-4">
      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">
        Withdraw from {deposit.tierName}
      </h4>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            Amount to withdraw
          </label>
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={`Max: ${deposit.balance} HBAR`}
            max={deposit.balance}
            disabled={!canWithdraw()}
            className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-md text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={!canWithdraw() || !withdrawAmount}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  )
}