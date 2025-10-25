import React from 'react';
import { X } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setSelectedWallet } from '../../store/nftSlice';

const WalletSelector = ({ onClose }) => {
  const dispatch = useDispatch();

  const wallets = [
    { name: 'HashPack', icon: 'H', color: 'bg-blue-500' }
  ];

  const handleWalletSelect = (walletName) => {
    dispatch(setSelectedWallet(walletName));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-[var(--color-bg-secondary)] rounded-xl p-6 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[var(--color-text-primary)] text-xl font-semibold">Select Wallet</h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => handleWalletSelect(wallet.name)}
              className="w-full flex items-center gap-3 p-4 bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-primary)] rounded-lg transition-colors"
            >
              <div className={`w-10 h-10 ${wallet.color} rounded-full flex items-center justify-center text-white font-bold`}>
                {wallet.icon}
              </div>
              <span className="text-[var(--color-text-primary)] font-medium">{wallet.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletSelector;