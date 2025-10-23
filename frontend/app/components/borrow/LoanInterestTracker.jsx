'use client'

import { useState, useEffect } from 'react'

export default function LoanInterestTracker({ loan }) {
  const [currentDebt, setCurrentDebt] = useState(null)

  useEffect(() => {
    if (!loan) return

    const calculateCurrentDebt = () => {
      const now = new Date()
      const loanDate = new Date(loan.createdAt || new Date())
      const daysElapsed = Math.floor((now - loanDate) / (1000 * 60 * 60 * 24))
      
      const principal = parseFloat(loan.borrowed)
      const annualRate = parseFloat(loan.interestRate) / 100
      const dailyRate = annualRate / 365
      const accruedInterest = principal * dailyRate * daysElapsed
      const totalDebt = principal + accruedInterest
      
      return {
        principal,
        accruedInterest: accruedInterest.toFixed(4),
        totalDebt: totalDebt.toFixed(4),
        daysElapsed
      }
    }

    const updateDebt = () => {
      setCurrentDebt(calculateCurrentDebt())
    }

    updateDebt()
    const interval = setInterval(updateDebt, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [loan])

  if (!loan || !currentDebt) return null

  return (
    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg">
      <h4 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center">
        <span className="text-orange-500 mr-2">📈</span>
        Interest Tracker
      </h4>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Principal Borrowed:
          </span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {currentDebt.principal} HBAR
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Interest Accrued ({currentDebt.daysElapsed} days):
          </span>
          <span className="text-orange-500 font-medium">
            +{currentDebt.accruedInterest} HBAR
          </span>
        </div>
        
        <div className="flex justify-between items-center pt-2 border-t border-orange-500/20">
          <span className="text-[var(--color-text-primary)] font-medium">
            Total Debt:
          </span>
          <span className="text-orange-500 font-bold text-lg">
            {currentDebt.totalDebt} HBAR
          </span>
        </div>
        
        <div className="pt-2 border-t border-orange-500/20">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Interest Rate:
            </span>
            <span className="text-orange-500 font-medium">
              {loan.interestRate}% APR
            </span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-[var(--color-text-secondary)]">
              Daily Interest:
            </span>
            <span className="text-orange-500 font-medium">
              {((parseFloat(loan.interestRate) / 100) / 365 * 100).toFixed(4)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}