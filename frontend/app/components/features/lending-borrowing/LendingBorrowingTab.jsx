'use client'

import { useState, useEffect } from 'react'
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
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useLendingActions } from '../../../hooks/useLendingActions'
import { useBorrowingActions } from '../../../hooks/useBorrowingActions'
import LendTab from './LendTab'
import BorrowTab from './BorrowTab'

export default function LendingBorrowingTab() {
  const { isConnected, activeWallet } = useSelector((state) => state.wallet)
  const poolStats = useSelector((state) => state.lending.poolStats)
  const loans = useSelector((state) => state.borrowing.loans)
  const [activeMode, setActiveMode] = useState('overview')
  const [timeRange, setTimeRange] = useState('7D')
  const [isLoading, setIsLoading] = useState(true)

  // Initialize hooks for data fetching
  const { getPoolStatistics, getUserDeposits } = useLendingActions()
  const { getUserLoan } = useBorrowingActions()

  // Chart data - will be populated from smart contracts or use mock data as fallback
  const [apyHistoryData, setApyHistoryData] = useState([
    { date: '12/17', tier1: 4.2, tier2: 5.5, tier3: 7.2 },
    { date: '12/18', tier1: 4.3, tier2: 5.7, tier3: 7.4 },
    { date: '12/19', tier1: 4.5, tier2: 5.8, tier3: 7.6 },
    { date: '12/20', tier1: 4.4, tier2: 5.9, tier3: 7.5 },
    { date: '12/21', tier1: 4.6, tier2: 6.0, tier3: 7.7 },
    { date: '12/22', tier1: 4.5, tier2: 5.9, tier3: 7.6 },
    { date: '12/23', tier1: poolStats.tier1_apy, tier2: poolStats.tier2_apy, tier3: poolStats.tier3_apy },
  ])

  const [tvlData, setTvlData] = useState([
    { date: '12/17', supply: 2.65, borrow: 1.98 },
    { date: '12/18', supply: 2.70, borrow: 2.05 },
    { date: '12/19', supply: 2.75, borrow: 2.08 },
    { date: '12/20', supply: 2.78, borrow: 2.10 },
    { date: '12/21', supply: 2.80, borrow: 2.12 },
    { date: '12/22', supply: 2.82, borrow: 2.14 },
    { date: '12/23', supply: 2.84, borrow: 2.15 },
  ])

  const [tierDistribution, setTierDistribution] = useState([
    { name: 'Tier 1 - Instant', value: 850, color: '#3b82f6' },
    { name: 'Tier 2 - 30-Day', value: 1120, color: '#8b5cf6' },
    { name: 'Tier 3 - 90-Day', value: 870, color: '#06b6d4' },
  ])

  const [volumeData, setVolumeData] = useState([
    { date: '12/17', lending: 145, borrowing: 98 },
    { date: '12/18', lending: 165, borrowing: 112 },
    { date: '12/19', lending: 152, borrowing: 105 },
    { date: '12/20', lending: 178, borrowing: 125 },
    { date: '12/21', lending: 192, borrowing: 138 },
    { date: '12/22', lending: 185, borrowing: 142 },
    { date: '12/23', lending: 198, borrowing: 155 },
  ])

  // Fetch pool statistics on mount and when wallet connects
  useEffect(() => {
    const fetchPoolData = async () => {
      if (!isConnected || !activeWallet) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Fetch pool statistics from smart contracts
        // Note: This will only work after contracts are deployed and contractService is initialized
        // For now, it will fall back to Redux state default values
        try {
          const stats = await getPoolStatistics()

          // Update tier distribution and TVL based on real data
          if (stats) {
            const tier1Total = parseFloat(stats.tier1Total) || 0
            const tier2Total = parseFloat(stats.tier2Total) || 0
            const tier3Total = parseFloat(stats.tier3Total) || 0
            const totalSupplied = parseFloat(stats.totalSupplied) || 0
            const totalBorrowed = parseFloat(stats.totalBorrowed) || 0

            if (tier1Total > 0 || tier2Total > 0 || tier3Total > 0) {
              setTierDistribution([
                { name: 'Tier 1 - Instant', value: tier1Total, color: '#3b82f6' },
                { name: 'Tier 2 - 30-Day', value: tier2Total, color: '#8b5cf6' },
                { name: 'Tier 3 - 90-Day', value: tier3Total, color: '#06b6d4' },
              ])
            }

            // Update TVL data with real values (keep last 7 days of history)
            if (totalSupplied > 0 || totalBorrowed > 0) {
              const today = new Date()
              const dateStr = `${today.getMonth() + 1}/${today.getDate()}`

              setTvlData(prev => {
                const newData = [...prev]
                // Update the last entry with real data
                if (newData.length > 0) {
                  newData[newData.length - 1] = {
                    date: dateStr,
                    supply: (totalSupplied / 1000).toFixed(2),
                    borrow: (totalBorrowed / 1000).toFixed(2)
                  }
                }
                return newData
              })
            }
          }
        } catch (error) {
          console.log('Using mock data - contracts not yet connected:', error.message)
        }

        // Fetch user's deposits if wallet is connected
        try {
          await getUserDeposits(activeWallet)
        } catch (error) {
          console.log('Could not fetch user deposits:', error.message)
        }

        // Fetch user's loan if wallet is connected
        try {
          await getUserLoan(activeWallet)
        } catch (error) {
          console.log('Could not fetch user loan:', error.message)
        }

      } catch (error) {
        console.error('Error fetching pool data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoolData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchPoolData, 30000)
    return () => clearInterval(interval)
  }, [isConnected, activeWallet])

  const StatCard = ({ title, value, icon: Icon, subtitle, change, trend }) => (
    <div className="rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{title}</span>
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      {subtitle && <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</div>}
    </div>
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg p-3 shadow-lg" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

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
                value={`${(parseFloat(poolStats.totalSupplied) || 0).toLocaleString()} HBAR`}
                icon={DollarSign}
                subtitle={`Across ${Object.keys(poolStats).filter(k => k.includes('tier') && k.includes('Total')).length} tiers`}
                change={poolStats.supplyChange || null}
                trend={poolStats.supplyChange && parseFloat(poolStats.supplyChange) > 0 ? "up" : "down"}
              />
              <StatCard
                title="Supply APY"
                value={`${(parseFloat(poolStats.tier1_apy) || 0).toFixed(2)}%`}
                icon={Percent}
                subtitle="Tier 1: Instant Access"
                change={poolStats.apyChange || null}
                trend={poolStats.apyChange && parseFloat(poolStats.apyChange) > 0 ? "up" : "down"}
              />
              <StatCard
                title="Total Borrowed"
                value={`${(parseFloat(poolStats.totalBorrowed) || 0).toLocaleString()} HBAR`}
                icon={BarChart3}
                subtitle={`${loans?.length || 0} active loans`}
                change={poolStats.borrowChange || null}
                trend={poolStats.borrowChange && parseFloat(poolStats.borrowChange) > 0 ? "up" : "down"}
              />
              <StatCard
                title="Borrow APY"
                value={`${(parseFloat(poolStats.borrowAPY) || 5.0).toFixed(2)}%`}
                icon={Percent}
                subtitle="Based on iScore 500"
                change={poolStats.borrowAPYChange || null}
                trend={poolStats.borrowAPYChange && parseFloat(poolStats.borrowAPYChange) < 0 ? "down" : "up"}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* APY History Chart */}
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>APY History by Tier</h2>
                  <div className="flex gap-2">
                    {['7D', '1M', '3M', '1Y'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          timeRange === range
                            ? 'font-medium'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: timeRange === range ? 'var(--color-primary)' : 'transparent',
                          color: timeRange === range ? 'white' : 'var(--color-text-muted)'
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={apyHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="tier1" stroke="#3b82f6" name="Tier 1" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="tier2" stroke="#8b5cf6" name="Tier 2" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="tier3" stroke="#06b6d4" name="Tier 3" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* TVL Chart */}
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Total Value Locked (TVL)</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={tvlData}>
                    <defs>
                      <linearGradient id="colorSupply" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBorrow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="supply" stroke="#10b981" fillOpacity={1} fill="url(#colorSupply)" name="Supply ($B)" />
                    <Area type="monotone" dataKey="borrow" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBorrow)" name="Borrow ($B)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Tier Distribution Chart */}
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Liquidity Distribution by Tier</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={tierDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' - ')[0]}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tierDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {tierDistribution.map((tier, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }}></div>
                        <span style={{ color: 'var(--color-text-secondary)' }}>{tier.name}</span>
                      </div>
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>${tier.value}M</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume Chart */}
              <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-primary)' }}>
                <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>Daily Volume</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
                    <XAxis dataKey="date" stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <YAxis stroke="var(--color-text-muted)" style={{ fontSize: '12px' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="lending" fill="#10b981" name="Lending ($M)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="borrowing" fill="#3b82f6" name="Borrowing ($M)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                      <div className="h-full transition-all duration-500" style={{ width: '75.7%', backgroundColor: 'var(--color-primary)' }}></div>
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
                  <div className="flex justify-between">
                    <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>24h Volume</span>
                    <span className="text-sm font-medium text-green-600">+$353M</span>
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