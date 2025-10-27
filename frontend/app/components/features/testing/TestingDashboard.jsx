'use client';

import { useState, useEffect } from 'react';
import AccountOverview from './components/AccountOverview';
import SupplyTab from './components/SupplyTab';
import BorrowTab from './components/BorrowTab';
import TestingTab from './components/TestingTab';
import InfoCards from './components/InfoCards';
import ActionModal from './components/ActionModal';
import NotificationToast from './components/NotificationToast';
import TransactionHistory from './components/TransactionHistory';

const TestingDashboard = () => {
  const [activeTab, setActiveTab] = useState('supply');
  const [userAccount, setUserAccount] = useState({
    address: null,
    supplies: [],
    borrows: [],
    totalSupplied: 0,
    totalBorrowed: 0,
    availableToBorrow: 0,
    healthFactor: Infinity
  });
  const [modalState, setModalState] = useState({ isOpen: false, type: '', asset: null });
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [transactionHistory, setTransactionHistory] = useState([]);

  const mockAssets = [
    { symbol: 'USDC', name: 'USD Coin', supplyAPY: 3.45, borrowAPY: 5.20, price: 1.00, ltv: 80, liquidationThreshold: 85 },
    { symbol: 'HBAR', name: 'Hedera', supplyAPY: 2.15, borrowAPY: 4.80, price: 0.08, ltv: 75, liquidationThreshold: 80 },
    { symbol: 'USDT', name: 'Tether USD', supplyAPY: 3.20, borrowAPY: 5.10, price: 1.00, ltv: 80, liquidationThreshold: 85 },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', supplyAPY: 1.80, borrowAPY: 3.50, price: 45000, ltv: 70, liquidationThreshold: 75 },
    { symbol: 'ETH', name: 'Ethereum', supplyAPY: 2.50, borrowAPY: 4.20, price: 2500, ltv: 75, liquidationThreshold: 80 },
  ];

  const calculateAccountData = (supplies, borrows) => {
    const totalSupplied = supplies.reduce((sum, s) => {
      const asset = mockAssets.find(a => a.symbol === s.asset);
      return sum + (s.amount * asset.price);
    }, 0);

    const totalBorrowed = borrows.reduce((sum, b) => {
      const asset = mockAssets.find(a => a.symbol === b.asset);
      return sum + (b.amount * asset.price);
    }, 0);

    const collateralValue = supplies.reduce((sum, s) => {
      if (!s.collateralEnabled) return sum;
      const asset = mockAssets.find(a => a.symbol === s.asset);
      return sum + (s.amount * asset.price * asset.ltv / 100);
    }, 0);

    const availableToBorrow = Math.max(0, collateralValue - totalBorrowed);

    let healthFactor = Infinity;
    if (totalBorrowed > 0) {
      const liquidationThresholdValue = supplies.reduce((sum, s) => {
        if (!s.collateralEnabled) return sum;
        const asset = mockAssets.find(a => a.symbol === s.asset);
        return sum + (s.amount * asset.price * asset.liquidationThreshold / 100);
      }, 0);
      healthFactor = liquidationThresholdValue / totalBorrowed;
    }

    return { totalSupplied, totalBorrowed, availableToBorrow, healthFactor };
  };

  const connectWallet = () => {
    const address = '0x' + Math.random().toString(16).substr(2, 40);
    
    setUserAccount({
      address,
      supplies: [],
      borrows: [],
      totalSupplied: 0,
      totalBorrowed: 0,
      availableToBorrow: 0,
      healthFactor: Infinity
    });

    showNotification('Wallet connected successfully!', 'success');
  };

  const showNotification = (message, type) => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  const openModal = (type, asset) => {
    if (type === 'borrow' && userAccount.availableToBorrow <= 0) {
      showNotification('Please supply assets and enable collateral first', 'warning');
      return;
    }
    setModalState({ isOpen: true, type, asset });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: '', asset: null });
  };

  const executeTransaction = (type, asset, amount) => {
    const assetData = mockAssets.find(a => a.symbol === asset);
    let newSupplies = [...userAccount.supplies];
    let newBorrows = [...userAccount.borrows];

    if (type === 'supply') {
      const existing = newSupplies.find(s => s.asset === asset);
      if (existing) {
        existing.amount += amount;
      } else {
        newSupplies.push({ asset, amount, apy: assetData.supplyAPY, collateralEnabled: true });
      }
    } else if (type === 'borrow') {
      const existing = newBorrows.find(b => b.asset === asset);
      if (existing) {
        existing.amount += amount;
      } else {
        newBorrows.push({ asset, amount, apy: assetData.borrowAPY });
      }
    } else if (type === 'withdraw') {
      const supply = newSupplies.find(s => s.asset === asset);
      supply.amount -= amount;
      if (supply.amount <= 0) newSupplies = newSupplies.filter(s => s.asset !== asset);
    } else if (type === 'repay') {
      const borrow = newBorrows.find(b => b.asset === asset);
      borrow.amount -= amount;
      if (borrow.amount <= 0) newBorrows = newBorrows.filter(b => b.asset !== asset);
    }

    const accountData = calculateAccountData(newSupplies, newBorrows);
    setUserAccount({ ...userAccount, supplies: newSupplies, borrows: newBorrows, ...accountData });
    
    setTransactionHistory(prev => [{
      id: Date.now(),
      type,
      asset,
      amount,
      timestamp: new Date(),
      status: 'success',
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      gasUsed: (Math.random() * 0.1 + 0.05).toFixed(4)
    }, ...prev]);
    
    closeModal();
    showNotification(`Successfully ${type}ed ${amount} ${asset}!`, 'success');
  };

  return (
    <div className="space-y-6 p-0 sm:p-6">
        <AccountOverview 
          userAccount={userAccount} 
          onConnect={connectWallet}
        />

        <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] overflow-hidden mb-6">
          <div className="flex border-b border-[var(--color-border-primary)]">
            {[{key: 'supply', label: 'Supply'}, {key: 'borrow', label: 'Borrow'}, {key: 'testing', label: 'Your Positions'}].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-6 py-4 font-medium transition-all ${
                  activeTab === tab.key 
                    ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'supply' && (
              <SupplyTab assets={mockAssets} onSupply={(asset) => openModal('supply', asset)} />
            )}
            {activeTab === 'borrow' && (
              <BorrowTab 
                assets={mockAssets} 
                availableToBorrow={userAccount.availableToBorrow}
                onBorrow={(asset) => openModal('borrow', asset)} 
              />
            )}
            {activeTab === 'testing' && (
              <TestingTab 
                supplies={userAccount.supplies}
                borrows={userAccount.borrows}
                assets={mockAssets}
                onWithdraw={(asset) => openModal('withdraw', asset)}
                onRepay={(asset) => openModal('repay', asset)}
                onSupplyMore={(asset) => openModal('supply', asset)}
                onBorrowMore={(asset) => openModal('borrow', asset)}
                onToggleCollateral={(asset) => {
                  const supply = userAccount.supplies.find(s => s.asset === asset);
                  const newSupplies = userAccount.supplies.map(s => 
                    s.asset === asset ? { ...s, collateralEnabled: !s.collateralEnabled } : s
                  );
                  
                  if (supply.collateralEnabled && userAccount.borrows.length > 0) {
                    const tempAccountData = calculateAccountData(newSupplies, userAccount.borrows);
                    if (tempAccountData.healthFactor < 1.0) {
                      showNotification('Cannot disable collateral. Health factor would be too low.', 'error');
                      return;
                    }
                  }
                  
                  const accountData = calculateAccountData(newSupplies, userAccount.borrows);
                  setUserAccount({ ...userAccount, supplies: newSupplies, ...accountData });
                  showNotification(`Collateral ${supply.collateralEnabled ? 'disabled' : 'enabled'} for ${asset}`, 'success');
                }}
              />
            )}
          </div>
        </div>

        <InfoCards />

        <TransactionHistory transactions={transactionHistory} />

      {modalState.isOpen && (
        <ActionModal
          type={modalState.type}
          asset={modalState.asset}
          assets={mockAssets}
          userAccount={userAccount}
          onClose={closeModal}
          onExecute={executeTransaction}
        />
      )}

      {notification.show && (
        <NotificationToast message={notification.message} type={notification.type} />
      )}
    </div>
  );
};

export default TestingDashboard;
