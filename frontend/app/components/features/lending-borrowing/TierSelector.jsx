'use client'

export default function TierSelector({ selectedTier, onTierSelect }) {
  const tiers = [
    {
      id: 1,
      name: 'Instant',
      shortName: 'Tier 1',
      apy: '4.5',
      withdrawal: 'Instant',
      description: 'Maximum flexibility with instant withdrawals',
      features: ['Instant withdrawals', 'No lock period', 'Lower APY'],
      gradient: 'from-green-500 to-emerald-600',
      icon: '⚡'
    },
    {
      id: 2,
      name: 'Warm',
      shortName: 'Tier 2',
      apy: '5.85',
      withdrawal: '30-day notice',
      description: 'Balanced returns with moderate flexibility',
      features: ['30-day notice period', 'Higher APY', 'Good balance'],
      gradient: 'from-yellow-500 to-orange-600',
      icon: '🔥'
    },
    {
      id: 3,
      name: 'Cold',
      shortName: 'Tier 3',
      apy: '7.65',
      withdrawal: '90-day locked',
      description: 'Maximum returns for long-term commitment',
      features: ['90-day lock period', 'Highest APY', 'Best returns'],
      gradient: 'from-blue-500 to-purple-600',
      icon: '❄️'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Choose Your Lending Tier
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Select the tier that matches your investment strategy
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              selectedTier === tier.id
                ? 'border-[var(--color-primary)] bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-primary)]/10 shadow-lg'
                : 'border-[var(--color-border-secondary)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-primary)]/50 hover:shadow-md'
            }`}
            onClick={() => onTierSelect(tier.id)}
          >
            {selectedTier === tier.id && (
              <div className="absolute -top-3 -right-3 w-6 h-6 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{tier.icon}</div>
              <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">
                {tier.name}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {tier.shortName}
              </p>
            </div>

            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-[var(--color-primary)] mb-1">
                {tier.apy}%
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Annual Percentage Yield
              </p>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-4">
              {tier.description}
            </p>

            <div className="space-y-2">
              {tier.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-[var(--color-text-secondary)]">
                  <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)]">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-text-secondary)]">Withdrawal:</span>
                <span className="font-medium text-[var(--color-text-primary)]">{tier.withdrawal}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}