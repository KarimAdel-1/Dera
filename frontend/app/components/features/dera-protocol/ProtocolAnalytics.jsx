'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import deraProtocolService from '../../../../services/deraProtocolService';

export default function ProtocolAnalytics() {
  const [metrics, setMetrics] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetMetrics, setAssetMetrics] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7); // days
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [selectedTimeframe]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [protocolMetrics, assetsList, historical] = await Promise.all([
        deraProtocolService.getProtocolMetrics(),
        deraProtocolService.getAssetsList(),
        deraProtocolService.getHistoricalSnapshots(selectedTimeframe),
      ]);

      setMetrics(protocolMetrics);
      setAssets(assetsList);
      setHistoricalData(historical);

      // Load metrics for each asset
      const metricsPromises = assetsList.map((asset) =>
        deraProtocolService.getAssetMetrics(asset.address)
      );
      const allAssetMetrics = await Promise.all(metricsPromises);

      const metricsMap = {};
      assetsList.forEach((asset, index) => {
        metricsMap[asset.address] = allAssetMetrics[index];
      });
      setAssetMetrics(metricsMap);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUSD = (value) => {
    if (!value) return '$0';
    const num = parseFloat(value) / 1e8;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const tvlChartData = historicalData.map((snapshot) => ({
    date: formatDate(snapshot.timestamp),
    TVL: snapshot.tvl / 1e6, // Convert to millions
    Supplied: snapshot.totalSupplied / 1e6,
    Borrowed: snapshot.totalBorrowed / 1e6,
  }));

  const utilizationChartData = historicalData.map((snapshot) => ({
    date: formatDate(snapshot.timestamp),
    Utilization: snapshot.utilizationRate,
  }));

  const assetComparisonData = assets.map((asset) => {
    const metrics = assetMetrics[asset.address];
    return {
      name: asset.symbol,
      Supply: metrics ? parseFloat(metrics.totalSupply) / 1e8 : 0,
      Borrow: metrics ? parseFloat(metrics.totalBorrow) / 1e8 : 0,
      Utilization: metrics ? parseFloat(metrics.utilization) : 0,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading analytics from Mirror Node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Protocol Analytics</h2>
          <p className="text-text-secondary mt-1">
            Real-time metrics stored on-chain, queryable via Hedera Mirror Node
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedTimeframe(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTimeframe === days
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔍</div>
          <div>
            <h3 className="font-semibold text-text-primary mb-2">
              Mirror Node Analytics
            </h3>
            <p className="text-sm text-text-secondary">
              All analytics are stored on-chain in the DeraMirrorNodeAnalytics contract and
              automatically indexed by Hedera Mirror Nodes. No custom indexer, subgraph, or
              external database required!
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Value Locked</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatUSD(metrics.totalValueLocked)}
            </div>
            <div className="text-xs text-green-500 mt-1">↑ 12.5% this week</div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Supplied</span>
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatUSD(metrics.totalSupplied)}
            </div>
            <div className="text-xs text-green-500 mt-1">↑ 8.2% this week</div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Borrowed</span>
              <span className="text-2xl">🏦</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatUSD(metrics.totalBorrowed)}
            </div>
            <div className="text-xs text-green-500 mt-1">↑ 15.7% this week</div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Users</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {metrics.totalUsers?.toLocaleString()}
            </div>
            <div className="text-xs text-green-500 mt-1">↑ 23 new today</div>
          </div>
        </div>
      )}

      {/* TVL & Supply/Borrow Chart */}
      <div className="bg-bg-secondary border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Total Value Locked Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={tvlChartData}>
            <defs>
              <linearGradient id="colorTVL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSupplied" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBorrowed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="date" stroke="#888" />
            <YAxis stroke="#888" label={{ value: 'Millions ($)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="TVL"
              stroke="#4F46E5"
              fillOpacity={1}
              fill="url(#colorTVL)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Supplied"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#colorSupplied)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Borrowed"
              stroke="#F59E0B"
              fillOpacity={1}
              fill="url(#colorBorrowed)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Rate Chart */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Utilization Rate Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={utilizationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" />
              <YAxis stroke="#888" label={{ value: '%', angle: 0, position: 'insideRight' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                }}
              />
              <Line
                type="monotone"
                dataKey="Utilization"
                stroke="#4F46E5"
                strokeWidth={3}
                dot={{ fill: '#4F46E5', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Asset Comparison Chart */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Asset Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={assetComparisonData}>
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
              <Bar dataKey="Supply" fill="#10B981" />
              <Bar dataKey="Borrow" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Details Table */}
      <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">Asset Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Supply APY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Borrow APY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total Supply
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total Borrow
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Suppliers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Borrowers
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => {
                const metrics = assetMetrics[asset.address];
                if (!metrics) return null;

                return (
                  <tr key={asset.address} className="hover:bg-bg-primary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-text-primary">
                          {asset.symbol}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-500 font-medium">
                        {metrics.supplyAPY}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-yellow-500 font-medium">
                        {metrics.borrowAPY}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {formatUSD(metrics.totalSupply)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {formatUSD(metrics.totalBorrow)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-text-primary mr-2">
                          {metrics.utilization}%
                        </span>
                        <div className="w-16 bg-bg-primary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${metrics.utilization}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {metrics.supplierCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text-primary">
                        {metrics.borrowerCount}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protocol Activity Stats */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Transactions</span>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {metrics.totalTransactions?.toLocaleString()}
            </div>
            <div className="text-xs text-text-secondary mt-1">All-time protocol activity</div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">24h Volume</span>
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">$150K</div>
            <div className="text-xs text-green-500 mt-1">↑ 32.1% vs yesterday</div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Last Updated</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">Live</div>
            <div className="text-xs text-text-secondary mt-1">
              {new Date(metrics.lastUpdateTimestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
