'use client';
import { Info, DollarSign, Coins } from 'lucide-react';
import Tooltip from './Tooltip';

const assetIcons = {
  'USDC': <DollarSign className="w-8 h-8 text-green-600" />,
  'HBAR': <span className="text-3xl">ℏ</span>,
  'USDT': <DollarSign className="w-8 h-8 text-green-600" />,
  'WBTC': <Coins className="w-8 h-8 text-orange-500" />,
  'ETH': <Coins className="w-8 h-8 text-blue-600" />,
};

const BorrowTab = ({ assets, availableToBorrow, onBorrow }) => {
  return (
    <div>
      <div className="mb-6">
        <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal mb-2 flex items-center">
          Assets to Borrow
          <Tooltip text="Borrow assets against your collateral. Monitor your health factor to avoid liquidation." />
        </h3>
        <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">Borrow assets against your collateral</p>
      </div>

      {availableToBorrow > 0 ? (
        <div className="bg-[var(--color-primary)]/10 border-l-4 border-[var(--color-primary)] p-4 rounded-[12px] mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-[var(--color-primary)] mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">Borrowing Power</p>
              <p className="text-[13px] sm:text-[14px] text-[var(--color-text-secondary)] mt-1">
                You can borrow up to <strong>${availableToBorrow.toFixed(2)}</strong>. Don't borrow the maximum to maintain a safe health factor.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-[12px] mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">No Collateral Available</p>
              <p className="text-[13px] sm:text-[14px] text-yellow-700 mt-1">
                You must supply assets and enable them as collateral before you can borrow. Go to the Supply tab to deposit assets first.
              </p>
            </div>
          </div>
        </div>
      )}

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
                  <p className="text-[13px] text-[var(--color-text-muted)]">Borrow APY</p>
                  <p className="font-medium text-blue-600">{asset.borrowAPY}%</p>
                </div>

                <div className="text-right hidden md:block">
                  <p className="text-[13px] text-[var(--color-text-muted)]">Liq. Threshold</p>
                  <p className="font-medium text-sm text-[var(--color-text-primary)]">{asset.liquidationThreshold}%</p>
                </div>

                <button
                  onClick={() => onBorrow(asset.symbol)}
                  className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-md font-medium hover:bg-[var(--color-primary)]/90 transition-all shadow-xs"
                >
                  Borrow
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BorrowTab;
