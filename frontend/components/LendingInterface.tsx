import React, { useState } from 'react';

export default function LendingInterface() {
  const [selectedTier, setSelectedTier] = useState(1);
  const [amount, setAmount] = useState('');

  const tiers = [
    {
      id: 1,
      name: 'Instant Access',
      apy: '4.5%',
      lockPeriod: 'None',
      lendable: '30%',
      description: 'Withdraw anytime with instant access to your funds',
    },
    {
      id: 2,
      name: '30-Day Notice',
      apy: '5.85%',
      lockPeriod: '30 days',
      lendable: '70%',
      description: 'Higher yields with 30-day withdrawal notice',
    },
    {
      id: 3,
      name: '90-Day Locked',
      apy: '7.65%',
      lockPeriod: '90 days',
      lendable: '100%',
      description: 'Maximum returns with 90-day lock period',
    },
  ];

  const handleDeposit = () => {
    // Deposit logic here
    console.log(`Depositing ${amount} HBAR to tier ${selectedTier}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            onClick={() => setSelectedTier(tier.id)}
            className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
              selectedTier === tier.id
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300'
            }`}
          >
            <h3 className="font-semibold text-lg mb-2">{tier.name}</h3>
            <div className="text-2xl font-bold text-primary-600 mb-2">{tier.apy}</div>
            <div className="text-sm text-gray-600 mb-1">Lock: {tier.lockPeriod}</div>
            <div className="text-sm text-gray-600 mb-3">Lendable: {tier.lendable}</div>
            <p className="text-sm text-gray-500">{tier.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-4">Deposit Amount</h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (HBAR)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleDeposit}
          disabled={!amount || parseFloat(amount) <= 0}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium"
        >
          Deposit to Tier {selectedTier}
        </button>
      </div>
    </div>
  );
}
