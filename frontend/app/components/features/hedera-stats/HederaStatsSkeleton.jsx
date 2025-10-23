import React from 'react';

const HederaStatsSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-40 mb-2"></div>
          <div className="h-3 bg-[var(--color-bg-tertiary)] rounded w-32"></div>
        </div>
        <div className="w-8 h-8 bg-[var(--color-bg-tertiary)] rounded-full"></div>
      </div>

      {/* Overview Section */}
      <div>
        <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-20 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
              <div className="flex items-start justify-between mb-2 xl:mb-3">
                <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-24"></div>
                <div className="w-4 h-4 bg-[var(--color-bg-tertiary)] rounded"></div>
              </div>
              <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Network Performance Section */}
      <div>
        <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-32 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Gauge Cards */}
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-32 h-32 bg-[var(--color-bg-tertiary)] rounded-full mb-2"></div>
                <div className="h-3 bg-[var(--color-bg-tertiary)] rounded w-16"></div>
              </div>
            </div>
          ))}
          {/* Regular Card */}
          <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
            <div className="flex items-start justify-between mb-2 xl:mb-3">
              <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-28"></div>
              <div className="w-4 h-4 bg-[var(--color-bg-tertiary)] rounded"></div>
            </div>
            <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-20"></div>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-24"></div>
          <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-20"></div>
        </div>
        
        {/* Transaction Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {Array(2).fill(0).map((_, i) => (
            <div key={i} className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6">
              <div className="flex items-start justify-between mb-2 xl:mb-3">
                <div className="h-4 bg-[var(--color-bg-tertiary)] rounded w-24"></div>
                <div className="w-4 h-4 bg-[var(--color-bg-tertiary)] rounded"></div>
              </div>
              <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-20"></div>
            </div>
          ))}
        </div>

        {/* Transaction Chart */}
        <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-[var(--color-bg-tertiary)] rounded w-36"></div>
            <div className="flex bg-[var(--color-bg-primary)] rounded-lg p-1">
              <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-12 mr-1"></div>
              <div className="h-8 bg-[var(--color-bg-tertiary)] rounded w-12"></div>
            </div>
          </div>
          <div className="h-[280px] bg-[var(--color-bg-tertiary)] rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export default HederaStatsSkeleton;