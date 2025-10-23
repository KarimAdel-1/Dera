'use client'

export default function HealthFactorMonitor({ healthFactor }) {
  const getHealthColor = (hf) => {
    if (hf >= 1.5) return 'text-green-500'
    if (hf >= 1.2) return 'text-yellow-500'
    if (hf >= 1.0) return 'text-orange-500'
    return 'text-red-500'
  }

  const getHealthBg = (hf) => {
    if (hf >= 1.5) return 'bg-green-500/10 border-green-500/20'
    if (hf >= 1.2) return 'bg-yellow-500/10 border-yellow-500/20'
    if (hf >= 1.0) return 'bg-orange-500/10 border-orange-500/20'
    return 'bg-red-500/10 border-red-500/20'
  }

  const getHealthLabel = (hf) => {
    if (hf >= 1.5) return 'Safe'
    if (hf >= 1.2) return 'Monitor'
    if (hf >= 1.0) return 'Warning'
    return 'Liquidation Risk!'
  }

  const getHealthMessage = (hf) => {
    if (hf >= 1.5) return 'Your position is safe'
    if (hf >= 1.2) return 'Monitor your position closely'
    if (hf >= 1.0) return 'Add collateral to avoid liquidation'
    return 'URGENT: Add collateral immediately!'
  }

  if (!healthFactor) return null

  return (
    <div className={`p-4 rounded-lg border ${getHealthBg(healthFactor)}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-[var(--color-text-primary)]">
          Health Factor
        </h4>
        <div className={`text-xl font-bold ${getHealthColor(healthFactor)}`}>
          {healthFactor.toFixed(2)}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${getHealthColor(healthFactor)}`}>
          {getHealthLabel(healthFactor)}
        </span>
        <span className="text-[var(--color-text-secondary)] text-sm">
          {getHealthMessage(healthFactor)}
        </span>
      </div>

      {healthFactor < 1.2 && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
          <button className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
            Add More Collateral
          </button>
        </div>
      )}
    </div>
  )
}