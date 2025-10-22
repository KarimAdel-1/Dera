'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ArrowUpRight, ArrowDownLeft, Clock, TrendingUp, Info } from 'lucide-react';

const LendingTab = () => {
  const { wallets, selectedWallet } = useSelector((state) => state.wallet);
  const [activeSubTab, setActiveSubTab] = useState('deposit');
  const [selectedTier, setSelectedTier] = useState(1);
  const [depositAmount, setDepositAmount] = useState('');
  const [poolStats, setPoolStats] = useState(null);
  const [userDeposits, setUserDeposits] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tier configurations
  const tiers = [
    {
      id: 1,
      name: 'Instant Access',
      apy: '4.5',
      lockPeriod: 'None',
      lendable: '30%',
      withdrawalTime: 'Instant',
      description: 'Withdraw anytime with instant access to your funds',
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 2,
      name: '30-Day Notice',
      apy: '5.85',
      lockPeriod: '30 days',
      lendable: '70%',
      withdrawalTime: '30 days after request',
      description: 'Higher yields with 30-day withdrawal notice',
      color: 'from-blue-500 to-cyan-600',
    },
    {
      id: 3,
      name: '90-Day Locked',
      apy: '7.65',
      lockPeriod: '90 days',
      lendable: '100%',
      withdrawalTime: '90 days after deposit',
      description: 'Maximum returns with 90-day lock period',
      color: 'from-purple-500 to-pink-600',
    },
  ];

  useEffect(() => {
    if (selectedWallet) {
      fetchPoolStats();
      fetchUserDeposits();
    }
  }, [selectedWallet]);

  const fetchPoolStats = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/pool/stats`);
      if (response.ok) {
        const data = await response.json();
        setPoolStats(data);
      }
    } catch (error) {
      console.error('Error fetching pool stats:', error);
    }
  };

  const fetchUserDeposits = async () => {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`/api/deposits/${selectedWallet?.accountId}`);
      if (response.ok) {
        const data = await response.json();
        setUserDeposits(data.deposits || []);
      }
    } catch (error) {
      console.error('Error fetching user deposits:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch('/api/lending/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedWallet?.accountId,
          tier: selectedTier,
          amount: depositAmount,
        }),
      });

      if (response.ok) {
        alert(`Successfully deposited ${depositAmount} HBAR to Tier ${selectedTier}!`);
        setDepositAmount('');
        await fetchPoolStats();
        await fetchUserDeposits();
      } else {
        alert('Failed to deposit. Please try again.');
      }
    } catch (error) {
      console.error('Deposit error:', error);
      alert('Failed to deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (depositId, tier) => {
    setLoading(true);
    try {
      const endpoint = tier === 1 ? '/api/lending/withdraw' : '/api/lending/request-withdraw';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: selectedWallet?.accountId,
          depositId,
        }),
      });

      if (response.ok) {
        const message =
          tier === 1
            ? 'Successfully withdrawn!'
            : `Withdrawal request submitted! Available in ${tier === 2 ? 30 : 90} days.`;
        alert(message);
        await fetchUserDeposits();
      } else {
        alert('Failed to process withdrawal. Please try again.');
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert('Failed to process withdrawal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTierStats = (tierId) => {
    if (!poolStats) return null;
    return {
      totalDeposited: poolStats[`tier${tierId}_total`] || 0,
      utilization: poolStats[`tier${tierId}_utilization`] || 0,
      apy: poolStats[`tier${tierId}_apy`] || tiers[tierId - 1].apy,
    };
  };

  return (
    <div className="h-full p-6 bg-[var(--color-bg-secondary)] rounded-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Lending</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Deposit HBAR and earn yields across three liquidity tiers
        </p>
      </div>

      {/* Tier Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {tiers.map((tier) => {
          const stats = getTierStats(tier.id);
          const isSelected = selectedTier === tier.id;

          return (
            <div
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`relative p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                isSelected
                  ? 'bg-gradient-to-br ' +
                    tier.color +
                    ' shadow-lg scale-105 border-2 border-white/20'
                  : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent'
              }`}
            >
              {/* Tier Badge */}
              <div
                className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[var(--color-bg-primary)] text-[var(--color-text-muted)]'
                }`}
              >
                Tier {tier.id}
              </div>

              {/* Tier Name */}
              <h3
                className={`text-lg font-bold mb-3 ${
                  isSelected ? 'text-white' : 'text-[var(--color-text-primary)]'
                }`}
              >
                {tier.name}
              </h3>

              {/* APY */}
              <div className="mb-4">
                <div
                  className={`text-3xl font-bold ${
                    isSelected ? 'text-white' : 'text-[var(--color-primary)]'
                  }`}
                >
                  {stats?.apy || tier.apy}%
                  <span className="text-sm font-normal ml-1">APY</span>
                </div>
              </div>

              {/* Details */}
              <div
                className={`space-y-2 text-sm ${
                  isSelected ? 'text-white/90' : 'text-[var(--color-text-muted)]'
                }`}
              >
                <div className="flex justify-between">
                  <span>Lock Period:</span>
                  <span className="font-semibold">{tier.lockPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lendable:</span>
                  <span className="font-semibold">{tier.lendable}</span>
                </div>
                {stats && (
                  <div className="flex justify-between">
                    <span>Utilization:</span>
                    <span className="font-semibold">{stats.utilization.toFixed(2)}%</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <p
                className={`mt-4 text-xs ${
                  isSelected ? 'text-white/80' : 'text-[var(--color-text-muted)]'
                }`}
              >
                {tier.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-border-primary)]">
        <button
          onClick={() => setActiveSubTab('deposit')}
          className={`px-6 py-3 font-medium transition-all ${
            activeSubTab === 'deposit'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 inline mr-2" />
          Deposit
        </button>
        <button
          onClick={() => setActiveSubTab('my-deposits')}
          className={`px-6 py-3 font-medium transition-all ${
            activeSubTab === 'my-deposits'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          My Deposits
        </button>
      </div>

      {/* Deposit Tab */}
      {activeSubTab === 'deposit' && (
        <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
            Deposit to {tiers[selectedTier - 1].name}
          </h3>

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Amount (HBAR)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Deposit Summary */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Current APY:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {getTierStats(selectedTier)?.apy || tiers[selectedTier - 1].apy}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Lock Period:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {tiers[selectedTier - 1].lockPeriod}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">You'll Receive:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {depositAmount || '0'} LP Tokens
              </span>
            </div>
          </div>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || parseFloat(depositAmount) <= 0 || loading}
            className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Processing...' : `Deposit to Tier ${selectedTier}`}
          </button>
        </div>
      )}

      {/* My Deposits Tab */}
      {activeSubTab === 'my-deposits' && (
        <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
            Your Active Deposits
          </h3>

          {userDeposits.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-muted)] mb-4">No active deposits yet</p>
              <button
                onClick={() => setActiveSubTab('deposit')}
                className="px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90"
              >
                Make Your First Deposit
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map((tierId) => {
                const tierDeposits = userDeposits.filter(
                  (d) => d.tier === tierId && d.status !== 'withdrawn'
                );

                if (tierDeposits.length === 0) return null;

                return (
                  <div key={tierId} className="border-b border-[var(--color-border-primary)] pb-4">
                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-3">
                      {tiers[tierId - 1].name}
                    </h4>
                    <div className="space-y-3">
                      {tierDeposits.map((deposit) => (
                        <div
                          key={deposit.id}
                          className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-lg"
                        >
                          <div>
                            <div className="font-medium text-[var(--color-text-primary)]">
                              {deposit.amount} HBAR
                            </div>
                            <div className="text-sm text-[var(--color-text-muted)]">
                              LP Tokens: {deposit.lpTokens}
                            </div>
                            <div className="text-xs text-[var(--color-text-muted)] mt-1">
                              Deposited: {new Date(deposit.createdAt).toLocaleDateString()}
                            </div>
                            {deposit.status === 'pending_withdrawal' && (
                              <div className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Withdrawal requested
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleWithdraw(deposit.id, tierId)}
                            disabled={loading || deposit.status === 'pending_withdrawal'}
                            className="px-4 py-2 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {loading
                              ? 'Processing...'
                              : deposit.status === 'pending_withdrawal'
                              ? 'Pending'
                              : tierId === 1
                              ? 'Withdraw'
                              : 'Request Withdrawal'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LendingTab;
