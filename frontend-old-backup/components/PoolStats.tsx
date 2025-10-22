import React from 'react';

export default function PoolStats() {
  // In production, fetch from API
  const stats = {
    totalValueLocked: '1,234,567',
    totalBorrowed: '456,789',
    tier1APY: '4.5',
    tier2APY: '5.85',
    tier3APY: '7.65',
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center mb-12">Platform Statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500 mb-2">Total Value Locked</div>
          <div className="text-2xl font-bold text-primary-600">{stats.totalValueLocked} HBAR</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500 mb-2">Total Borrowed</div>
          <div className="text-2xl font-bold text-primary-600">{stats.totalBorrowed} HBAR</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500 mb-2">Tier 1 APY</div>
          <div className="text-2xl font-bold text-green-600">{stats.tier1APY}%</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500 mb-2">Tier 2 APY</div>
          <div className="text-2xl font-bold text-green-600">{stats.tier2APY}%</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500 mb-2">Tier 3 APY</div>
          <div className="text-2xl font-bold text-green-600">{stats.tier3APY}%</div>
        </div>
      </div>
    </div>
  );
}
