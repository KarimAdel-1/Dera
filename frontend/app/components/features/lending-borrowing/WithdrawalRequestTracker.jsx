'use client'

import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import { useLendingActions } from '../../hooks/useLendingActions'
import toast from 'react-hot-toast'

export default function WithdrawalRequestTracker({ deposit }) {
  const { activeWallet } = useSelector((state) => state.wallet)
  const { withdrawalRequests, loading } = useSelector((state) => state.lending)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const { completeWithdrawal, cancelWithdrawalRequest } = useLendingActions()

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

  const handleCompleteWithdrawal = async () => {
    if (!timeRemaining?.ready) {
      toast.error('Withdrawal period has not completed yet')
      return
    }

    try {
      const loadingToast = toast.loading(`Completing withdrawal of ${withdrawalRequest.amount} HBAR...`)

      // Call complete withdrawal hook
      await completeWithdrawal(withdrawalRequest.id, activeWallet)

      toast.dismiss(loadingToast)
      toast.success(
        `Successfully withdrew ${withdrawalRequest.amount} HBAR!`,
        {
          duration: 5000,
          icon: '💰',
        }
      )
    } catch (error) {
      console.error('Withdrawal completion failed:', error)

      let errorMessage = 'Failed to complete withdrawal. Please try again.'

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('Not ready')) {
        errorMessage = 'Withdrawal period not met yet'
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, { duration: 5000 })
    }
  }

  const handleCancelRequest = async () => {
    try {
      const loadingToast = toast.loading('Cancelling withdrawal request...')

      // Call cancel withdrawal request hook
      await cancelWithdrawalRequest(withdrawalRequest.id, activeWallet)

      toast.dismiss(loadingToast)
      toast.success('Withdrawal request cancelled successfully', {
        duration: 4000,
      })
    } catch (error) {
      console.error('Cancel request failed:', error)

      let errorMessage = 'Failed to cancel withdrawal request. Please try again.'

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, { duration: 5000 })
    }
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
              disabled={loading.withdraw}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              {loading.withdraw ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : 'Complete Withdrawal'}
            </button>
            <button
              onClick={handleCancelRequest}
              disabled={loading.withdraw}
              className="px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-secondary)] rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
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
            disabled={loading.withdraw}
            className="w-full bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--color-text-secondary)] py-2 px-4 rounded-md text-sm transition-colors border border-[var(--color-border-secondary)]"
          >
            {loading.withdraw ? 'Processing...' : 'Cancel Request'}
          </button>
        </div>
      )}
    </div>
  )
}