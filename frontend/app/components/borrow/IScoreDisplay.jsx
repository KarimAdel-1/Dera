'use client'

export default function IScoreDisplay() {
  // TODO: Fetch actual iScore from API
  const iScore = 750 // Default score for new users

  const getScoreColor = (score) => {
    if (score >= 800) return 'text-green-500'
    if (score >= 700) return 'text-yellow-500'
    if (score >= 600) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreLabel = (score) => {
    if (score >= 800) return 'Excellent'
    if (score >= 700) return 'Good'
    if (score >= 600) return 'Fair'
    return 'Poor'
  }

  const getTerms = (score) => {
    if (score >= 800) return { collateralRatio: '130%', interestRate: '5%' }
    if (score >= 700) return { collateralRatio: '150%', interestRate: '8%' }
    if (score >= 600) return { collateralRatio: '175%', interestRate: '10%' }
    return { collateralRatio: '200%', interestRate: '12%' }
  }

  const terms = getTerms(iScore)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        Your Credit Score (iScore)
      </h2>
      
      <div className="bg-[var(--color-bg-secondary)] p-6 rounded-lg border border-[var(--color-border-secondary)]">
        <div className="text-center mb-4">
          <div className={`text-4xl font-bold ${getScoreColor(iScore)}`}>
            {iScore}
          </div>
          <div className="text-[var(--color-text-secondary)] text-sm">
            {getScoreLabel(iScore)} Credit
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-[var(--color-text-primary)]">
            Your Borrowing Terms
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-md">
              <div className="text-[var(--color-text-secondary)] text-sm">
                Collateral Ratio
              </div>
              <div className="text-[var(--color-text-primary)] font-semibold">
                {terms.collateralRatio}
              </div>
            </div>
            <div className="text-center p-3 bg-[var(--color-bg-tertiary)] rounded-md">
              <div className="text-[var(--color-text-secondary)] text-sm">
                Interest Rate
              </div>
              <div className="text-[var(--color-text-primary)] font-semibold">
                {terms.interestRate}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}