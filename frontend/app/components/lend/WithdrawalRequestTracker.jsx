'use client'

import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'

export default function WithdrawalRequestTracker({ deposit }) {
  const { withdrawalRequests } = useSelector((state) => state.lending)
  const [timeRemaining, setTimeRemaining] = useState(null)

  // Find withdrawal request for this deposit
  const withdrawalRequest = withdrawalRequests.find(
    req => req.depositId === deposit.id && req.status === 'pending'
  )

  useEffect(() => {
    if (!withdrawalRequest) return

    const updateTimer = () => {
      const now = new Date()
      const requestDate = new Date(withdrawalRequest.requestedAt)
      const completionDate = new Date(requestDate)
      
      if (deposit.tier === 2) {
        completionDate.setDate(completionDate.getDate() + 30) // 30-day notice
      } else if (deposit.tier === 3) {
        completionDate.setDate(completionDate.getDate() + 90) // 90-day lock
      }

      const timeLeft = completionDate - now
      
      if (timeLeft <= 0) {
        setTimeRemaining({ ready: true })
      } else {
        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
        
        setTimeRemaining({ days, hours, minutes, ready: false })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [withdrawalRequest, deposit.tier])

  if (!withdrawalRequest) return null

  const handleCompleteWithdrawal = () => {
    if (timeRemaining?.ready) {
      // TODO: Implement actual withdrawal completion
      alert(`Completing withdrawal of ${withdrawalRequest.amount} HBAR`)
    }
  }

  const handleCancelRequest = () => {
    // TODO: Implement withdrawal request cancellation
    alert('Cancelling withdrawal request')
  }

  return (
    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-[var(--color-text-primary)]">
          Withdrawal Request
        </h4>
        <span className="text-blue-500 text-sm font-medium">
          {withdrawalRequest.amount} HBAR
        </span>
      </div>

      {timeRemaining?.ready ? (
        <div className="space-y-3">
          <div className="text-green-500 text-sm font-medium">
            ✅ Withdrawal Ready!
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCompleteWithdrawal}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              Complete Withdrawal
            </button>
            <button
              onClick={handleCancelRequest}
              className="px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[var(--color-text-secondary)] text-sm">
            {deposit.tier === 2 ? '30-day notice period' : '90-day lock period'} remaining:
          </div>
          
          <div className="flex items-center space-x-4 text-sm">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">
                {timeRemaining?.days || 0}
              </div>
              <div className="text-[var(--color-text-muted)]">Days</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">
                {timeRemaining?.hours || 0}
              </div>
              <div className="text-[var(--color-text-muted)]">Hours</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">
                {timeRemaining?.minutes || 0}
              </div>
              <div className="text-[var(--color-text-muted)]">Minutes</div>
            </div>
          </div>

          <button
            onClick={handleCancelRequest}
            className="w-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] py-2 px-4 rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  )
}