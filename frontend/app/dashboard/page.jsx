'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import DashboardTab from '../components/features/dashboard/DashboardTab';
import YourWalletsTab from '../components/features/wallets/YourWalletsTab';
import TransactionsTab from '../components/features/transactions/TransactionsTab';
import SettingsTab from '../components/features/settings/SettingsTab';
import HederaStatsTab from '../components/features/hedera-stats/HederaStatsTab';
import TestingDashboard from '../components/features/testing/TestingDashboard';

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
      case 'testing':
        return <TestingDashboard />;
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
      case 'testing':
        return 'Testing';
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
