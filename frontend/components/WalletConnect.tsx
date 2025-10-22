import React, { useState } from 'react';
import { useWallet, WalletType, ConnectedWallet } from '../contexts/WalletContext';
import { Wallet, ChevronDown, LogOut, Check, Plus, X, HelpCircle } from 'lucide-react';
import HashPackCleanupGuide from './HashPackCleanupGuide';

const WalletConnect: React.FC = () => {
  const { wallets, activeWallet, isConnecting, connectWallet, disconnectWallet, switchActiveWallet, resetConnection } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCleanupGuide, setShowCleanupGuide] = useState(false);

  const walletOptions: { type: WalletType; name: string; icon: string; description: string }[] = [
    {
      type: 'hashpack',
      name: 'HashPack',
      icon: '🔷',
      description: 'Most popular Hedera wallet',
    },
    {
      type: 'kabila',
      name: 'Kabila',
      icon: '🟣',
      description: 'Secure and easy to use',
    },
    {
      type: 'blade',
      name: 'Blade',
      icon: '⚡',
      description: 'Fast and feature-rich',
    },
  ];

  const handleConnect = async (type: WalletType) => {
    await connectWallet(type);
    setShowWalletModal(false);
  };

  const handleDisconnect = async (walletId: string) => {
    await disconnectWallet(walletId);
    if (wallets.length <= 1) {
      setShowManageModal(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (wallets.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowWalletModal(true)}
          disabled={isConnecting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Wallet className="w-5 h-5" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>

        {/* Wallet Selection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Connect Wallet</h2>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">Choose your preferred wallet to connect</p>

              <div className="space-y-3">
                {walletOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleConnect(option.type)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowWalletModal(false);
                  setShowCleanupGuide(true);
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 py-2 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                Having connection issues? Click here for help
              </button>

              <div className="mt-4 text-sm text-gray-500 text-center">
                By connecting a wallet, you agree to our Terms of Service
              </div>
            </div>
          </div>
        )}

        {/* Cleanup Guide Modal */}
        {showCleanupGuide && (
          <HashPackCleanupGuide onClose={() => setShowCleanupGuide(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Active Wallet Display */}
        <button
          onClick={() => setShowManageModal(true)}
          className="flex items-center gap-3 bg-white border-2 border-gray-200 hover:border-blue-500 px-4 py-2 rounded-lg transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium text-gray-900">{formatAddress(activeWallet?.accountId || '')}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>

        {/* Add Wallet Button */}
        <button
          onClick={() => setShowWalletModal(true)}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Add another wallet"
        >
          <Plus className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Wallet Management Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Manage Wallets</h2>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    wallet.isActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (!wallet.isActive) {
                          switchActiveWallet(wallet.id);
                        }
                      }}
                      className="flex items-center gap-3 flex-1"
                    >
                      <span className="text-2xl">
                        {walletOptions.find(w => w.type === wallet.type)?.icon}
                      </span>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 capitalize">
                            {wallet.type}
                          </span>
                          {wallet.isActive && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{wallet.accountId}</div>
                        {wallet.balance && (
                          <div className="text-sm text-gray-500">{wallet.balance} HBAR</div>
                        )}
                      </div>
                    </button>

                    <button
                      onClick={() => handleDisconnect(wallet.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Disconnect wallet"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowManageModal(false);
                setShowWalletModal(true);
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Another Wallet</span>
            </button>

            <button
              onClick={async () => {
                setShowManageModal(false);
                await resetConnection();
              }}
              className="w-full mt-2 text-sm text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear all wallet data and reset connection (use if experiencing connection issues)"
            >
              Reset All Connections
            </button>
          </div>
        </div>
      )}

      {/* Wallet Selection Modal (reused) */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Connect Wallet</h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">Choose your preferred wallet to connect</p>

            <div className="space-y-3">
              {walletOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleConnect(option.type)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-3xl">{option.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{option.name}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowWalletModal(false);
                setShowCleanupGuide(true);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 py-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Having connection issues? Click here for help
            </button>
          </div>
        </div>
      )}

      {/* Cleanup Guide Modal */}
      {showCleanupGuide && (
        <HashPackCleanupGuide onClose={() => setShowCleanupGuide(false)} />
      )}
    </>
  );
};

export default WalletConnect;
