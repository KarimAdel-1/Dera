import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

interface UserScore {
  iscore: number;
  totalLoans: number;
  totalRepaid: string;
  onTimeRepayments: number;
  totalLiquidations: number;
  accountAge: number;
}

interface Loan {
  id: string;
  collateralAmount: string;
  borrowedAmountUsd: string;
  borrowedAmountHbar: string;
  interestRate: string;
  healthFactor: string;
  status: 'active' | 'repaid' | 'liquidated';
  proxyAccountId?: string;
  createdAt: Date;
  stakingRewards?: string;
}

export default function BorrowingInterface() {
  const { activeWallet, isConnecting } = useWallet();
  const { addNotification } = useNotifications();
  const [collateral, setCollateral] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [iScore, setIScore] = useState(500);
  const [userScore, setUserScore] = useState<UserScore | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isRepaying, setIsRepaying] = useState(false);
  const [isAddingCollateral, setIsAddingCollateral] = useState(false);
  const [activeTab, setActiveTab] = useState<'borrow' | 'loans'>('borrow');
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [additionalCollateral, setAdditionalCollateral] = useState('');
  const [hbarPrice, setHbarPrice] = useState(0.05); // Default price

  // Calculate based on iScore
  const getCollateralRatio = (score: number) => {
    if (score <= 300) return 200;
    if (score <= 600) return 175;
    if (score <= 850) return 150;
    return 130;
  };

  const getInterestRate = (score: number) => {
    if (score <= 300) return 12;
    if (score <= 600) return 9;
    if (score <= 850) return 7;
    return 5;
  };

  const collateralRatio = getCollateralRatio(iScore);
  const interestRate = getInterestRate(iScore);

  // Fetch user score and loans on mount and when wallet changes
  useEffect(() => {
    if (activeWallet) {
      fetchUserScore();
      fetchUserLoans();
      fetchHbarPrice();
    }
  }, [activeWallet]);

  const fetchUserScore = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/score/${activeWallet?.accountId}`
      );
      if (!response.ok) throw new Error('Failed to fetch user score');
      const data = await response.json();
      setUserScore(data);
      setIScore(data.iscore);
    } catch (error) {
      console.error('Error fetching user score:', error);
      // Use default score if API fails
      setIScore(500);
    }
  };

  const fetchUserLoans = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/loans/${activeWallet?.accountId}`
      );
      if (!response.ok) throw new Error('Failed to fetch user loans');
      const data = await response.json();
      setLoans(data.loans);
    } catch (error) {
      console.error('Error fetching user loans:', error);
      setLoans([]);
    }
  };

  const fetchHbarPrice = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/price/hbar`);
      if (!response.ok) throw new Error('Failed to fetch HBAR price');
      const data = await response.json();
      setHbarPrice(data.price);
    } catch (error) {
      console.error('Error fetching HBAR price:', error);
      setHbarPrice(0.05); // Default fallback
    }
  };

  const calculateMaxBorrow = () => {
    if (!collateral || parseFloat(collateral) <= 0) return 0;
    const collateralValueUSD = parseFloat(collateral) * hbarPrice;
    return (collateralValueUSD * 100) / collateralRatio;
  };

  const calculateHealthFactor = (collateralHbar: number, borrowedUsd: number) => {
    const collateralValueUsd = collateralHbar * hbarPrice;
    const healthFactor = (collateralValueUsd * 0.9) / borrowedUsd;
    return healthFactor;
  };

  const maxBorrow = calculateMaxBorrow();

  const handleBorrow = async () => {
    if (!activeWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!collateral || parseFloat(collateral) <= 0) {
      toast.error('Please enter valid collateral amount');
      return;
    }

    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      toast.error('Please enter valid borrow amount');
      return;
    }

    if (parseFloat(borrowAmount) > maxBorrow) {
      toast.error(`Maximum borrow amount is $${maxBorrow.toFixed(2)}`);
      return;
    }

    setIsBorrowing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/borrowing/borrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.accountId,
          collateralAmount: collateral,
          borrowAmountUsd: borrowAmount,
          iscore: iScore,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Borrow failed');
      }

      const result = await response.json();

      toast.success(
        `Successfully borrowed $${borrowAmount}! Your collateral is being staked for rewards.`
      );
      addNotification({
        type: 'success',
        title: 'Loan Created',
        message: `Borrowed $${borrowAmount} with ${collateral} HBAR collateral. Health Factor: ${result.healthFactor.toFixed(2)}`,
      });

      // Refresh data
      await fetchUserScore();
      await fetchUserLoans();
      setCollateral('');
      setBorrowAmount('');
      setActiveTab('loans');
    } catch (error: any) {
      console.error('Borrow error:', error);
      toast.error(error.message || 'Failed to borrow. Please try again.');
      addNotification({
        type: 'error',
        title: 'Borrow Failed',
        message: error.message || 'Failed to process borrow request',
      });
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleRepay = async (loanId: string) => {
    if (!activeWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!repayAmount || parseFloat(repayAmount) <= 0) {
      toast.error('Please enter valid repay amount');
      return;
    }

    setIsRepaying(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/borrowing/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: activeWallet.accountId,
          loanId,
          repayAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Repayment failed');
      }

      const result = await response.json();

      toast.success(`Successfully repaid $${repayAmount}!`);
      addNotification({
        type: 'success',
        title: 'Repayment Successful',
        message: `Repaid $${repayAmount}. ${
          result.fullyRepaid ? 'Loan fully repaid! Collateral returned.' : 'Remaining debt updated.'
        }`,
      });

      // Refresh data
      await fetchUserScore();
      await fetchUserLoans();
      setRepayAmount('');
      setSelectedLoan(null);
    } catch (error: any) {
      console.error('Repay error:', error);
      toast.error(error.message || 'Failed to repay. Please try again.');
      addNotification({
        type: 'error',
        title: 'Repayment Failed',
        message: error.message || 'Failed to process repayment',
      });
    } finally {
      setIsRepaying(false);
    }
  };

  const handleAddCollateral = async (loanId: string) => {
    if (!activeWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!additionalCollateral || parseFloat(additionalCollateral) <= 0) {
      toast.error('Please enter valid collateral amount');
      return;
    }

    setIsAddingCollateral(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/borrowing/add-collateral`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: activeWallet.accountId,
            loanId,
            collateralAmount: additionalCollateral,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Add collateral failed');
      }

      const result = await response.json();

      toast.success(`Successfully added ${additionalCollateral} HBAR as collateral!`);
      addNotification({
        type: 'success',
        title: 'Collateral Added',
        message: `Added ${additionalCollateral} HBAR. New Health Factor: ${result.healthFactor.toFixed(
          2
        )}`,
      });

      // Refresh data
      await fetchUserLoans();
      setAdditionalCollateral('');
      setSelectedLoan(null);
    } catch (error: any) {
      console.error('Add collateral error:', error);
      toast.error(error.message || 'Failed to add collateral. Please try again.');
      addNotification({
        type: 'error',
        title: 'Add Collateral Failed',
        message: error.message || 'Failed to add collateral',
      });
    } finally {
      setIsAddingCollateral(false);
    }
  };

  const getHealthFactorColor = (healthFactor: string) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 1.5) return 'text-green-600';
    if (hf >= 1.2) return 'text-yellow-600';
    if (hf >= 1.0) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!activeWallet) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600 mb-8">
          Please connect your wallet to start borrowing with collateral.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Credit Score Card */}
      <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
        <h3 className="text-xl font-semibold mb-6">Your Credit Profile (iScore)</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600 mb-2">{iScore}</div>
            <div className="text-sm text-gray-600">Credit Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">{collateralRatio}%</div>
            <div className="text-sm text-gray-600">Collateral Ratio</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">{interestRate}%</div>
            <div className="text-sm text-gray-600">Interest Rate (APR)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {userScore?.totalLoans || 0}
            </div>
            <div className="text-sm text-gray-600">Total Loans</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {userScore?.onTimeRepayments || 0}
            </div>
            <div className="text-sm text-gray-600">On-Time Repayments</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('borrow')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'borrow'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            New Loan
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'loans'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Loans ({loans.filter((l) => l.status === 'active').length})
          </button>
        </div>
      </div>

      {/* Borrow Tab */}
      {activeTab === 'borrow' && (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-6">Borrow Against Collateral</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collateral (HBAR)
            </label>
            <input
              type="number"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              80% of your collateral will be automatically staked to earn rewards
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Borrow Amount (USD)
            </label>
            <input
              type="number"
              value={borrowAmount}
              onChange={(e) => {
                const value = e.target.value;
                if (parseFloat(value) <= maxBorrow) {
                  setBorrowAmount(value);
                }
              }}
              placeholder="0.00"
              max={maxBorrow}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Max borrow: ${maxBorrow.toFixed(2)} USD (at ${hbarPrice.toFixed(4)} per HBAR)
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Collateral Ratio:</span>
              <span className="font-semibold">{collateralRatio}%</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Interest Rate (APR):</span>
              <span className="font-semibold">{interestRate}%</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Estimated Health Factor:</span>
              <span
                className={`font-semibold ${
                  collateral && borrowAmount
                    ? getHealthFactorColor(
                        calculateHealthFactor(
                          parseFloat(collateral),
                          parseFloat(borrowAmount)
                        ).toFixed(2)
                      )
                    : 'text-gray-600'
                }`}
              >
                {collateral && borrowAmount
                  ? calculateHealthFactor(parseFloat(collateral), parseFloat(borrowAmount)).toFixed(
                      2
                    )
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Staking Rewards (40% share):</span>
              <span className="font-semibold text-green-600">~3% APY</span>
            </div>
          </div>

          <button
            onClick={handleBorrow}
            disabled={!collateral || !borrowAmount || isBorrowing || parseFloat(borrowAmount) > maxBorrow}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium"
          >
            {isBorrowing ? 'Processing...' : 'Borrow'}
          </button>
        </div>
      )}

      {/* Active Loans Tab */}
      {activeTab === 'loans' && (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold mb-6">Your Active Loans</h3>

          {loans.filter((l) => l.status === 'active').length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No active loans yet.</p>
              <button
                onClick={() => setActiveTab('borrow')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first loan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {loans
                .filter((l) => l.status === 'active')
                .map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-lg font-semibold mb-2">
                          Borrowed: ${parseFloat(loan.borrowedAmountUsd).toFixed(2)} USD
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Collateral: {loan.collateralAmount} HBAR</div>
                          <div>Interest Rate: {loan.interestRate}% APR</div>
                          <div>
                            Created: {new Date(loan.createdAt).toLocaleDateString()}
                          </div>
                          {loan.proxyAccountId && (
                            <div className="text-xs">
                              Proxy Account: {loan.proxyAccountId}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">Health Factor</div>
                        <div
                          className={`text-3xl font-bold ${getHealthFactorColor(
                            loan.healthFactor
                          )}`}
                        >
                          {parseFloat(loan.healthFactor).toFixed(2)}
                        </div>
                        {parseFloat(loan.healthFactor) < 1.2 && (
                          <div className="text-xs text-red-600 mt-1">⚠️ Low health</div>
                        )}
                      </div>
                    </div>

                    {loan.stakingRewards && (
                      <div className="bg-green-50 p-3 rounded mb-4">
                        <div className="text-sm font-medium text-green-800">
                          Staking Rewards: {loan.stakingRewards} HBAR
                        </div>
                      </div>
                    )}

                    {selectedLoan === loan.id ? (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Repay Amount (USD)
                          </label>
                          <input
                            type="number"
                            value={repayAmount}
                            onChange={(e) => setRepayAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Add Collateral (HBAR)
                          </label>
                          <input
                            type="number"
                            value={additionalCollateral}
                            onChange={(e) => setAdditionalCollateral(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRepay(loan.id)}
                            disabled={
                              !repayAmount || parseFloat(repayAmount) <= 0 || isRepaying
                            }
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium"
                          >
                            {isRepaying ? 'Processing...' : 'Repay'}
                          </button>
                          <button
                            onClick={() => handleAddCollateral(loan.id)}
                            disabled={
                              !additionalCollateral ||
                              parseFloat(additionalCollateral) <= 0 ||
                              isAddingCollateral
                            }
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2 rounded-lg font-medium"
                          >
                            {isAddingCollateral ? 'Processing...' : 'Add Collateral'}
                          </button>
                          <button
                            onClick={() => setSelectedLoan(null)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedLoan(loan.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
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
}
