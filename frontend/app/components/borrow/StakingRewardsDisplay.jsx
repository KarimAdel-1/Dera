'use client'

import { useSelector } from 'react-redux'

export default function StakingRewardsDisplay({ loan }) {
  const { stakingRewards } = useSelector((state) => state.borrowing)

  if (!loan) return null

  // Calculate staking rewards for this loan (mock calculation)
  const calculateStakingRewards = (loan) => {
    const now = new Date()
    const loanDate = new Date(loan.createdAt || new Date())
    const daysElapsed = Math.floor((now - loanDate) / (1000 * 60 * 60 * 24))
    
    // Assume 6% annual staking rewards on 80% of collateral
    const stakableAmount = parseFloat(loan.collateral) * 0.8
    const annualStakingRate = 0.06
    const dailyRate = annualStakingRate / 365
    const totalRewards = stakableAmount * dailyRate * daysElapsed
    const borrowerShare = totalRewards * 0.4 // 40% to borrower
    
    return {
      total: totalRewards.toFixed(4),
      borrowerShare: borrowerShare.toFixed(4),
      stakableAmount: stakableAmount.toFixed(2)
    }
  }

  const rewards = calculateStakingRewards(loan)

  return (
    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
      <h4 className="font-medium text-[var(--color-text-primary)] mb-3 flex items-center">
        <span className="text-green-500 mr-2">🏆</span>
        Staking Rewards
      </h4>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Staked Amount:
          </span>
          <span className="text-[var(--color-text-primary)] font-medium">
            {rewards.stakableAmount} HBAR (80%)
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Total Rewards Earned:
          </span>
          <span className="text-green-500 font-medium">
            +{rewards.total} HBAR
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-secondary)] text-sm">
            Your Share (40%):
          </span>
          <span className="text-green-500 font-bold">
            +{rewards.borrowerShare} HBAR
          </span>
        </div>
        
        <div className="pt-2 border-t border-green-500/20">
          <div className="text-xs text-[var(--color-text-muted)] space-y-1">
            <div>• 80% of collateral is staked to Hedera nodes</div>
            <div>• 20% kept as reserve for liquidations</div>
            <div>• You receive 40% of staking rewards</div>
            <div>• Rewards distributed: 30% protocol, 20% lenders, 10% insurance</div>
          </div>
        </div>
      </div>
    </div>
  )
}