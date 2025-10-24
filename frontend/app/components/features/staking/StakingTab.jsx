import React, { useState } from 'react';
import {
  Coins,
  TrendingUp,
  Clock,
  Award,
  ChevronDown,
  Wallet,
} from 'lucide-react';

const StakingTab = () => {
  const [activeTab, setActiveTab] = useState('stake');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('HBAR');

  const revenueData = [
    {
      label: 'Daily Revenue',
      value: '$35,475.00 N3X',
      change: '+18%',
      isPositive: true,
    },
    {
      label: 'Weekly Revenue',
      value: '$35,475.00 N3X',
      change: '+18%',
      isPositive: true,
    },
    {
      label: 'Monthly Revenue',
      value: '$35,475.00 N3X',
      change: '+18%',
      isPositive: true,
    },
    {
      label: 'Yearly Revenue',
      value: '$35,475.00 N3X',
      change: '-18%',
      isPositive: false,
    },
  ];

  const handlePercentage = (percent) => {
    const maxAmount = 100;
    setAmount(((maxAmount * percent) / 100).toFixed(2));
  };

  return (
    <div className="space-y-6">
      <div className="">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div
            className="flex flex-col gap-6 p-8 rounded-2xl"
            style={{ border: '1px solid var(--color-border-primary)' }}
          >
            {/* Ecosystem Revenue */}
            <div className="backdrop-blur-xl rounded-2xl flex-1">
              <h2 className="text-xl font-bold mb-6">Ecosystem Revenue</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {revenueData.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl p-6"
                    style={{
                      backgroundColor: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border-primary)',
                    }}
                  >
                    <p className="text-slate-400 text-sm mb-2">{item.label}</p>
                    <p className="text-2xl font-bold mb-2">{item.value}</p>
                    <p
                      className={`text-sm flex items-center gap-1 ${item.isPositive ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {item.change}
                      <TrendingUp
                        size={14}
                        className={item.isPositive ? '' : 'rotate-180'}
                      />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics Chart */}
            <div
              className="backdrop-blur-xl rounded-2xl p-6 flex-1"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-primary)',
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Statistics</h2>
                <button
                  className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-all"
                  style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                >
                  This Month
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Chart Area */}
              <div className="relative h-64">
                <div className="absolute inset-0 flex items-end justify-between gap-2">
                  {[45, 75, 55, 85, 65, 95, 70, 60, 80, 55, 90, 75].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex-1 flex flex-col justify-end"
                      >
                        <div
                          className="w-full rounded-t-lg relative group cursor-pointer transition-all"
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            height: `${height}%`,
                          }}
                        >
                          <div
                            className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm"
                            style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                            }}
                          >
                            $35,475.00 N3X
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {/* Month labels */}
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-slate-500">
                  {[
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
                {/* Highlight label */}
                <div
                  className="absolute top-8 left-24 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border-primary)',
                  }}
                >
                  <p className="text-xs text-slate-400">February Revenue</p>
                  <p className="font-bold">$35,475.00 N3X</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            {/* APY Card */}
            <div
              className="backdrop-blur-xl rounded-2xl p-6 flex-1"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-primary)',
              }}
            >
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      boxShadow: '0 0 40px var(--color-shadow-primary)',
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'var(--color-bg-secondary)' }}
                    >
                      <div
                        className="w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        H
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full blur-xl"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  ></div>
                  <div
                    className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full blur-xl"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  ></div>
                </div>
              </div>

              {/* APY Display */}
              <div className="text-center mb-6">
                <p className="text-slate-400 text-sm mb-2">Staking APY</p>
                <p className="text-5xl font-bold mb-3">9.45%</p>
                <p className="text-slate-400 text-sm">
                  Earn a competitive 9.45% APY by staking your tokens and
                  maximizing rewards from the N3X ecosystem.
                </p>
              </div>
            </div>

            {/* Staking Panel */}
            <div
              className="backdrop-blur-xl rounded-2xl p-6 flex-1"
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-primary)',
              }}
            >
              {/* Tabs */}
              <div
                className="flex gap-2 mb-6 rounded-xl p-1"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <button
                  onClick={() => setActiveTab('stake')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    activeTab === 'stake'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={
                    activeTab === 'stake'
                      ? { backgroundColor: 'var(--color-primary)' }
                      : {}
                  }
                >
                  Stake
                </button>
                <button
                  onClick={() => setActiveTab('unstake')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${
                    activeTab === 'unstake'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={
                    activeTab === 'unstake'
                      ? { backgroundColor: 'var(--color-primary)' }
                      : {}
                  }
                >
                  Unstake
                </button>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="text-slate-400 text-sm mb-2 block">
                  Amount
                </label>
                <div
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: 'var(--color-bg-input)' }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100"
                      className="bg-transparent text-3xl font-bold outline-none w-full"
                    />
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                      style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                      >
                        {selectedToken.charAt(0)}
                      </div>
                      <span className="font-semibold">{selectedToken}</span>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>≈$120.54</span>
                  </div>
                </div>

                {/* Percentage Buttons */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => handlePercentage(50)}
                    className="py-2 rounded-lg text-sm transition-all"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handlePercentage(30)}
                    className="py-2 rounded-lg text-sm transition-all"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    30%
                  </button>
                  <button
                    onClick={() => handlePercentage(20)}
                    className="py-2 rounded-lg text-sm transition-all"
                    style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
                  >
                    20%
                  </button>
                </div>
              </div>

              {/* Earnings Display */}
              <div
                className="rounded-xl p-4 mb-6 space-y-2"
                style={{ backgroundColor: 'var(--color-bg-input)' }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">You Will Get (Est.)</span>
                  <span className="font-semibold">828.023037 N3X</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Ratio</span>
                  <span className="font-semibold">1 ETH = 0.28263 N3X</span>
                </div>
              </div>

              {/* Connect Wallet Button */}
              <button
                className="w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg text-white hover:opacity-90"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 0 20px var(--color-shadow-primary)',
                }}
              >
                <Wallet size={20} />
                Stake
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingTab;
