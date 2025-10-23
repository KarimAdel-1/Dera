'use client'

import { useSelector } from 'react-redux'

export default function BorrowForm({ borrowAmount, collateralAmount }) {
  const { isConnected } = useSelector((state) => state.wallet)

  const handleBorrow = async () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    if (!borrowAmount || !collateralAmount) {
      alert('Please enter valid amounts')
      return
    }

    // TODO: Implement actual borrow logic
    alert(`Depositing ${collateralAmount} HBAR collateral to borrow ${borrowAmount} HBAR`)
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
          disabled={!isConnected || !isValidAmounts}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:bg-[var(--color-bg-tertiary)] disabled:text-[var(--color-text-muted)] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
        >
          {!isConnected ? 'Connect Wallet' : 
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