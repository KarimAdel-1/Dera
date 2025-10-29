'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import LendingInterface from './LendingInterface';
import DualYieldDisplay from './DualYieldDisplay';
import HCSEventHistory from './HCSEventHistory';
import ProtocolAnalytics from './ProtocolAnalytics';
import deraProtocolService from '../../../../services/deraProtocolService';

export default function DeraProtocolTab() {
  const { accountId } = useSelector((state) => state.wallet);
  const [activeSection, setActiveSection] = useState('lending');
  const [protocolData, setProtocolData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProtocolData();
  }, []);

  const loadProtocolData = async () => {
    try {
      setLoading(true);
      const metrics = await deraProtocolService.getProtocolMetrics();
      setProtocolData(metrics);
    } catch (error) {
      console.error('Error loading protocol data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'lending', label: 'Supply & Borrow', icon: '💰' },
    { id: 'yield', label: 'Dual Yield', icon: '📈' },
    { id: 'events', label: 'Event History', icon: '📜' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  const formatUSD = (value) => {
    if (!value) return '$0.00';
    const num = parseFloat(value) / 1e8; // Assuming 8 decimals for USD
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'lending':
        return <LendingInterface userAddress={accountId} />;
      case 'yield':
        return <DualYieldDisplay userAddress={accountId} />;
      case 'events':
        return <HCSEventHistory />;
      case 'analytics':
        return <ProtocolAnalytics />;
      default:
        return <LendingInterface userAddress={accountId} />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Dera Protocol</h1>
          <p className="text-text-secondary mt-1">
            Revolutionary DeFi Lending on Hedera with Dual Yield
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-text-secondary">Live on Hedera</span>
        </div>
      </div>

      {/* Protocol Stats */}
      {!loading && protocolData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-text-secondary text-sm mb-1">Total Value Locked</div>
            <div className="text-text-primary text-2xl font-bold">
              {formatUSD(protocolData.totalValueLocked)}
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-text-secondary text-sm mb-1">Total Supplied</div>
            <div className="text-text-primary text-2xl font-bold">
              {formatUSD(protocolData.totalSupplied)}
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-text-secondary text-sm mb-1">Total Borrowed</div>
            <div className="text-text-primary text-2xl font-bold">
              {formatUSD(protocolData.totalBorrowed)}
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-4">
            <div className="text-text-secondary text-sm mb-1">Total Users</div>
            <div className="text-text-primary text-2xl font-bold">
              {protocolData.totalUsers?.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="flex gap-2 border-b border-border">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeSection === section.id
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
            {activeSection === section.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            )}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="mt-6">{renderSectionContent()}</div>

      {/* Hedera Features Badge */}
      <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg">
        <h3 className="text-lg font-bold text-text-primary mb-3">
          🚀 Hedera-Exclusive Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <div className="font-semibold text-text-primary">HCS Event Streaming</div>
              <div className="text-sm text-text-secondary">
                Immutable audit trail via Hedera Consensus Service
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">💎</div>
            <div>
              <div className="font-semibold text-text-primary">Dual Yield</div>
              <div className="text-sm text-text-secondary">
                Lending APY + Node Staking Rewards
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔍</div>
            <div>
              <div className="font-semibold text-text-primary">No Custom Indexer</div>
              <div className="text-sm text-text-secondary">
                Query protocol data via Hedera Mirror Nodes
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚙️</div>
            <div>
              <div className="font-semibold text-text-primary">Hedera-Optimized</div>
              <div className="text-sm text-text-secondary">
                Advanced rate model leveraging fast finality
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
