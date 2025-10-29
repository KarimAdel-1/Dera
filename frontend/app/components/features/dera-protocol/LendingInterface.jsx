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
      const accountData = await deraProtocolService.getUserAccountData(userAddress);
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
      const amountInUnits = (parseFloat(amount) * Math.pow(10, selectedAsset.decimals)).toString();
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
      const amountInUnits = (parseFloat(amount) * Math.pow(10, selectedAsset.decimals)).toString();
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
        <div className="flex gap-4 p-1 bg-bg-secondary rounded-lg w-fit">
          <button
            onClick={() => setMode('supply')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              mode === 'supply'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Supply
          </button>
          <button
            onClick={() => setMode('borrow')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              mode === 'borrow'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Borrow
          </button>
        </div>

        {/* Supply/Borrow Form */}
        <div className="bg-bg-secondary border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Select Asset
              </label>
              <select
                value={selectedAsset?.address || ''}
                onChange={(e) => {
                  const asset = assets.find((a) => a.address === e.target.value);
                  setSelectedAsset(asset);
                }}
                className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
                <label className="block text-sm font-medium text-text-secondary">
                  Amount
                </label>
                {selectedAsset && (
                  <span className="text-sm text-text-secondary">
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
                  className="w-full px-4 py-3 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {selectedAsset && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-text-secondary font-medium">
                      {selectedAsset.symbol}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAmount('1000')}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Max
              </button>
            </div>

            {/* Transaction Summary */}
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-bg-primary border border-border rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Transaction Type</span>
                  <span className="text-text-primary font-medium">
                    {mode === 'supply' ? 'Supply' : 'Borrow'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Amount</span>
                  <span className="text-text-primary font-medium">
                    {amount} {selectedAsset?.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Estimated Gas</span>
                  <span className="text-text-primary font-medium">~0.05 HBAR</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          <div className="bg-bg-secondary border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Account Health
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-text-secondary">Health Factor</span>
                  <span
                    className={`text-sm font-semibold ${
                      userAccountData.healthFactor >= 2
                        ? 'text-green-500'
                        : userAccountData.healthFactor >= 1.2
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }`}
                  >
                    {userAccountData.healthFactor.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-bg-primary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      userAccountData.healthFactor >= 2
                        ? 'bg-green-500'
                        : userAccountData.healthFactor >= 1.2
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
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

              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Total Supplied</span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatUSD(userAccountData.totalSuppliedUSD)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Total Borrowed</span>
                  <span className="text-sm font-medium text-text-primary">
                    {formatUSD(userAccountData.totalBorrowedUSD)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-secondary">Available to Borrow</span>
                  <span className="text-sm font-medium text-primary">
                    {formatUSD(userAccountData.availableToBorrowUSD)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            💡 {mode === 'supply' ? 'Why Supply?' : 'Why Borrow?'}
          </h3>
          <p className="text-sm text-text-secondary">
            {mode === 'supply'
              ? 'Earn dual yield from lending APY and Hedera node staking rewards. Your funds are secured by overcollateralized loans.'
              : 'Borrow assets using your supplied collateral. Maintain a healthy collateralization ratio to avoid liquidation.'}
          </p>
        </div>
      </div>
    </div>
  );
}
