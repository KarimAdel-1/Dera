'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { 
  Info, 
  ExternalLink,
  Shield,
  Zap,
  DollarSign,
  Percent,
  BarChart3,
  AlertCircle,
  Activity
} from 'lucide-react'
import LendTab from './LendTab'
import BorrowTab from './BorrowTab'

export default function LendingBorrowingTab() {
  const { isConnected, activeWallet } = useSelector((state) => state.wallet)
  const [activeMode, setActiveMode] = useState('overview')

  const StatCard = ({ title, value, icon: Icon, subtitle }) => (
    <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
      <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {Icon && <Icon className="w-4 h-4" />}
        <span>{title}</span>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      {subtitle && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>}
    </div>
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                  <span className="text-white font-bold text-lg">ℏ</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    HBAR Lending & Borrowing
                    <span className="text-sm font-normal px-2 py-1 rounded" style={{ color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg-tertiary)' }}>HBAR</span>
                  </h1>
                  <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Hedera Network</span>
                    {activeWallet && (
                      <a href="#" className="flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
                        {activeWallet.slice(0, 6)}...{activeWallet.slice(-4)} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {['overview', 'lend', 'borrow'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMode(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
                style={{ borderColor: activeMode === tab ? 'var(--color-primary)' : 'transparent', color: activeMode === tab ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeMode === 'overview' && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Supplied"
                value="$2.84B"
                icon={DollarSign}
                subtitle="1,234,567.89 HBAR"
              />
              <StatCard
                title="Supply APY"
                value="4.50%"
                icon={Percent}
                subtitle="Tier 1: Instant Access"
              />
              <StatCard
                title="Total Borrowed"
                value="$2.15B"
                icon={BarChart3}
                subtitle="934,567.89 HBAR"
              />
              <StatCard
                title="Borrow APY"
                value="5.00%"
                icon={Percent}
                subtitle="Based on iScore 500"
              />
            </div>

            {/* Market Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Pool Statistics</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Utilization Rate</span>
                      <span className="text-sm font-medium">75.70%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                      <div className="h-full" style={{ width: '75.7%', backgroundColor: 'var(--color-primary)' }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Available Liquidity</span>
                    <span className="text-sm font-medium">$689.5M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Oracle Price</span>
                    <span className="text-sm font-medium">$0.05</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Platform Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Collateral Staking</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Staking Rewards</span>
                    </div>
                    <span className="text-sm font-medium">40% to Borrower</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>iScore Range</span>
                    </div>
                    <span className="text-sm font-medium">300-1000</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Liquidation Penalty</span>
                    </div>
                    <span className="text-sm font-medium">5.00%</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeMode === 'lend' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
            <LendTab />
          </div>
        )}

        {activeMode === 'borrow' && (
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
            <BorrowTab />
          </div>
        )}
      </div>
    </div>
  )
}