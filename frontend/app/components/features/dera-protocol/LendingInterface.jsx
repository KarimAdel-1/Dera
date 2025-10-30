'use client';

import { useState, useEffect } from 'react';
import deraProtocolService from '../../../../services/deraProtocolService';
import toast from 'react-hot-toast';

export default function LendingInterface({ userAddress }) {
  const [mode, setMode] = useState('supply'); // 'supply' or 'borrow'
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [userAccountData, setUserAccountData] = useState(null);

  useEffect(() => {
    loadAssets();
    if (userAddress) {
      loadUserData();
    }
  }, [userAddress]);

  const loadAssets = async () => {
    try {
      const assetsList = await deraProtocolService.getAssetsList();
      setAssets(assetsList);
      if (assetsList.length > 0) {
        setSelectedAsset(assetsList[0]);
      }
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load assets');
    }
  };

  const loadUserData = async () => {
    try {
      const accountData = await deraProtocolService.getUserAccountData(
        userAddress
      );
      setUserAccountData(accountData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSupply = async () => {
    if (!selectedAsset || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const amountInUnits = (
        parseFloat(amount) * Math.pow(10, selectedAsset.decimals)
      ).toString();
      const txId = await deraProtocolService.supply(
        selectedAsset.address,
        amountInUnits,
        userAddress,
        0
      );

      toast.success(`Supply successful! TX: ${txId.substring(0, 20)}...`);
      setAmount('');
      loadUserData();
    } catch (error) {
      console.error('Supply error:', error);
      toast.error('Supply failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!selectedAsset || !amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const amountInUnits = (
        parseFloat(amount) * Math.pow(10, selectedAsset.decimals)
      ).toString();
      const txId = await deraProtocolService.borrow(
        selectedAsset.address,
        amountInUnits,
        0,
        userAddress
      );

      toast.success(`Borrow successful! TX: ${txId.substring(0, 20)}...`);
      setAmount('');
      loadUserData();
    } catch (error) {
      console.error('Borrow error:', error);
      toast.error('Borrow failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'supply') {
      handleSupply();
    } else {
      handleBorrow();
    }
  };

  const formatUSD = (value) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Interface */}
      <div className="lg:col-span-2 space-y-6">
        {/* Mode Toggle */}
        <div className="flex gap-4 p-1 bg-[var(--color-bg-tertiary)] rounded-[12px] w-fit">
          <button
            onClick={() => setMode('supply')}
            className={`px-6 py-2 rounded-[8px] font-medium transition-colors ${
              mode === 'supply'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Supply
          </button>
          <button
            onClick={() => setMode('borrow')}
            className={`px-6 py-2 rounded-[8px] font-medium transition-colors ${
              mode === 'borrow'
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            Borrow
          </button>
        </div>

        {/* Supply/Borrow Form */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-[20px] p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label className="block text-[11px] sm:text-[12px] font-medium text-[var(--color-text-muted)] mb-2">
                Select Asset
              </label>
              <select
                value={selectedAsset?.address || ''}
                onChange={(e) => {
                  const asset = assets.find(
                    (a) => a.address === e.target.value
                  );
                  setSelectedAsset(asset);
                }}
                className="w-full px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {assets.map((asset) => (
                  <option key={asset.address} value={asset.address}>
                    {asset.symbol} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-[11px] sm:text-[12px] font-medium text-[var(--color-text-muted)]">
                  Amount
                </label>
                {selectedAsset && (
                  <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                    Balance: {selectedAsset.symbol} 1,000.00
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {selectedAsset && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-[var(--color-text-muted)] font-medium text-[13px] sm:text-[14px]">
                      {selectedAsset.symbol}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAmount('1000')}
                className="mt-2 text-[11px] sm:text-[12px] text-[var(--color-primary)] hover:underline"
              >
                Max
              </button>
            </div>

            {/* Transaction Summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-secondary)] rounded-[12px] p-4 space-y-2">
                <div className="flex justify-between text-[13px] sm:text-[14px]">
                  <span className="text-[var(--color-text-muted)]">
                    Transaction Type
                  </span>
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {mode === 'supply' ? 'Supply' : 'Borrow'}
                  </span>
                </div>
                <div className="flex justify-between text-[13px] sm:text-[14px]">
                  <span className="text-[var(--color-text-muted)]">Amount</span>
                  <span className="text-[var(--color-text-primary)] font-medium">
                    {amount} {selectedAsset?.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-[13px] sm:text-[14px]">
                  <span className="text-[var(--color-text-muted)]">
                    Estimated Gas
                  </span>
                  <span className="text-[var(--color-text-primary)] font-medium">
                    ~0.05 HBAR
                  </span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-[var(--color-primary)] text-white font-medium rounded-[12px] hover:bg-[var(--color-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : mode === 'supply' ? (
                'Supply'
              ) : (
                'Borrow'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* User Stats Sidebar */}
      <div className="space-y-4">
        {/* Account Health */}
        {userAccountData && (
          <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-[20px] p-4 sm:p-6">
            <h3 className="text-[16px] sm:text-[18px] font-normal text-[var(--color-text-primary)] mb-4">
              Account Health
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                    Health Factor
                  </span>
                  <span
                    className={`text-[13px] sm:text-[14px] font-semibold ${
                      userAccountData.healthFactor >= 2
                        ? 'text-[var(--color-success)]'
                        : userAccountData.healthFactor >= 1.2
                        ? 'text-[var(--color-warning)]'
                        : 'text-[var(--color-error)]'
                    }`}
                  >
                    {userAccountData.healthFactor.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      userAccountData.healthFactor >= 2
                        ? 'bg-[var(--color-success)]'
                        : userAccountData.healthFactor >= 1.2
                        ? 'bg-[var(--color-warning)]'
                        : 'bg-[var(--color-error)]'
                    }`}
                    style={{
                      width: `${Math.min(
                        (userAccountData.healthFactor / 3) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--color-border-secondary)] space-y-3">
                <div className="flex justify-between">
                  <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                    Total Supplied
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[var(--color-success)]">
                    {formatUSD(userAccountData.totalSuppliedUSD)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                    Total Borrowed
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[var(--color-text-primary)]">
                    {formatUSD(userAccountData.totalBorrowedUSD)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] sm:text-[12px] text-[var(--color-text-muted)]">
                    Available to Borrow
                  </span>
                  <span className="text-[13px] sm:text-[14px] font-medium text-[var(--color-primary)]">
                    {formatUSD(userAccountData.availableToBorrowUSD)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-[20px] p-4 sm:p-6">
          <h3 className="text-[16px] sm:text-[18px] font-normal text-[var(--color-text-primary)] mb-2">
            💡 {mode === 'supply' ? 'Why Supply?' : 'Why Borrow?'}
          </h3>
          <p className="text-[13px] sm:text-[14px] text-[var(--color-text-muted)]">
            {mode === 'supply'
              ? 'Earn dual yield from lending APY and Hedera node staking rewards. Your funds are secured by overcollateralized loans.'
              : 'Borrow assets using your supplied collateral. Maintain a healthy collateralization ratio to avoid liquidation.'}
          </p>
        </div>
      </div>
    </div>
  );
}
