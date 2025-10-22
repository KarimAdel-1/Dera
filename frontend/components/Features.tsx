import React from 'react';

export default function Features() {
  const features = [
    {
      title: 'Three-Tier System',
      description: 'Choose from Instant, Warm, or Cold liquidity tiers based on your needs',
      icon: '🏦',
    },
    {
      title: 'Dynamic iScore',
      description: 'Build your credit score for better rates and lower collateral requirements',
      icon: '📊',
    },
    {
      title: 'Staking Rewards',
      description: 'Earn automatic staking rewards on your collateral while borrowing',
      icon: '💰',
    },
    {
      title: 'Instant Liquidations',
      description: 'Automated health monitoring and liquidation protection',
      icon: '⚡',
    },
    {
      title: 'Low Fees',
      description: 'Benefit from Hedera\'s low transaction costs and fast finality',
      icon: '💸',
    },
    {
      title: 'Transparent',
      description: 'Open-source smart contracts and real-time on-chain data',
      icon: '🔍',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center mb-12">Why Choose Dera?</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
