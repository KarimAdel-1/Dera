'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import IScoreDisplay from './IScoreDisplay'
import CollateralCalculator from './CollateralCalculator'
import BorrowForm from './BorrowForm'
import MyLoans from './MyLoans'
import HealthFactorMonitor from './HealthFactorMonitor'
import StakingRewardsDisplay from './StakingRewardsDisplay'

export default function BorrowTab() {
  const { isConnected } = useSelector((state) => state.wallet)
  const { loans, userData } = useSelector((state) => state.borrowing)
  const [borrowAmount, setBorrowAmount] = useState('')
  const [collateralAmount, setCollateralAmount] = useState('')

  const totalBorrowed = loans?.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0) || 0
  const totalCollateral = loans?.reduce((sum, loan) => sum + parseFloat(loan.collateralAmount || 0), 0) || 0
  const totalRewards = userData?.stakingRewards?.totalEarned || 0

  return (
    <div className="space-y-6">
      {!isConnected ? (
        <div className="p-12 rounded-xl text-center" style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-secondary)' }}>
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--color-primary-opacity)' }}>
              <svg className="w-8 h-8" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Connect Your Wallet</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Connect your wallet to access borrowing features and start earning staking rewards
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Portfolio Overview */}
          {loans?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Total Borrowed</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalBorrowed.toFixed(2)} HBAR</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Total Collateral</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{totalCollateral.toFixed(2)} HBAR</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Staking Rewards</h3>
                <p className="text-2xl font-bold text-green-500">+{totalRewards.toFixed(2)} HBAR</p>
              </div>
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>Active Loans</h3>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{loans?.length || 0}</p>
              </div>
            </div>
          )}

          {/* Credit Score & Health Factor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IScoreDisplay />
            {loans?.length > 0 && <HealthFactorMonitor />}
          </div>

          {/* Main Borrowing Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Collateral Calculator */}
            <div className="lg:col-span-2">
              <CollateralCalculator 
                borrowAmount={borrowAmount}
                setBorrowAmount={setBorrowAmount}
                collateralAmount={collateralAmount}
                setCollateralAmount={setCollateralAmount}
              />
            </div>
            
            {/* Borrow Form */}
            <div>
              <BorrowForm 
                borrowAmount={borrowAmount}
                collateralAmount={collateralAmount}
              />
            </div>
          </div>

          {/* Staking Rewards & Loans */}
          {loans?.length > 0 && (
            <div className="space-y-6">
              <StakingRewardsDisplay />
              <MyLoans />
            </div>
          )}
          
          {loans?.length === 0 && <MyLoans />}
        </>
      )}
    </div>
  )
}
