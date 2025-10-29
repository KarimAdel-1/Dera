'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import deraProtocolService from '../../../../services/deraProtocolServiceV2';

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
    const num = parseFloat(value) / 1e8;
    return `${num.toLocaleString()} ℏ`;
  };

  const yieldBreakdownData = dualYieldData
    ? [
        { name: 'Lending APY', value: parseFloat(dualYieldData.lendingAPY), color: '#4F46E5' },
        { name: 'Staking Rewards', value: parseFloat(dualYieldData.stakingAPY), color: '#10B981' },
      ]
    : [];

  const nodesData = stakingData?.stakedNodes?.map((node) => ({
    name: `Node ${node.nodeId}`,
    staked: parseFloat(node.amount) / 1e8,
    rewards: parseFloat(node.rewards) / 1e8,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto mb-3"></div>
          <p className="text-[var(--color-text-muted)] text-[12px]">Loading dual yield data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {dualYieldData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--color-text-muted)]">Lending APY</span>
              <span className="text-xl">💰</span>
            </div>
            <div className="text-[18px] font-semibold text-[var(--color-success)]">
              {dualYieldData.lendingAPY}%
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              From lending interest
            </p>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--color-text-muted)]">Staking Rewards</span>
              <span className="text-xl">💎</span>
            </div>
            <div className="text-[18px] font-semibold text-[var(--color-success)]">
              +{dualYieldData.stakingAPY}%
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              From Hedera node staking
            </p>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--color-text-muted)]">Total APY</span>
              <span className="text-xl">🚀</span>
            </div>
            <div className="text-[18px] font-semibold text-[var(--color-primary)]">
              {dualYieldData.totalAPY}%
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Combined yield
            </p>
          </div>
        </div>
      )}

      <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
        <h3 className="text-[var(--color-text-primary)] text-[14px] font-medium mb-3">
          🔍 How Dual Yield Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center text-2xl mb-2">
              1️⃣
            </div>
            <h4 className="font-medium text-[var(--color-text-primary)] text-[12px] mb-1">Protocol Fees Collection</h4>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Dera Protocol collects fees from borrowing interest (asset factor)
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[var(--color-success)]/10 rounded-full flex items-center justify-center text-2xl mb-2">
              2️⃣
            </div>
            <h4 className="font-medium text-[var(--color-text-primary)] text-[12px] mb-1">Stake with Hedera Nodes</h4>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Protocol stakes HBAR fees with Hedera consensus nodes earning ~6-8% APY
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center text-2xl mb-2">
              3️⃣
            </div>
            <h4 className="font-medium text-[var(--color-text-primary)] text-[12px] mb-1">Rewards to Suppliers</h4>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Staking rewards are distributed proportionally to all suppliers
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {dualYieldData && (
          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
            <h3 className="text-[var(--color-text-primary)] text-[14px] font-medium mb-3">
              Yield Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={yieldBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(2)}%`}
                  outerRadius={60}
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
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded"></div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Lending APY</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                  {dualYieldData.lendingAPY}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-[11px] text-[var(--color-text-muted)]">Staking Rewards</span>
                </div>
                <span className="text-[11px] font-medium text-[var(--color-text-primary)]">
                  {dualYieldData.stakingAPY}%
                </span>
              </div>
            </div>
          </div>
        )}

        {stakingData && nodesData.length > 0 && (
          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
            <h3 className="text-[var(--color-text-primary)] text-[14px] font-medium mb-3">
              Staked Nodes Distribution
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={nodesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#888" style={{ fontSize: '11px' }} />
                <YAxis stroke="#888" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="staked" fill="#4F46E5" name="Staked (HBAR)" />
                <Bar dataKey="rewards" fill="#10B981" name="Rewards (HBAR)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {stakingData && (
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-3">
          <h3 className="text-[var(--color-text-primary)] text-[14px] font-medium mb-3">
            Node Staking Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[var(--color-bg-secondary)] rounded-[12px]">
              <div className="text-[var(--color-text-muted)] text-[11px] mb-1">Total Staked</div>
              <div className="text-[var(--color-text-primary)] text-[16px] font-semibold">
                {formatHBAR(stakingData.totalStaked)}
              </div>
            </div>
            <div className="p-3 bg-[var(--color-bg-secondary)] rounded-[12px]">
              <div className="text-[var(--color-text-muted)] text-[11px] mb-1">Total Rewards Earned</div>
              <div className="text-[var(--color-text-primary)] text-[16px] font-semibold">
                {formatHBAR(stakingData.totalRewardsEarned)}
              </div>
            </div>
            <div className="p-3 bg-[var(--color-bg-secondary)] rounded-[12px]">
              <div className="text-[var(--color-text-muted)] text-[11px] mb-1">Staking APY</div>
              <div className="text-[var(--color-text-primary)] text-[16px] font-semibold">
                {stakingData.currentAPY}%
              </div>
            </div>
            <div className="p-3 bg-[var(--color-bg-secondary)] rounded-[12px]">
              <div className="text-[var(--color-text-muted)] text-[11px] mb-1">Active Nodes</div>
              <div className="text-[var(--color-text-primary)] text-[16px] font-semibold">
                {stakingData.stakedNodes?.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
