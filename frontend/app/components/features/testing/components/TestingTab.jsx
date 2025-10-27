'use client';
import { Wallet, CreditCard, Inbox, CheckCircle, XCircle, DollarSign, Coins } from 'lucide-react';

const assetIcons = {
  'USDC': <DollarSign className="w-8 h-8 text-green-600" />,
  'HBAR': <span className="text-3xl">ℏ</span>,
  'USDT': <DollarSign className="w-8 h-8 text-green-600" />,
  'WBTC': <Coins className="w-8 h-8 text-orange-500" />,
  'ETH': <Coins className="w-8 h-8 text-blue-600" />,
};

const TestingTab = ({ supplies, borrows, assets, onWithdraw, onRepay, onSupplyMore, onToggleCollateral }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-4 flex items-center">
          <Wallet className="w-5 h-5 text-green-600 mr-2" />
          Your Supplies
        </h3>
        <div className="space-y-4">
          {supplies.length === 0 ? (
            <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-12 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">No supplies yet</p>
            </div>
          ) : (
            supplies.map(supply => {
              const asset = assets.find(a => a.symbol === supply.asset);
              return (
                <div key={supply.asset} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div>{assetIcons[supply.asset]}</div>
                      <div>
                        <p className="text-[var(--color-text-primary)] font-medium">{supply.asset}</p>
                        <p className="text-[13px] text-[var(--color-text-muted)]">{supply.amount.toLocaleString()} {supply.asset}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">${(supply.amount * asset.price).toFixed(2)}</p>
                      <p className="text-[13px] text-green-600">{supply.apy}% APY</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[13px] mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onWithdraw(supply.asset)}
                        className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/90 font-medium transition-all"
                      >
                        Withdraw
                      </button>
                      <span className="text-[var(--color-text-muted)]">•</span>
                      <button
                        onClick={() => onSupplyMore(supply.asset)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium transition-all"
                      >
                        Supply More
                      </button>
                      <span className="text-[var(--color-text-muted)]">•</span>
                      <button
                        onClick={() => onToggleCollateral(supply.asset)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] font-medium transition-all"
                      >
                        {supply.collateralEnabled ? 'Disable Collateral' : 'Enable Collateral'}
                      </button>
                    </div>
                    <span className="text-[var(--color-text-muted)] flex items-center gap-1 text-[12px]">
                      {supply.collateralEnabled ? (
                        <><CheckCircle className="w-3 h-3 text-green-600" /> Collateral</>
                      ) : (
                        <><XCircle className="w-3 h-3 text-gray-400" /> Not Collateral</>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[var(--color-text-primary)] text-[18px] sm:text-[20px] font-normal mb-4 flex items-center">
          <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
          Your Borrows
        </h3>
        <div className="space-y-4">
          {borrows.length === 0 ? (
            <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-12 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
              <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">No borrows yet</p>
            </div>
          ) : (
            borrows.map(borrow => {
              const asset = assets.find(a => a.symbol === borrow.asset);
              return (
                <div key={borrow.asset} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div>{assetIcons[borrow.asset]}</div>
                      <div>
                        <p className="text-[var(--color-text-primary)] font-medium">{borrow.asset}</p>
                        <p className="text-[13px] text-[var(--color-text-muted)]">{borrow.amount.toLocaleString()} {borrow.asset}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">${(borrow.amount * asset.price).toFixed(2)}</p>
                      <p className="text-[13px] text-blue-600">{borrow.apy}% APY</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[13px] mt-3 pt-3 border-t border-[var(--color-border-secondary)]">
                    <button
                      onClick={() => onRepay(borrow.asset)}
                      className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/90 font-medium transition-all"
                    >
                      Repay
                    </button>
                    <span className="text-[var(--color-text-muted)] text-[12px]">
                      Variable APY
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TestingTab;
