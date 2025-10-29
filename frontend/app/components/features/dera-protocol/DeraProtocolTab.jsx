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
    <div className="space-y-6 p-0 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-1">
          Dera Protocol
        </h2>
        <p className="text-[var(--color-text-muted)] text-[13px] sm:text-[14px]">
          Revolutionary DeFi Lending on Hedera with Dual Yield
        </p>
      </div>

      {/* Protocol Stats */}
      {!loading && protocolData && (
        <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal">
              Protocol Overview
            </h3>
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]/10 rounded-[12px]">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">Live on Hedera</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">Total Value Locked</div>
              <div className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-primary)]">
                {formatUSD(protocolData.totalValueLocked)}
              </div>
            </div>
            <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">Total Supplied</div>
              <div className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-success)]">
                {formatUSD(protocolData.totalSupplied)}
              </div>
            </div>
            <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">Total Borrowed</div>
              <div className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-text-primary)]">
                {formatUSD(protocolData.totalBorrowed)}
              </div>
            </div>
            <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">Total Users</div>
              <div className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-text-primary)]">
                {protocolData.totalUsers?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] overflow-hidden mb-6">
        <div className="flex border-b border-[var(--color-border-primary)]">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeSection === section.id
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="p-4 sm:p-6">
          {renderSectionContent()}
        </div>
      </div>

      {/* Hedera Features Badge */}
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
        <h3 className="text-[16px] sm:text-[18px] font-normal text-[var(--color-text-primary)] mb-4">
          🚀 Hedera-Exclusive Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] text-[13px] sm:text-[14px]">HCS Event Streaming</div>
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                Immutable audit trail via Hedera Consensus Service
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">💎</div>
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] text-[13px] sm:text-[14px]">Dual Yield</div>
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                Lending APY + Node Staking Rewards
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔍</div>
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] text-[13px] sm:text-[14px]">No Custom Indexer</div>
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                Query protocol data via Hedera Mirror Nodes
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚙️</div>
            <div>
              <div className="font-semibold text-[var(--color-text-primary)] text-[13px] sm:text-[14px]">Hedera-Optimized</div>
              <div className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                Advanced rate model leveraging fast finality
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
