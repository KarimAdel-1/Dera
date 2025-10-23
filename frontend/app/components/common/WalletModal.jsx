'use client';

import { useState } from 'react';

export default function WalletModal({ isOpen, onClose, accounts, onSelectAccount }) {
  const [selectedAccount, setSelectedAccount] = useState(null);

  if (!isOpen) return null;

  const handleSelect = (account) => {
    setSelectedAccount(account);
    onSelectAccount(account);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl border border-gray-700 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Select Account</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">Choose which account to connect to Dera App</p>
        </div>

        {/* Account List */}
        <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
          {accounts.map((account, index) => (
            <button
              key={account}
              onClick={() => handleSelect(account)}
              className="w-full p-4 bg-[#2a2a2a] hover:bg-[#333] border border-gray-600 hover:border-blue-500 rounded-xl text-left transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium mb-1">Account {index + 1}</div>
                  <div className="font-mono text-sm text-gray-300 break-all">{account}</div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-gray-500 group-hover:border-blue-500 transition-colors"></div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}