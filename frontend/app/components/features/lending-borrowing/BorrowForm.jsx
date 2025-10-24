'use client'

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useBorrowingActions } from '../../hooks/useBorrowingActions'
import { contractService } from '../../../services/contractService'
import toast from 'react-hot-toast'

export default function BorrowForm({ borrowAmount, collateralAmount }) {
  const { isConnected, activeWallet } = useSelector((state) => state.wallet)
  const { loading, userData } = useSelector((state) => state.borrowing)
  const [hbarPrice, setHbarPrice] = useState(0.05) // Default fallback
  const { borrow } = useBorrowingActions()

  // Fetch HBAR price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        if (contractService.contracts?.priceOracle) {
          const price = await contractService.getHBARPrice()
          setHbarPrice(price)
        }
      } catch (error) {
        console.log('Using default HBAR price')
      }
    }

    if (isConnected) {
      fetchPrice()
      const interval = setInterval(fetchPrice, 60000) // Update every minute
      return () => clearInterval(interval)
    }
  }, [isConnected])

  const handleBorrow = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!borrowAmount || !collateralAmount) {
      toast.error('Please enter valid borrow and collateral amounts')
      return
    }

    const borrowAmountNum = parseFloat(borrowAmount)
    const collateralAmountNum = parseFloat(collateralAmount)

    if (borrowAmountNum <= 0 || collateralAmountNum <= 0) {
      toast.error('Amounts must be greater than 0')
      return
    }

    if (borrowAmountNum < 50) {
      toast.error('Minimum borrow amount is 50 HBAR')
      return
    }

    try {
      // Convert HBAR borrow amount to USD
      const borrowAmountUSD = borrowAmountNum * hbarPrice

      // Get user's iScore (default to 500 if not available)
      const userIScore = userData?.iScore || 500

      const loadingToast = toast.loading(`Creating loan: Depositing ${collateralAmountNum} HBAR collateral to borrow ${borrowAmountNum} HBAR...`)

      // Call borrow hook
      await borrow(collateralAmountNum, borrowAmountUSD, userIScore, activeWallet)

      toast.dismiss(loadingToast)
      toast.success(
        `Successfully borrowed ${borrowAmountNum} HBAR! Your collateral (${collateralAmountNum} HBAR) is now staked and earning rewards.`,
        {
          duration: 6000,
          icon: '🎉',
        }
      )

    } catch (error) {
      console.error('Borrow failed:', error)

      let errorMessage = 'Failed to create loan. Please try again.'

      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled'
      } else if (error.message?.includes('Insufficient liquidity')) {
        errorMessage = 'Pool has insufficient liquidity for this loan'
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient HBAR balance for collateral'
      } else if (error.message?.includes('Invalid iScore')) {
        errorMessage = 'Invalid credit score. Please try again.'
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(errorMessage, { duration: 5000 })
    }
  }

  const isValidAmounts = borrowAmount && collateralAmount && parseFloat(borrowAmount) > 0 && parseFloat(collateralAmount) > 0

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-secondary)] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-6 border-b border-[var(--color-border-secondary)]">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
          Execute Borrow
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Review and confirm your borrowing transaction
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Transaction Steps */}
        <div className="bg-[var(--color-bg-tertiary)] p-4 rounded-lg">
          <h4 className="font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
            <svg className="w-5 h-5 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Transaction Steps
          </h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  Deposit Collateral
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {collateralAmount || '0'} HBAR will be deposited as collateral
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  Auto-Stake 80%
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {collateralAmount ? (parseFloat(collateralAmount) * 0.8).toFixed(0) : '0'} HBAR automatically staked for rewards
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  Receive HBAR
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {borrowAmount || '0'} HBAR sent to your wallet
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                ✓
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">
                  Earn Rewards
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Receive 40% of staking rewards while borrowing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        {isValidAmounts && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">
                  Important Risk Information
                </h4>
                <ul className="text-sm text-yellow-300 space-y-1">
                  <li>• Monitor your health factor to avoid liquidation</li>
                  <li>• Add more collateral if health factor drops below 1.2</li>
                  <li>• Interest accrues daily on borrowed amount</li>
                  <li>• Collateral price fluctuations affect your position</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleBorrow}
          disabled={!isConnected || !isValidAmounts || loading.borrow}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
        >
          {loading.borrow ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : !isConnected ? 'Connect Wallet' :
           !isValidAmounts ? 'Enter Valid Amounts' :
           `Borrow ${borrowAmount} HBAR`}
        </button>

        {/* Terms */}
        <div className="text-xs text-[var(--color-text-muted)] space-y-1">
          <p>• By borrowing, you agree to the protocol terms and conditions</p>
          <p>• Interest rates may vary based on market conditions</p>
          <p>• Minimum borrow amount: 50 HBAR</p>
        </div>
      </div>
    </div>
  )
}