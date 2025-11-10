'use client';
import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Tooltip from './Tooltip';
import {
  sanitizeNumericInput,
  validateSupplyAmount,
  validateBorrowAmount,
  validateWithdrawAmount,
  validateRepayAmount,
  calculateMaxBorrow,
  calculateMaxSupply,
  formatNumberSafe
} from '../../../../../utils/validationHelpers';

const ActionModal = ({ type, asset, assets, userAccount, onClose, onExecute, walletBalances = {} }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const assetData = assets.find(a => a.symbol === asset);

  if (!assetData) {
    return null;
  }

  const getBalance = () => {
    if (type === 'supply') {
      // Use actual wallet balance from wallet
      const walletBalance = walletBalances[asset] || 0;
      return formatNumberSafe(walletBalance, 8);
    }
    if (type === 'borrow') {
      // FIXED: Use availableToBorrowUSD instead of availableToBorrow
      const maxBorrowInUSD = userAccount.availableToBorrowUSD || userAccount.availableToBorrow || 0;
      const maxBorrowInAsset = calculateMaxBorrow(maxBorrowInUSD, parseFloat(assetData.price));
      return formatNumberSafe(maxBorrowInAsset, 2);
    }
    if (type === 'withdraw') {
      const supply = userAccount.supplies.find(s => s.asset === asset);
      return formatNumberSafe(supply?.amount || 0, 8);
    }
    if (type === 'repay') {
      const borrow = userAccount.borrows.find(b => b.asset === asset);
      return formatNumberSafe(borrow?.amount || 0, 8);
    }
    return '0';
  };

  const getMaxAmount = () => {
    if (type === 'supply') {
      const walletBalance = walletBalances[asset] || 0;
      return calculateMaxSupply(walletBalance, asset);
    }
    if (type === 'borrow') {
      const maxBorrowInUSD = userAccount.availableToBorrowUSD || userAccount.availableToBorrow || 0;
      return calculateMaxBorrow(maxBorrowInUSD, parseFloat(assetData.price));
    }
    if (type === 'withdraw') {
      const supply = userAccount.supplies.find(s => s.asset === asset);
      return supply?.amount || 0;
    }
    if (type === 'repay') {
      const borrow = userAccount.borrows.find(b => b.asset === asset);
      return borrow?.amount || 0;
    }
    return 0;
  };

  const validateAmount = (value) => {
    // Skip validation for empty input
    if (!value || value.trim() === '') {
      setValidationError('');
      return false;
    }

    let validation;

    switch (type) {
      case 'supply':
        const walletBalance = walletBalances[asset] || 0;
        validation = validateSupplyAmount(value, walletBalance, asset);
        break;

      case 'borrow':
        const availableToBorrowUSD = userAccount.availableToBorrowUSD || userAccount.availableToBorrow || 0;
        validation = validateBorrowAmount(
          value,
          availableToBorrowUSD,
          parseFloat(assetData.price),
          asset
        );
        break;

      case 'withdraw':
        const supply = userAccount.supplies.find(s => s.asset === asset);
        const suppliedBalance = supply?.amount || 0;
        const hasActiveBorrows = userAccount.borrows && userAccount.borrows.length > 0;
        validation = validateWithdrawAmount(value, suppliedBalance, asset, hasActiveBorrows);
        break;

      case 'repay':
        const borrow = userAccount.borrows.find(b => b.asset === asset);
        const borrowedBalance = borrow?.amount || 0;
        const repayWalletBalance = walletBalances[asset] || 0;
        validation = validateRepayAmount(value, borrowedBalance, repayWalletBalance, asset);
        break;

      default:
        validation = { isValid: false, error: 'Unknown operation type' };
    }

    setValidationError(validation.error);
    return validation.isValid;
  };

  const handleExecute = async () => {
    // Validate amount before executing
    if (!validateAmount(amount)) {
      return;
    }

    const amountNum = parseFloat(amount);
    setLoading(true);

    try {
      // Call the actual transaction function
      await onExecute(type, asset, amountNum);
      // onExecute should handle success/error notifications and modal closing
    } catch (error) {
      console.error('Transaction error:', error);
      setValidationError(error.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // Validate on amount change
  const handleAmountChange = (e) => {
    let value = e.target.value;

    // Sanitize input - remove invalid characters
    value = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    setAmount(value);

    if (value) {
      validateAmount(value);
    } else {
      setValidationError('');
    }
  };

  const handleMaxClick = () => {
    const maxAmount = getMaxAmount();
    const maxStr = formatNumberSafe(maxAmount, 8);
    setAmount(maxStr);
    validateAmount(maxStr);
  };

  const getTitle = () => {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} ${asset}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-[var(--color-primary)] text-white p-4 flex justify-between items-center">
          <h3 className="text-xl font-medium">{getTitle()}</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[13px] sm:text-[14px] font-medium text-[var(--color-text-primary)]">Amount</label>
              <span className="text-[13px] text-[var(--color-text-muted)]">
                {type === 'borrow' ? 'Max Borrow' : 'Balance'}: {getBalance()}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                className={`w-full px-4 py-3 border-2 ${validationError ? 'border-red-500' : 'border-[var(--color-border-primary)]'} bg-[var(--color-bg-tertiary)] rounded-[12px] focus:border-[var(--color-primary)] focus:outline-none transition-all text-[var(--color-text-primary)]`}
                placeholder="0.00"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handleMaxClick}
                className="absolute right-3 top-3 text-[13px] font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/90 bg-[var(--color-primary)]/10 px-3 py-1 rounded-[8px] transition-all"
              >
                MAX
              </button>
            </div>
            {validationError && (
              <div className="flex items-center mt-2 text-red-500 text-[12px]">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {validationError}
              </div>
            )}
          </div>

          <div className="bg-[var(--color-bg-tertiary)] rounded-[12px] p-4 mb-4 space-y-3 text-[13px] sm:text-[14px]">
            <div className="flex justify-between items-center">
              <span className="text-[var(--color-text-muted)]">APY</span>
              <span className={`font-medium text-lg ${type === 'supply' || type === 'withdraw' ? 'text-green-600' : 'text-blue-600'}`}>
                {type === 'supply' || type === 'withdraw' ? assetData.supplyAPY : assetData.borrowAPY}%
              </span>
            </div>

            {type === 'borrow' && (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-[var(--color-text-muted)]">Collateral Required</span>
                    <Tooltip text="Amount of collateral needed to borrow this amount based on LTV ratio." />
                  </div>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    ${amount ? ((parseFloat(amount) * assetData.price) / (assetData.ltv / 100)).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Max LTV</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{assetData.ltv}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--color-text-muted)]">Liquidation Threshold</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{assetData.liquidationThreshold}%</span>
                </div>
              </>
            )}

            {type === 'supply' && (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className="text-[var(--color-text-muted)]">Use as Collateral</span>
                  <Tooltip text="Enable to use this deposit as collateral for borrowing." />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-[var(--color-border-primary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-border-primary)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                </label>
              </div>
            )}
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-[12px] mb-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" />
                <p className="text-[13px] text-yellow-800">
                  Transaction will be executed on Hedera testnet. Make sure you have enough HBAR for gas fees.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={loading || !amount || parseFloat(amount) <= 0}
            className="w-full bg-[var(--color-primary)] text-white py-3 rounded-[12px] font-medium hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-xs"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <span>{getTitle()}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
