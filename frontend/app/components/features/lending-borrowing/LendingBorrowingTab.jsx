'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import LendTab from './lend/LendTab'
import BorrowTab from './borrow/BorrowTab'

export default function LendingBorrowingTab() {
  const { isConnected } = useSelector((state) => state.wallet)
  const [activeMode, setActiveMode] = useState('lend')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header with Toggle */}
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
            DeFi Lending & Borrowing
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Earn interest by lending or access liquidity by borrowing HBAR
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center">
          <div className="bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border-secondary)]">
            <button
              onClick={() => setActiveMode('lend')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeMode === 'lend'
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Lend HBAR
            </button>
            <button
              onClick={() => setActiveMode('borrow')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeMode === 'borrow'
                  ? 'bg-[var(--color-primary)] text-white shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Borrow HBAR
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeMode === 'lend' ? <LendTab /> : <BorrowTab />}
      </div>
    </div>
  )
}