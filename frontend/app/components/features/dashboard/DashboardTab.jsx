import React from 'react';
import { useSelector } from 'react-redux';
import DashboardHeader from '../dashboard/DashboardHeader';
import WalletSection from '../dashboard/WalletSection';
import SidebarSection from '../dashboard/SidebarSection';
import TransactionsSection from '../dashboard/TransactionsSection';
import StatisticsSection from '../dashboard/StatisticsSection';

const DashboardTab = () => {
  const { walletType } = useSelector((state) => state.wallet);

  return (
    <div className="relative">
      <DashboardHeader />
      <div className="grid gap-4 sm:gap-5 pb-6 sm:pb-8 w-full grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <WalletSection />
        <SidebarSection />
        <TransactionsSection />
        <StatisticsSection />
      </div>
    </div>
  );
};

export default DashboardTab;
