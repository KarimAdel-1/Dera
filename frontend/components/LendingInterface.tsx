import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface PoolStats {
  tier: number;
  totalDeposited: string;
  totalBorrowed: string;
  utilization: string;
  apy: string;
}

interface UserDeposit {
  id: string;
  tier: number;
  amount: string;
  lpTokens: string;
  status: 'active' | 'pending_withdrawal' | 'withdrawn';
  withdrawalRequestDate?: Date;
  createdAt: Date;
}

export default function LendingInterface() {
  const { activeWallet, isConnecting } = useWallet();
  const { addNotification } = useNotifications();
  const [selectedTier, setSelectedTier] = useState(1);
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [poolStats, setPoolStats] = useState<PoolStats[]>([]);
  const [userDeposits, setUserDeposits] = useState<UserDeposit[]>([]);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

  const tiers = [
    {
      id: 1,
      name: 'Instant Access',
      lockPeriod: 'None',
      lendable: '30%',
      description: 'Withdraw anytime with instant access to your funds',
    },
    {
      id: 2,
      name: '30-Day Notice',
      lockPeriod: '30 days',
      lendable: '70%',
      description: 'Higher yields with 30-day withdrawal notice',
    },
    {
      id: 3,
      name: '90-Day Locked',
      lockPeriod: '90 days',
      lendable: '100%',
      description: 'Maximum returns with 90-day lock period',
    },
  ];

  // Fetch pool stats and user deposits on mount and when wallet changes
  useEffect(() => {
    if (activeWallet) {
      fetchPoolStats();
      fetchUserDeposits();
    }
  }, [activeWallet]);

  const fetchPoolStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pool/stats`);
      if (!response.ok) throw new Error('Failed to fetch pool stats');
      const data = await response.json();
      setPoolStats(data.stats);
    } catch (error) {
      console.error('Error fetching pool stats:', error);
      // Use default values if API fails
      setPoolStats([
        { tier: 1, totalDeposited: '0', totalBorrowed: '0', utilization: '0', apy: '4.5' },
        { tier: 2, totalDeposited: '0', totalBorrowed: '0', utilization: '0', apy: '5.85' },
        { tier: 3, totalDeposited: '0', totalBorrowed: '0', utilization: '0', apy: '7.65' },
      ]);
    }
  };

  const fetchUserDeposits = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/deposits/${activeWallet?.accountId}`
      );
      if (!response.ok) throw new Error('Failed to fetch user deposits');
      const data = await response.json();
      setUserDeposits(data.deposits);
    } catch (error) {
      console.error('Error fetching user deposits:', error);
      setUserDeposits([]);
    }
  };

  const handleDeposit = async () => {
    if (!activeWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    try {
      // Convert amount to tinybars (1 HBAR = 100,000,000 tinybars)
      const amountInTinybars = ethers.parseUnits(amount, 8);

      // Call backend API to process deposit
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lending/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.accountId,
          tier: selectedTier,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deposit failed');
      }

      const result = await response.json();

      toast.success(`Successfully deposited ${amount} HBAR to Tier ${selectedTier}!`);
      addNotification({
        type: 'success',
        title: 'Deposit Successful',
        message: `Deposited ${amount} HBAR to ${tiers[selectedTier - 1].name}. You received ${result.lpTokens} LP tokens.`,
      });

      // Refresh data
      await fetchPoolStats();
      await fetchUserDeposits();
      setAmount('');
    } catch (error: any) {
      console.error('Deposit error:', error);
      toast.error(error.message || 'Failed to deposit. Please try again.');
      addNotification({
        type: 'error',
        title: 'Deposit Failed',
        message: error.message || 'Failed to process deposit',
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async (depositId: string, tier: number) => {
    if (!activeWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsWithdrawing(true);
    try {
      if (tier === 1) {
        // Instant withdrawal for Tier 1
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lending/withdraw`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: activeWallet.accountId,
            depositId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Withdrawal failed');
        }

        const result = await response.json();
        toast.success(`Successfully withdrawn ${result.amount} HBAR!`);
        addNotification({
          type: 'success',
          title: 'Withdrawal Successful',
          message: `Withdrawn ${result.amount} HBAR from Tier 1.`,
        });
      } else {
        // Request withdrawal for Tier 2/3
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/lending/request-withdraw`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: activeWallet.accountId,
              depositId,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Withdrawal request failed');
        }

        const lockDays = tier === 2 ? 30 : 90;
        toast.success(`Withdrawal request submitted! Available in ${lockDays} days.`);
        addNotification({
          type: 'info',
          title: 'Withdrawal Requested',
          message: `Your withdrawal will be available in ${lockDays} days.`,
        });
      }

      // Refresh data
      await fetchPoolStats();
      await fetchUserDeposits();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to process withdrawal. Please try again.');
      addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: error.message || 'Failed to process withdrawal',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getTierStats = (tierId: number) => {
    return poolStats.find((s) => s.tier === tierId) || {
      tier: tierId,
      totalDeposited: '0',
      totalBorrowed: '0',
      utilization: '0',
      apy: tierId === 1 ? '4.5' : tierId === 2 ? '5.85' : '7.65',
    };
  };

  const getUserDepositsByTier = (tierId: number) => {
    return userDeposits.filter((d) => d.tier === tierId && d.status !== 'withdrawn');
  };

  if (!activeWallet) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-8">
          Please connect your wallet to start lending and earning yields.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Pool Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {tiers.map((tier) => {
          const stats = getTierStats(tier.id);
          return (
            <div
              key={tier.id}
              onClick={() => setSelectedTier(tier.id)}
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTier === tier.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <h3 className="font-semibold text-lg mb-2">{tier.name}</h3>
              <div className="text-2xl font-bold text-blue-600 mb-2">{stats.apy}% APY</div>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <div className="flex justify-between">
                  <span>Lock:</span>
                  <span className="font-medium">{tier.lockPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lendable:</span>
                  <span className="font-medium">{tier.lendable}</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilization:</span>
                  <span className="font-medium">{parseFloat(stats.utilization).toFixed(2)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500">{tier.description}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'deposit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'withdraw'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Deposits
          </button>
        </div>
      </div>

      {/* Deposit Tab */}
      {activeTab === 'deposit' && (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-4">
            Deposit to {tiers[selectedTier - 1].name}
          </h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (HBAR)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Current APY:</span>
              <span className="font-semibold">{getTierStats(selectedTier).apy}%</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Lock Period:</span>
              <span className="font-semibold">{tiers[selectedTier - 1].lockPeriod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">You'll Receive:</span>
              <span className="font-semibold">{amount || '0'} LP Tokens</span>
            </div>
          </div>

          <button
            onClick={handleDeposit}
            disabled={!amount || parseFloat(amount) <= 0 || isDepositing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium"
          >
            {isDepositing ? 'Processing...' : `Deposit to Tier ${selectedTier}`}
          </button>
        </div>
      )}

      {/* Withdraw Tab - User Deposits */}
      {activeTab === 'withdraw' && (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-6">Your Deposits</h3>

          {userDeposits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No active deposits yet.</p>
              <button
                onClick={() => setActiveTab('deposit')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Make your first deposit
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {[1, 2, 3].map((tierId) => {
                const tierDeposits = getUserDepositsByTier(tierId);
                if (tierDeposits.length === 0) return null;

                return (
                  <div key={tierId} className="border-b pb-4">
                    <h4 className="font-semibold mb-3">{tiers[tierId - 1].name}</h4>
                    <div className="space-y-3">
                      {tierDeposits.map((deposit) => (
                        <div
                          key={deposit.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{deposit.amount} HBAR</div>
                            <div className="text-sm text-gray-600">
                              LP Tokens: {deposit.lpTokens}
                            </div>
                            <div className="text-xs text-gray-500">
                              Deposited: {new Date(deposit.createdAt).toLocaleDateString()}
                            </div>
                            {deposit.status === 'pending_withdrawal' && (
                              <div className="text-xs text-orange-600 mt-1">
                                Withdrawal requested on{' '}
                                {deposit.withdrawalRequestDate
                                  ? new Date(deposit.withdrawalRequestDate).toLocaleDateString()
                                  : 'N/A'}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleWithdraw(deposit.id, tierId)}
                            disabled={isWithdrawing || deposit.status === 'pending_withdrawal'}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm"
                          >
                            {isWithdrawing
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
}
