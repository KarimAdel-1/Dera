'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'

export default function DepositForm({ selectedTier }) {
  const { isConnected } = useSelector((state) => state.wallet)
  const [depositAmount, setDepositAmount] = useState('')

  const tiers = [
    { id: 1, name: 'Instant', apy: 4.5 },
    { id: 2, name: 'Warm', apy: 5.85 },
    { id: 3, name: 'Cold', apy: 7.65 }
  ]

  const selectedTierData = tiers.find(t => t.id === selectedTier)
  const quickAmounts = [100, 500, 1000, 5000]

  const handleDeposit = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    // TODO: Implement actual deposit logic
    alert(`Depositing ${depositAmount} HBAR to ${selectedTierData.name} tier`)
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-secondary)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 p-6 border-b border-[var(--color-border-secondary)]">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Make Deposit
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Deposit to {selectedTierData?.name} tier • {selectedTierData?.apy}% APY
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            Deposit Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-4 text-2xl font-semibold bg-[var(--color-bg-primary)] border border-[var(--color-border-secondary)] rounded-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] font-medium">
              HBAR
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
            Quick amounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setDepositAmount(amount.toString())}
                className="px-4 py-2 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] rounded-lg text-sm font-medium transition-colors border border-[var(--color-border-secondary)] hover:border-[var(--color-primary)]"
              >
                {amount.toLocaleString()} HBAR
              </button>
            ))}
          </div>
        </div>

        {/* Deposit Preview */}
        {depositAmount && selectedTierData && parseFloat(depositAmount) > 0 && (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
            <h4 className="font-semibold text-[var(--color-text-primary)] mb-3 flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Earnings Projection
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-text-secondary)] mb-1">Monthly earnings</p>
                <p className="font-semibold text-green-400">
                  +{(parseFloat(depositAmount) * selectedTierData.apy / 100 / 12).toFixed(2)} HBAR
                </p>
              </div>
              <div>
                <p className="text-[var(--color-text-secondary)] mb-1">Annual earnings</p>
                <p className="font-semibold text-green-400">
                  +{(parseFloat(depositAmount) * selectedTierData.apy / 100).toFixed(2)} HBAR
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Button */}
        <button
          onClick={handleDeposit}
          disabled={!isConnected || !depositAmount || parseFloat(depositAmount) <= 0}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
        >
          {!isConnected ? 'Connect Wallet' : 
           !depositAmount || parseFloat(depositAmount) <= 0 ? 'Enter Amount' :
           `Deposit ${depositAmount} HBAR`}
        </button>

        {/* Info */}
        <div className="text-xs text-[var(--color-text-muted)] space-y-1">
          <p>• Interest is calculated and compounded daily</p>
          <p>• Minimum deposit: 10 HBAR</p>
          <p>• Withdrawal terms apply based on selected tier</p>
        </div>
      </div>
    </div>
  )
}