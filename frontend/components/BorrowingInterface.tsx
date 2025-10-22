import React, { useState } from 'react';

export default function BorrowingInterface() {
  const [collateral, setCollateral] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');
  const [iScore, setIScore] = useState(650);

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
  const maxBorrow = collateral ? (parseFloat(collateral) * 100) / collateralRatio : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-sm border mb-6">
        <h3 className="text-xl font-semibold mb-4">Your Credit Score</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-4xl font-bold text-primary-600">{iScore}</span>
          <div className="text-right">
            <div className="text-sm text-gray-600">Collateral Ratio</div>
            <div className="text-2xl font-semibold">{collateralRatio}%</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Interest Rate</div>
            <div className="text-2xl font-semibold">{interestRate}%</div>
          </div>
        </div>
      </div>

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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Borrow Amount (USD)
          </label>
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="0.00"
            max={maxBorrow}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-500 mt-1">
            Max borrow: ${maxBorrow.toFixed(2)} USD
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
          <div className="flex justify-between">
            <span className="text-gray-600">Health Factor:</span>
            <span className="font-semibold text-green-600">2.5</span>
          </div>
        </div>

        <button
          disabled={!collateral || !borrowAmount}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium"
        >
          Borrow
        </button>
      </div>
    </div>
  );
}
