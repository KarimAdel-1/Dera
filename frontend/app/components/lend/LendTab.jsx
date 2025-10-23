'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import TierSelector from './TierSelector'
import DepositForm from './DepositForm'
import MyDeposits from './MyDeposits'
import EarningsDisplay from './EarningsDisplay'

export default function LendTab() {
  const { isConnected } = useSelector((state) => state.wallet)
  const { deposits } = useSelector((state) => state.lending)
  const [selectedTier, setSelectedTier] = useState(1)

  const totalBalance = deposits?.reduce((sum, deposit) => sum + parseFloat(deposit.balance || 0), 0) || 0
  const totalEarnings = deposits?.reduce((sum, deposit) => sum + parseFloat(deposit.earned || 0), 0) || 0

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">


      {/* Portfolio Overview */}
      {isConnected && deposits?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Balance</h3>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalBalance.toFixed(2)} HBAR</p>
          </div>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Earnings</h3>
            <p className="text-2xl font-bold text-green-400">+{totalEarnings.toFixed(2)} HBAR</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 rounded-xl border border-yellow-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Active Deposits</h3>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{deposits?.length || 0}</p>
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="bg-[var(--color-bg-secondary)] p-12 rounded-xl border border-[var(--color-border-secondary)] text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Connect Your Wallet</h3>
            <p className="text-[var(--color-text-muted)]">
              Connect your wallet to start lending HBAR and earning competitive interest rates
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Main Lending Interface */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Tier Selection - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <TierSelector 
                selectedTier={selectedTier} 
                onTierSelect={setSelectedTier} 
              />
            </div>
            
            {/* Deposit Form - Takes 1 column */}
            <div>
              <DepositForm selectedTier={selectedTier} />
            </div>
          </div>

          {/* My Deposits Section */}
          <MyDeposits />
        </>
      )}
    </div>
  )
}