import React from 'react';
import Link from 'next/link';

export default function Hero() {
  return (
    <div className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Lend, Borrow & Earn on <span className="text-primary-600">Hedera</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Multi-tier liquidity pools with HBAR staking rewards and dynamic credit scoring.
            Maximize your yields while earning passive staking income.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/lend"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
            >
              Start Lending
            </Link>
            <Link
              href="/borrow"
              className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg font-medium text-lg"
            >
              Borrow Now
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary-600 mb-2">3 Tiers</div>
              <div className="text-gray-600">Flexible liquidity options</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary-600 mb-2">40%</div>
              <div className="text-gray-600">Staking rewards to borrowers</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-3xl font-bold text-primary-600 mb-2">130%</div>
              <div className="text-gray-600">Min collateral ratio (high iScore)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
