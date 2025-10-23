import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * Bar chart showing transactions by type
 */
const TransactionTypeChart = ({
  transactions,
  transactionTab,
  transactionTimeframe,
  onTabChange,
  onTimeframeChange,
}) => {
  const currentData =
    transactionTab === 'total' ? transactions.perType : transactions.newPerType;

  const chartData = useMemo(() => {
    return Object.entries(currentData || {}).map(([key, value]) => ({
      name: key.toUpperCase(),
      count: value || 0,
    }));
  }, [currentData]);

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 mb-6">
      {/* Header with Tabs and Timeframe Selector */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[var(--color-text-secondary)] text-[16px] xl:text-[18px] font-normal">
          Transactions by Type
        </h3>
        <div className="flex items-center gap-3">
          {/* Transaction Type Tabs */}
          <div className="flex bg-[var(--color-bg-primary)] rounded-lg p-1">
            <button
              onClick={() => onTabChange('total')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                transactionTab === 'total'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => onTabChange('new')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                transactionTab === 'new'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              New
            </button>
          </div>

          {/* Timeframe Selector */}
          <select
            value={transactionTimeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
            className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-primary)"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: '8px',
              }}
              formatter={(value) => [value.toLocaleString(), 'Count']}
            />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TransactionTypeChart;
