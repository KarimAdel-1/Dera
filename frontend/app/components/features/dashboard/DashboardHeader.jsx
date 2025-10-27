import React from 'react';

const DashboardHeader = () => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
      <div>
        <h2 className="text-[var(--color-text-primary)] text-[20px] sm:text-[24px] font-normal">
          {getGreeting()}
        </h2>
        <p className="text-[var(--color-text-muted)] text-[12px] sm:text-[14px] mt-1">
          Welcome back to your financial dashboard
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
