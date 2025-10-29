'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import deraProtocolService from '../../../../services/deraProtocolService';

export default function DualYieldDisplay({ userAddress }) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [dualYieldData, setDualYieldData] = useState(null);
  const [stakingData, setStakingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadDualYield(selectedAsset.address);
    }
  }, [selectedAsset]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetsList, staking] = await Promise.all([
        deraProtocolService.getAssetsList(),
        deraProtocolService.getNodeStakingRewards(),
      ]);

      setAssets(assetsList);
      setStakingData(staking);

      if (assetsList.length > 0) {
        setSelectedAsset(assetsList[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDualYield = async (assetAddress) => {
    try {
      const yieldData = await deraProtocolService.getDualYield(assetAddress);
      setDualYieldData(yieldData);
    } catch (error) {
      console.error('Error loading dual yield:', error);
    }
  };

  const formatHBAR = (value) => {
    if (!value) return '0 ℏ';
    const num = parseFloat(value) / 1e8; // 8 decimals
    return `${num.toLocaleString()} ℏ`;
  };

  // Prepare chart data for yield breakdown
  const yieldBreakdownData = dualYieldData
    ? [
        { name: 'Lending APY', value: parseFloat(dualYieldData.lendingAPY), color: '#4F46E5' },
        { name: 'Staking Rewards', value: parseFloat(dualYieldData.stakingAPY), color: '#10B981' },
      ]
    : [];

  // Prepare chart data for staked nodes
  const nodesData = stakingData?.stakedNodes?.map((node) => ({
    name: `Node ${node.nodeId}`,
    staked: parseFloat(node.amount) / 1e8,
    rewards: parseFloat(node.rewards) / 1e8,
  })) || [];

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading dual yield data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Asset Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Dual Yield Mechanism</h2>
          <p className="text-text-secondary mt-1">
            Earn from lending APY + Hedera node staking rewards
          </p>
        </div>
        <select
          value={selectedAsset?.address || ''}
          onChange={(e) => {
            const asset = assets.find((a) => a.address === e.target.value);
            setSelectedAsset(asset);
          }}
          className="px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {assets.map((asset) => (
            <option key={asset.address} value={asset.address}>
              {asset.symbol}
            </option>
          ))}
        </select>
      </div>

      {/* Dual Yield Overview */}
      {dualYieldData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Lending APY</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {dualYieldData.lendingAPY}%
            </div>
            <p className="text-xs text-text-secondary mt-2">
              From lending interest
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Staking Rewards</span>
              <span className="text-2xl">💎</span>
            </div>
            <div className="text-3xl font-bold text-green-500">
              +{dualYieldData.stakingAPY}%
            </div>
            <p className="text-xs text-text-secondary mt-2">
              From Hedera node staking
            </p>
          </div>

          <div className="bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total APY</span>
              <span className="text-2xl">🚀</span>
            </div>
            <div className="text-3xl font-bold text-accent">
              {dualYieldData.totalAPY}%
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Combined yield
            </p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold text-text-primary mb-4">
          🔍 How Dual Yield Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl mb-3">
              1️⃣
            </div>
            <h4 className="font-semibold text-text-primary mb-2">Protocol Fees Collection</h4>
            <p className="text-sm text-text-secondary">
              Dera Protocol collects fees from borrowing interest (asset factor)
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-3xl mb-3">
              2️⃣
            </div>
            <h4 className="font-semibold text-text-primary mb-2">Stake with Hedera Nodes</h4>
            <p className="text-sm text-text-secondary">
              Protocol stakes HBAR fees with Hedera consensus nodes earning ~6-8% APY
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center text-3xl mb-3">
              3️⃣
            </div>
            <h4 className="font-semibold text-text-primary mb-2">Rewards to Suppliers</h4>
            <p className="text-sm text-text-secondary">
              Staking rewards are distributed proportionally to all suppliers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Breakdown Pie Chart */}
        {dualYieldData && (
          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Yield Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={yieldBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(2)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {yieldBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span className="text-sm text-text-secondary">Lending APY</span>
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {dualYieldData.lendingAPY}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-sm text-text-secondary">Staking Rewards</span>
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {dualYieldData.stakingAPY}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Staked Nodes Distribution */}
        {stakingData && nodesData.length > 0 && (
          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Staked Nodes Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={nodesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                  }}
                />
                <Legend />
                <Bar dataKey="staked" fill="#4F46E5" name="Staked (HBAR)" />
                <Bar dataKey="rewards" fill="#10B981" name="Rewards (HBAR)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Node Staking Stats */}
      {stakingData && (
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Node Staking Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-bg-primary rounded-lg">
              <div className="text-text-secondary text-sm mb-1">Total Staked</div>
              <div className="text-text-primary text-xl font-bold">
                {formatHBAR(stakingData.totalStaked)}
              </div>
            </div>
            <div className="p-4 bg-bg-primary rounded-lg">
              <div className="text-text-secondary text-sm mb-1">Total Rewards Earned</div>
              <div className="text-text-primary text-xl font-bold">
                {formatHBAR(stakingData.totalRewardsEarned)}
              </div>
            </div>
            <div className="p-4 bg-bg-primary rounded-lg">
              <div className="text-text-secondary text-sm mb-1">Staking APY</div>
              <div className="text-text-primary text-xl font-bold">
                {stakingData.currentAPY}%
              </div>
            </div>
            <div className="p-4 bg-bg-primary rounded-lg">
              <div className="text-text-secondary text-sm mb-1">Active Nodes</div>
              <div className="text-text-primary text-xl font-bold">
                {stakingData.stakedNodes?.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unique Value Proposition */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-green-500/10 border border-primary/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">⚡</div>
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Why Dera Protocol is Unique
            </h3>
            <p className="text-text-secondary mb-4">
              This dual yield mechanism is <strong className="text-primary">ONLY possible on Hedera</strong>.
              No other blockchain offers native node staking that can be seamlessly integrated
              into a DeFi lending protocol like this.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-text-secondary">
                  Hedera's proof-of-stake allows protocol-level staking
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-text-secondary">
                  Fast finality enables real-time reward calculations
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-text-secondary">
                  Low fees make micro-distribution economically viable
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-text-secondary">
                  Consensus nodes provide stable 6-8% APY baseline
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
