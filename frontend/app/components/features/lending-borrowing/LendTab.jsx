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
    <div className="space-y-6">
      {!isConnected ? (
        <div className="p-12 rounded-xl text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)' }}>
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--color-primary-opacity)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Connect Your Wallet</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Connect your wallet to start lending HBAR and earning competitive interest rates
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Overview */}
          {deposits?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Total Balance</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalBalance.toFixed(2)} HBAR</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Total Earnings</h3>
                <p className="text-2xl font-bold text-green-500">+{totalEarnings.toFixed(2)} HBAR</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Active Deposits</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{deposits?.length || 0}</p>
              </div>
            </div>
          )}

          {/* Main Lending Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tier Selection */}
            <div className="lg:col-span-2">
              <TierSelector 
                selectedTier={selectedTier} 
                onTierSelect={setSelectedTier} 
              />
            </div>
            
            {/* Deposit Form */}
            <div>
              <DepositForm selectedTier={selectedTier} />
            </div>
          </div>

          {/* My Deposits Section */}
          {deposits?.length > 0 && <MyDeposits />}
        </>
      )}
    </div>
  )
}
