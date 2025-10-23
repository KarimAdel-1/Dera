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
    <div className="max-w-7xl mx-auto p-6 space-y-8">


      {/* Portfolio Overview */}
      {isConnected && loans?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Borrowed</h3>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalBorrowed.toFixed(2)} HBAR</p>
          </div>
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Total Collateral</h3>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalCollateral.toFixed(2)} HBAR</p>
          </div>
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Staking Rewards</h3>
            <p className="text-2xl font-bold text-green-400">+{totalRewards.toFixed(2)} HBAR</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 rounded-xl border border-yellow-500/20">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Active Loans</h3>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">{loans?.length || 0}</p>
          </div>
        </div>
      )}

      {!isConnected ? (
        <div className="bg-[var(--color-bg-secondary)] p-12 rounded-xl border border-[var(--color-border-secondary)] text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">Connect Your Wallet</h3>
            <p className="text-[var(--color-text-muted)]">
              Connect your wallet to access borrowing features and start earning staking rewards
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Credit Score & Health Factor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <IScoreDisplay />
            {loans?.length > 0 && <HealthFactorMonitor />}
          </div>

          {/* Main Borrowing Interface */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Collateral Calculator - Takes 2 columns */}
            <div className="xl:col-span-2">
              <CollateralCalculator 
                borrowAmount={borrowAmount}
                setBorrowAmount={setBorrowAmount}
                collateralAmount={collateralAmount}
                setCollateralAmount={setCollateralAmount}
              />
            </div>
            
            {/* Borrow Form - Takes 1 column */}
            <div>
              <BorrowForm 
                borrowAmount={borrowAmount}
                collateralAmount={collateralAmount}
              />
            </div>
          </div>

          {/* Staking Rewards */}
          {loans?.length > 0 && (
            <StakingRewardsDisplay />
          )}

          {/* My Loans Section */}
          <MyLoans />
        </>
      )}
    </div>
  )
}