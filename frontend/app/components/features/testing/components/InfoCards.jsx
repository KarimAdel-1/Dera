'use client';
import { Shield, HelpCircle, BarChart3, Check } from 'lucide-react';

const InfoCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6 hover:border-[var(--color-primary)] transition-all">
        <div className="flex items-center mb-4">
          <div className="bg-green-100 p-3 rounded-[12px] mr-3">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-[var(--color-text-primary)] font-medium text-[16px] sm:text-[18px]">Safety Tips</h3>
        </div>
        <ul className="space-y-3 text-[13px] sm:text-[14px] text-[var(--color-text-secondary)]">
          <li className="flex items-start">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span>Keep health factor above <strong>1.5</strong></span>
          </li>
          <li className="flex items-start">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span>Never borrow your maximum available</span>
          </li>
          <li className="flex items-start">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span>Monitor prices during high volatility</span>
          </li>
          <li className="flex items-start">
            <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <span>Diversify your collateral assets</span>
          </li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6 hover:border-[var(--color-primary)] transition-all">
        <div className="flex items-center mb-4">
          <div className="bg-purple-100 p-3 rounded-[12px] mr-3">
            <HelpCircle className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-[var(--color-text-primary)] font-medium text-[16px] sm:text-[18px]">How It Works</h3>
        </div>
        <ul className="space-y-3 text-[13px] sm:text-[14px] text-[var(--color-text-secondary)]">
          <li className="flex items-start">
            <span className="font-medium text-[var(--color-primary)] mr-2">1.</span>
            <span>Supply assets to earn interest</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium text-[var(--color-primary)] mr-2">2.</span>
            <span>Enable as collateral to unlock borrowing</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium text-[var(--color-primary)] mr-2">3.</span>
            <span>Borrow against your collateral value</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium text-[var(--color-primary)] mr-2">4.</span>
            <span>Repay anytime to unlock collateral</span>
          </li>
        </ul>
      </div>

      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6 hover:border-[var(--color-primary)] transition-all">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 p-3 rounded-[12px] mr-3">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-[var(--color-text-primary)] font-medium text-[16px] sm:text-[18px]">Protocol Stats</h3>
        </div>
        <div className="space-y-3 text-[13px] sm:text-[14px]">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Total Value Locked</span>
            <span className="font-medium text-[var(--color-text-primary)]">$12.5M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Total Borrowed</span>
            <span className="font-medium text-[var(--color-text-primary)]">$8.2M</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Active Users</span>
            <span className="font-medium text-[var(--color-text-primary)]">1,234</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Network</span>
            <span className="font-medium text-[var(--color-primary)]">Hedera</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCards;
