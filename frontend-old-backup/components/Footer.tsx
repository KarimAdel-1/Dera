import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">Dera</h3>
            <p className="text-gray-600 text-sm">
              Decentralized lending platform on Hedera with multi-tier liquidity and staking.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/lend" className="text-gray-600 hover:text-primary-600">Lend</a></li>
              <li><a href="/borrow" className="text-gray-600 hover:text-primary-600">Borrow</a></li>
              <li><a href="/dashboard" className="text-gray-600 hover:text-primary-600">Dashboard</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/docs" className="text-gray-600 hover:text-primary-600">Documentation</a></li>
              <li><a href="/faq" className="text-gray-600 hover:text-primary-600">FAQ</a></li>
              <li><a href="/security" className="text-gray-600 hover:text-primary-600">Security</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-600 hover:text-primary-600">Twitter</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary-600">Discord</a></li>
              <li><a href="#" className="text-gray-600 hover:text-primary-600">GitHub</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          <p>&copy; 2024 Dera. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
