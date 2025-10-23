'use client'

import { useSelector } from 'react-redux'

export default function EarningsDisplay({ deposit }) {
  const { earnings } = useSelector((state) => state.lending)

  if (!deposit) return null

  // Calculate accrued earnings (mock calculation for UI)
  const calculateAccruedEarnings = (deposit) => {
    const now = new Date()
    const depositDate = new Date(deposit.createdAt)
    const daysElapsed = Math.floor((now - depositDate) / (1000 * 60 * 60 * 24))
    const dailyRate = (deposit.apy / 100) / 365
    return (parseFloat(deposit.amount) * dailyRate * daysElapsed).toFixed(4)
  }

  const accruedEarnings = calculateAccruedEarnings(deposit)
  const projectedAnnual = (parseFloat(deposit.amount) * (deposit.apy / 100)).toFixed(2)

  return (
    <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-lg border border-[var(--color-border-secondary)]">
      <h4 className="font-medium text-[var(--color-text-primary)] mb-3">
        Earnings Overview
      </h4>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Accrued Earnings:
          </span>
          <span className="text-green-500 font-medium">
            +{accruedEarnings} HBAR
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Current Balance:
          </span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {(parseFloat(deposit.amount) + parseFloat(accruedEarnings)).toFixed(4)} HBAR
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Annual Projection:
          </span>
          <span className="text-[var(--color-primary)] font-medium">
            +{projectedAnnual} HBAR
          </span>
        </div>
        
        <div className="pt-2 border-t border-[var(--color-border-secondary)]">
          <div className="flex justify-between items-center">
            <span className="text-[var(--color-text-secondary)] text-sm">
              APY:
            </span>
            <span className="text-[var(--color-primary)] font-bold">
              {deposit.apy}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}