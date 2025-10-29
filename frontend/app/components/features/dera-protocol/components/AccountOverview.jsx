'use client';
import { AlertTriangle } from 'lucide-react';
import Tooltip from './Tooltip';

const AccountOverview = ({ userAccount, onConnect }) => {
  const getHealthFactorColor = (hf) => {
    if (hf === Infinity) return 'text-[var(--color-success)]';
    if (hf >= 1.5) return 'text-[var(--color-success)]';
    if (hf >= 1.0) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
  };

  const getHealthFactorStatus = (hf) => {
    if (hf === Infinity)
      return {
        icon: 'check-circle',
        text: 'Safe',
        color: 'text-[var(--color-success)]',
      };
    if (hf >= 1.5)
      return {
        icon: 'check-circle',
        text: 'Safe',
        color: 'text-[var(--color-success)]',
      };
    if (hf >= 1.0)
      return {
        icon: 'exclamation-triangle',
        text: 'Risky',
        color: 'text-[var(--color-warning)]',
      };
    return {
      icon: 'times-circle',
      text: 'Liquidation',
      color: 'text-[var(--color-error)]',
    };
  };

  const status = getHealthFactorStatus(userAccount.healthFactor);
  const avgSupplyAPY =
    userAccount.supplies.length > 0
      ? (
          userAccount.supplies.reduce((sum, s) => sum + s.apy, 0) /
          userAccount.supplies.length
        ).toFixed(2)
      : '0.00';
  const avgBorrowAPY =
    userAccount.borrows.length > 0
      ? (
          userAccount.borrows.reduce((sum, b) => sum + b.apy, 0) /
          userAccount.borrows.length
        ).toFixed(2)
      : '0.00';

  return (
    <>
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[var(--color-text-primary)] text-[16px] sm:text-[18px] font-normal flex items-center">
            Account Overview
            <Tooltip text="Monitor your deposits, borrows, and health factor. Keep health factor above 1.5 for safety." />
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">
                  Total Supplied
                </p>
                <p className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-success)]">
                  ${userAccount.totalSupplied.toFixed(2)}
                </p>
              </div>
              <Tooltip text="Total value of all your deposits. This earns interest and can be used as collateral." />
            </div>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-success)] mt-2">
              Earning {avgSupplyAPY}% APY
            </p>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">
                  Total Borrowed
                </p>
                <p className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-primary)]">
                  ${userAccount.totalBorrowed.toFixed(2)}
                </p>
              </div>
              <Tooltip text="Total value of all your borrows. You pay interest on this amount." />
            </div>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-primary)] mt-2">
              Paying {avgBorrowAPY}% APY
            </p>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">
                  Available to Borrow
                </p>
                <p className="text-[20px] sm:text-[24px] font-semibold text-[var(--color-text-primary)]">
                  ${userAccount.availableToBorrow.toFixed(2)}
                </p>
              </div>
              <Tooltip text="Maximum you can borrow based on your collateral. Don't borrow the max!" />
            </div>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mt-2">
              Based on collateral
            </p>
          </div>

          <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] p-4 rounded-[12px]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)] mb-1">
                  Health Factor
                </p>
                <p
                  className={`text-[20px] sm:text-[24px] font-semibold ${getHealthFactorColor(userAccount.healthFactor)}`}
                >
                  {userAccount.healthFactor === Infinity
                    ? '∞'
                    : userAccount.healthFactor.toFixed(2)}
                </p>
              </div>
              <Tooltip text="Above 2.0: Very Safe ✅ | 1.5-2.0: Safe ✅ | 1.0-1.5: Risky ⚠️ | Below 1.0: Liquidation ❌" />
            </div>
            <p className={`text-[11px] sm:text-[12px] mt-2 ${status.color}`}>
              {status.text}
            </p>
          </div>
        </div>

        {userAccount.healthFactor < 1.5 &&
          userAccount.healthFactor !== Infinity && (
            <div className="mt-4 bg-[var(--color-error)]/10 border-l-4 border-[var(--color-error)] p-4 rounded-[12px]">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[var(--color-error)]">
                    Liquidation Risk!
                  </p>
                  <p className="text-[13px] sm:text-[14px] text-[var(--color-error)] mt-1">
                    Your health factor is dangerously low. Repay debt or add
                    collateral immediately.
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    </>
  );
};

export default AccountOverview;
