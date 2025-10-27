'use client';
import { DollarSign, Coins } from 'lucide-react';
import Tooltip from './Tooltip';

const assetIcons = {
  'USDC': <DollarSign className="w-8 h-8 text-green-600" />,
  'HBAR': <span className="text-3xl">ℏ</span>,
  'USDT': <DollarSign className="w-8 h-8 text-green-600" />,
  'WBTC': <Coins className="w-8 h-8 text-orange-500" />,
  'ETH': <Coins className="w-8 h-8 text-blue-600" />,
};

const SupplyTab = ({ assets, onSupply }) => {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal mb-2 flex items-center">
          Assets to Supply
          <Tooltip text="Supply assets to earn interest. Enable 'Use as Collateral' to borrow against your deposits." />
        </h3>
        <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)] mb-3">Deposit assets to earn interest. Enable collateral to unlock borrowing power.</p>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-[12px]">
          <p className="text-[12px] text-blue-800">
            <strong>How it works:</strong> Supply assets → Enable as collateral → Borrow against your deposits. You can disable collateral anytime to earn yield without liquidation risk.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {assets.map(asset => (
          <div key={asset.symbol} className="bg-[var(--color-bg-tertiary)] p-4 rounded-[12px] border border-[var(--color-border-secondary)] hover:border-[var(--color-primary)] transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>{assetIcons[asset.symbol]}</div>
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium">{asset.symbol}</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">{asset.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-[13px] text-[var(--color-text-muted)]">Supply APY</p>
                  <p className="font-medium text-green-600">{asset.supplyAPY}%</p>
                </div>

                <div className="text-right hidden md:block">
                  <p className="text-[13px] text-[var(--color-text-muted)]">LTV</p>
                  <p className="font-medium text-sm text-[var(--color-text-primary)]">{asset.ltv}%</p>
                </div>

                <button
                  onClick={() => onSupply(asset.symbol)}
                  className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-md font-medium hover:bg-[var(--color-primary)]/90 transition-all shadow-xs"
                >
                  Supply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplyTab;
