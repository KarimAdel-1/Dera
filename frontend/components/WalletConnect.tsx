import React, { useState } from 'react';

export default function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string>('');

  const connectWallet = async () => {
    // HashConnect integration would go here
    // For now, just a placeholder
    setConnected(true);
    setAccount('0.0.12345');
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAccount('');
  };

  return (
    <div>
      {!connected ? (
        <button
          onClick={connectWallet}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">{account}</span>
          <button
            onClick={disconnectWallet}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
