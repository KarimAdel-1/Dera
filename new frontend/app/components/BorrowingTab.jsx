'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  TrendingUp,
  AlertTriangle,
  Plus,
  DollarSign,
  Shield,
  Award,
  Info,
} from 'lucide-react';
import { lendingBorrowingService } from '../../services/lendingBorrowingService';
import { priceService } from '../../services/priceService';

const BorrowingTab = () => {
  const { wallets, selectedWallet } = useSelector((state) => state.wallet);
  const [activeSubTab, setActiveSubTab] = useState('borrow');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmountUsd, setBorrowAmountUsd] = useState('');
  const [userScore, setUserScore] = useState(null);
  const [loans, setLoans] = useState([]);
  const [hbarPrice, setHbarPrice] = useState(0.05);
  const [loading, setLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [additionalCollateral, setAdditionalCollateral] = useState('');

  useEffect(() => {
    if (selectedWallet) {
      fetchUserScore();
      fetchUserLoans();
      fetchHbarPrice();
    }
  }, [selectedWallet]);

  const fetchUserScore = async () => {
    try {
      const data = await lendingBorrowingService.getUserScore(selectedWallet?.accountId);
      setUserScore(data);
    } catch (error) {
      console.error('Error fetching user score:', error);
      setUserScore({ iscore: 500, totalLoans: 0, totalRepaid: '0', onTimeRepayments: 0, totalLiquidations: 0 });
    }
  };

  const fetchUserLoans = async () => {
    try {
      const data = await lendingBorrowingService.getUserLoans(selectedWallet?.accountId);
      setLoans(data.loans || []);
    } catch (error) {
      console.error('Error fetching user loans:', error);
    }
  };

  const fetchHbarPrice = async () => {
    try {
      const price = await priceService.fetchHbarPrice();
      setHbarPrice(price);
    } catch (error) {
      console.error('Error fetching HBAR price:', error);
    }
  };

  // Credit score calculations
  const getCollateralRatio = (score) => {
    if (score <= 300) return 200;
    if (score <= 600) return 175;
    if (score <= 850) return 150;
    return 130;
  };

  const getInterestRate = (score) => {
    if (score <= 300) return 12;
    if (score <= 600) return 9;
    if (score <= 850) return 7;
    return 5;
  };

  const calculateMaxBorrow = () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) return 0;
    const collateralValueUSD = parseFloat(collateralAmount) * hbarPrice;
    const ratio = getCollateralRatio(userScore?.iscore || 500);
    return (collateralValueUSD * 100) / ratio;
  };

  const calculateHealthFactor = (collateralHbar, borrowedUsd) => {
    const collateralValueUsd = collateralHbar * hbarPrice;
    return (collateralValueUsd * 0.9) / borrowedUsd;
  };

  const getHealthFactorColor = (healthFactor) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 1.5) return 'text-green-500';
    if (hf >= 1.2) return 'text-yellow-500';
    if (hf >= 1.0) return 'text-orange-500';
    return 'text-red-500';
  };

  const handleBorrow = async () => {
    if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
      alert('Please enter valid collateral amount');
      return;
    }

    if (!borrowAmountUsd || parseFloat(borrowAmountUsd) <= 0) {
      alert('Please enter valid borrow amount');
      return;
    }

    const maxBorrow = calculateMaxBorrow();
    if (parseFloat(borrowAmountUsd) > maxBorrow) {
      alert(`Maximum borrow amount is $${maxBorrow.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const result = await lendingBorrowingService.createLoan(
        selectedWallet?.accountId,
        parseFloat(collateralAmount),
        parseFloat(borrowAmountUsd),
        userScore?.iscore || 500
      );

      if (result.success) {
        alert(
          `Successfully borrowed $${borrowAmountUsd}! Your collateral is being staked for rewards.`
        );
        setCollateralAmount('');
        setBorrowAmountUsd('');
        await fetchUserScore();
        await fetchUserLoans();
        setActiveSubTab('loans');
      } else {
        alert(`Failed to borrow: ${result.error}`);
      }
    } catch (error) {
      console.error('Borrow error:', error);
      alert('Failed to borrow. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (loanId) => {
    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      alert('Please enter valid repay amount');
      return;
    }

    setLoading(true);
    try {
      const result = await lendingBorrowingService.repayLoan(
        selectedWallet?.accountId,
        loanId,
        parseFloat(repayAmount)
      );

      if (result.success) {
        alert(result.message);
        await fetchUserScore();
        await fetchUserLoans();
        setRepayAmount('');
        setSelectedLoan(null);
      } else {
        alert(`Failed to repay: ${result.error}`);
      }
    } catch (error) {
      console.error('Repay error:', error);
      alert('Failed to repay. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollateral = async (loanId) => {
    if (!additionalCollateral || parseFloat(additionalCollateral) <= 0) {
      alert('Please enter valid collateral amount');
      return;
    }

    setLoading(true);
    try {
      const result = await lendingBorrowingService.addCollateral(
        selectedWallet?.accountId,
        loanId,
        parseFloat(additionalCollateral)
      );

      if (result.success) {
        alert(result.message);
        await fetchUserLoans();
        setAdditionalCollateral('');
        setSelectedLoan(null);
      } else {
        alert(`Failed to add collateral: ${result.error}`);
      }
    } catch (error) {
      console.error('Add collateral error:', error);
      alert('Failed to add collateral. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const collateralRatio = getCollateralRatio(userScore?.iscore || 500);
  const interestRate = getInterestRate(userScore?.iscore || 500);
  const maxBorrow = calculateMaxBorrow();

  return (
    <div className="h-full p-6 bg-[var(--color-bg-secondary)] rounded-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Borrowing</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Borrow against HBAR collateral with dynamic credit scoring
        </p>
      </div>

      {/* Credit Profile Card */}
      <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 mb-6 text-white">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Award className="w-5 h-5" />
          Your Credit Profile (iScore)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-1">{userScore?.iscore || 500}</div>
            <div className="text-xs opacity-80">Credit Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{collateralRatio}%</div>
            <div className="text-xs opacity-80">Collateral Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{interestRate}%</div>
            <div className="text-xs opacity-80">Interest Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{userScore?.totalLoans || 0}</div>
            <div className="text-xs opacity-80">Total Loans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold mb-1">{userScore?.onTimeRepayments || 0}</div>
            <div className="text-xs opacity-80">On-Time Repayments</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[var(--color-border-primary)]">
        <button
          onClick={() => setActiveSubTab('borrow')}
          className={`px-6 py-3 font-medium transition-all ${
            activeSubTab === 'borrow'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <DollarSign className="w-4 h-4 inline mr-2" />
          New Loan
        </button>
        <button
          onClick={() => setActiveSubTab('loans')}
          className={`px-6 py-3 font-medium transition-all ${
            activeSubTab === 'loans'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Active Loans ({loans.filter((l) => l.status === 'active').length})
        </button>
      </div>

      {/* Borrow Tab */}
      {activeSubTab === 'borrow' && (
        <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
            Borrow Against Collateral
          </h3>

          {/* Collateral Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Collateral (HBAR)
            </label>
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              <Info className="w-3 h-3 inline mr-1" />
              80% of your collateral will be automatically staked to earn rewards
            </p>
          </div>

          {/* Borrow Amount Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Borrow Amount (USD)
            </label>
            <input
              type="number"
              value={borrowAmountUsd}
              onChange={(e) => {
                const value = e.target.value;
                if (parseFloat(value) <= maxBorrow) {
                  setBorrowAmountUsd(value);
                }
              }}
              placeholder="0.00"
              max={maxBorrow}
              className="w-full px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Max borrow: ${maxBorrow.toFixed(2)} USD (at ${hbarPrice.toFixed(4)} per HBAR)
            </p>
          </div>

          {/* Loan Summary */}
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 mb-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Collateral Ratio:</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {collateralRatio}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Interest Rate (APR):</span>
              <span className="font-semibold text-[var(--color-text-primary)]">
                {interestRate}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Estimated Health Factor:</span>
              <span
                className={`font-semibold ${
                  collateralAmount && borrowAmountUsd
                    ? getHealthFactorColor(
                        calculateHealthFactor(
                          parseFloat(collateralAmount),
                          parseFloat(borrowAmountUsd)
                        ).toFixed(2)
                      )
                    : 'text-[var(--color-text-primary)]'
                }`}
              >
                {collateralAmount && borrowAmountUsd
                  ? calculateHealthFactor(
                      parseFloat(collateralAmount),
                      parseFloat(borrowAmountUsd)
                    ).toFixed(2)
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Staking Rewards (40% share):</span>
              <span className="font-semibold text-green-500">~3% APY</span>
            </div>
          </div>

          {/* Borrow Button */}
          <button
            onClick={handleBorrow}
            disabled={
              !collateralAmount ||
              !borrowAmountUsd ||
              loading ||
              parseFloat(borrowAmountUsd) > maxBorrow
            }
            className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Processing...' : 'Borrow'}
          </button>
        </div>
      )}

      {/* Active Loans Tab */}
      {activeSubTab === 'loans' && (
        <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
            Your Active Loans
          </h3>

          {loans.filter((l) => l.status === 'active').length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-text-muted)] mb-4">No active loans yet</p>
              <button
                onClick={() => setActiveSubTab('borrow')}
                className="px-6 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium hover:opacity-90"
              >
                Create Your First Loan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loans
                .filter((l) => l.status === 'active')
                .map((loan) => (
                  <div
                    key={loan.id}
                    className="border border-[var(--color-border-primary)] rounded-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                          Borrowed: ${parseFloat(loan.borrowedAmountUsd).toFixed(2)} USD
                        </div>
                        <div className="text-sm text-[var(--color-text-muted)] space-y-1">
                          <div>Collateral: {loan.collateralAmount} HBAR</div>
                          <div>Interest Rate: {loan.interestRate}% APR</div>
                          <div>Created: {new Date(loan.createdAt).toLocaleDateString()}</div>
                          {loan.proxyAccountId && (
                            <div className="text-xs">Proxy Account: {loan.proxyAccountId}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[var(--color-text-muted)] mb-1">
                          Health Factor
                        </div>
                        <div
                          className={`text-3xl font-bold ${getHealthFactorColor(
                            loan.healthFactor
                          )}`}
                        >
                          {parseFloat(loan.healthFactor).toFixed(2)}
                        </div>
                        {parseFloat(loan.healthFactor) < 1.2 && (
                          <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low health
                          </div>
                        )}
                      </div>
                    </div>

                    {loan.stakingRewards && (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded mb-4">
                        <div className="text-sm font-medium text-green-600 dark:text-green-400">
                          Staking Rewards: {loan.stakingRewards} HBAR
                        </div>
                      </div>
                    )}

                    {selectedLoan === loan.id ? (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                            Repay Amount (USD)
                          </label>
                          <input
                            type="number"
                            value={repayAmount}
                            onChange={(e) => setRepayAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                            Add Collateral (HBAR)
                          </label>
                          <input
                            type="number"
                            value={additionalCollateral}
                            onChange={(e) => setAdditionalCollateral(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRepay(loan.id)}
                            disabled={!repayAmount || parseFloat(repayAmount) <= 0 || loading}
                            className="flex-1 py-2 rounded-lg font-medium text-white bg-blue-600 hover:opacity-90 disabled:opacity-50"
                          >
                            {loading ? 'Processing...' : 'Repay'}
                          </button>
                          <button
                            onClick={() => handleAddCollateral(loan.id)}
                            disabled={
                              !additionalCollateral ||
                              parseFloat(additionalCollateral) <= 0 ||
                              loading
                            }
                            className="flex-1 py-2 rounded-lg font-medium text-white bg-green-600 hover:opacity-90 disabled:opacity-50"
                          >
                            {loading ? 'Processing...' : 'Add Collateral'}
                          </button>
                          <button
                            onClick={() => setSelectedLoan(null)}
                            className="px-4 py-2 rounded-lg font-medium bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedLoan(loan.id)}
                        className="w-full py-2 rounded-lg font-medium text-white bg-[var(--color-primary)] hover:opacity-90"
                      >
                        Manage Loan
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BorrowingTab;
