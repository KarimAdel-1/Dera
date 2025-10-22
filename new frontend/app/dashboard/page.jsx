'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import DashboardTab from '../components/DashboardTab';
import YourWalletsTab from '../components/YourWalletsTab';
import MarketplaceTab from '../components/MarketplaceTab';
import TransactionsTab from '../components/TransactionsTab';
import SettingsTab from '../components/SettingsTab';
import HederaStatsTab from '../components/HederaStatsTab';

export default function Dashboard() {
  const { isConnected } = useSelector((state) => state.wallet);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const topLoaderRef = useRef(null);

  const handleTabChange = (tab) => {
    topLoaderRef.current?.start();
    setActiveTab(tab);
  };

  useEffect(() => {
    if (!isConnected) {
      router.push('/connect');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'wallets':
        return <YourWalletsTab />;
      case 'marketplace':
        return <MarketplaceTab />;
      case 'transactions':
        return <TransactionsTab />;
      case 'hedera-stats':
        return <HederaStatsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <DashboardTab />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'wallets':
        return 'Your Wallets';
      case 'marketplace':
        return 'Marketplace';
      case 'transactions':
        return 'Transactions';
      case 'hedera-stats':
        return 'Hedera Stats';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-2 sm:px-4 p-4 sm:p-8 pb-0">
      <div className="bg-[var(--color-bg-primary)] relative rounded-[12px] sm:rounded-[20px] w-full max-w-[1920px] mx-auto">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <Header title={getTabTitle()} />
        <div
          className=" relative inset-0 z-0 transition-all duration-300 ease-in-out ps-[max(8px,calc(var(--sidebar-width,120px)+16px))] pt-[72px] pe-[8px] pb-[8px]
"
        >
          <div className="">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
}
