import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchNetworkData,
  fetchEcosystemMetrics,
  fetchTransactionTypes,
  fetchNewTransactionTypes,
  networkSlice,
} from '../store/hederaSlice';
import {
  Activity,
  TrendingUp,
  Users,
  DollarSign,
  Zap,
  RefreshCcw,
  Clock,
  BarChart3,
} from 'lucide-react';
import HederaStatsSkeleton from './HederaStatsSkeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const HederaStatsTab = () => {
  const dispatch = useDispatch();
  const {
    overview,
    performance,
    transactions,
    status,
    error,
    lastFetched,
    timeframe,
    transactionTab,
    transactionTimeframe,
  } = useSelector((state) => state.network);

  // --- Fetch on mount + auto-refresh every 5 min ---
  useEffect(() => {
    dispatch(fetchNetworkData(timeframe));
    dispatch(fetchEcosystemMetrics());
    dispatch(fetchTransactionTypes(transactionTimeframe));
    dispatch(fetchNewTransactionTypes(transactionTimeframe));

    const interval = setInterval(
      () => {
        dispatch(fetchNetworkData(timeframe));
        dispatch(fetchEcosystemMetrics());
        dispatch(fetchTransactionTypes(transactionTimeframe));
        dispatch(fetchNewTransactionTypes(transactionTimeframe));
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [dispatch, timeframe, transactionTimeframe]);

  const handleRefresh = () => {
    dispatch(fetchNetworkData(timeframe));
    dispatch(fetchEcosystemMetrics());
    dispatch(fetchTransactionTypes(transactionTimeframe));
    dispatch(fetchNewTransactionTypes(transactionTimeframe));
  };

  const handleTimeframeChange = (newTimeframe) => {
    dispatch(networkSlice.actions.setTimeframe(newTimeframe));
  };

  const handleTransactionTimeframeChange = (newTimeframe) => {
    dispatch(networkSlice.actions.setTransactionTimeframe(newTimeframe));
  };

  // --- Derived data for charts ---
  const currentData =
    transactionTab === 'total' ? transactions.perType : transactions.newPerType;
  console.log('Transaction data:', {
    transactionTab,
    currentData,
    transactions,
  });
  const chartData = Object.entries(currentData || {}).map(([key, value]) => ({
    name: key.toUpperCase(),
    count: value || 0,
  }));



  const formattedTime = lastFetched
    ? new Date(lastFetched).toLocaleTimeString()
    : null;

  // --- Loading UI ---
  if (status === 'loading') {
    return (
      <div className="p-0 sm:p-0">
        <HederaStatsSkeleton />
      </div>
    );
  }

  // --- Error UI ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-400 font-bold mb-2">Error</p>
        <p className="text-[var(--color-text-muted)] mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-0">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[var(--color-text-muted)] text-sm">
              Real-time network data
            </p>
            {formattedTime && (
              <p className="text-[var(--color-text-muted)] text-xs mt-1">
                Last updated: {formattedTime}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className="cursor-pointer p-1.5 xl:p-2 bg-[var(--color-bg-hover)]/50 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline-none flex-shrink-0"
            title="Refresh data"
          >
            <RefreshCcw className="w-4 h-4 xl:w-5 xl:h-5" />
          </button>
        </div>

        {/* Overview Section */}
        <Section title="Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <Card title={`Network Fees (${timeframe})`} icon={<DollarSign />}>
              {overview.networkFees?.toFixed(0) || 0} ℏ
            </Card>
            <Card title="New Accounts (1hr)" icon={<Users />}>
              {overview.newAccounts1h?.toLocaleString() || 0}
            </Card>
            <Card title="Active Accounts (1hr)" icon={<Activity />}>
              {overview.activeAccounts1h?.toLocaleString() || 0}
            </Card>
            <Card title="HBAR (USD)" icon={<TrendingUp />}>
              ${overview.hbarUSD?.toFixed(4) || '0.0000'}
            </Card>
            <Card title="Hedera TVL" icon={<DollarSign />}>
              ${overview.hederaTVL?.toFixed(2) || '0.00'}M
            </Card>
            <Card title="Stable Coin MC" icon={<DollarSign />}>
              ${overview.stablecoinMC?.toFixed(2) || '0.00'}M
            </Card>
          </div>


        </Section>

        {/* Network Performance */}
        <Section title="Network Performance">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <GaugeCard
              title="Average TTC"
              value={((performance.avgTTC || 0) / 1000).toFixed(2)}
              unit="s"
              current={(performance.avgTTC || 0) / 1000}
              max={10}
            />
            <GaugeCard
              title="TPS"
              value={performance.tps?.toFixed(0) || '0'}
              unit=" TPS"
              current={performance.tps || 0}
              min={4}
              max={132}
            />
            <Card title="Network Fees (USD) (24h)" icon={<DollarSign />}>
              ${(overview.networkFees * overview.hbarUSD)?.toFixed(2) || '0.00'}
            </Card>
          </div>
        </Section>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[var(--color-text-secondary)] text-[18px] font-normal">
              Transactions
            </h2>
            <select
              value={transactionTimeframe}
              onChange={(e) => handleTransactionTimeframeChange(e.target.value)}
              className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <Card title="Total Transactions" icon={<BarChart3 />}>
              {transactions.totalTx?.toLocaleString() || 0}
            </Card>
            <Card title="New Transactions" icon={<Activity />}>
              {transactions.newTx1h?.toLocaleString() || 0}
            </Card>
          </div>

          {/* Transaction Types with Tabs */}
          <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--color-text-secondary)] text-[16px] xl:text-[18px] font-normal">
                Transactions by Type
              </h3>
              <div className="flex bg-[var(--color-bg-primary)] rounded-lg p-1">
                <button
                  onClick={() =>
                    dispatch(networkSlice.actions.setTransactionTab('total'))
                  }
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    transactionTab === 'total'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Total
                </button>
                <button
                  onClick={() =>
                    dispatch(networkSlice.actions.setTransactionTab('new'))
                  }
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    transactionTab === 'new'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  New
                </button>
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
};

// --- Small reusable components ---

const Section = ({ title, children }) => (
  <div>
    <h2 className="text-[var(--color-text-secondary)] text-[18px] font-normal mb-4">
      {title}
    </h2>
    {children}
  </div>
);

const Card = ({ title, icon, children }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:shadow-md">
    <div className="flex items-start justify-between mb-2 xl:mb-3">
      <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal">
        {title}
      </h3>
      <div className="w-4 h-4 text-[var(--color-text-muted)]">{icon}</div>
    </div>
    <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal">
      {children}
    </span>
  </div>
);

const GaugeCard = ({ title, value, unit, current, min = 0, max }) => {
  const percentage = Math.min(Math.max((current - min) / (max - min), 0), 1);
  const data = [{ value: percentage }, { value: 1 - percentage }];

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex flex-col items-center justify-center h-full">
        <ResponsiveContainer width={240} height={140}>
          <PieChart>
            <Pie
              startAngle={180}
              endAngle={0}
              data={data}
              cx="50%"
              cy="75%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              <Cell fill="var(--color-primary)" />
              <Cell fill="var(--color-border-primary)" />
            </Pie>
            <text
              x="50%"
              y="75%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={24}
              fontWeight="bold"
              fill="var(--color-text-primary)"
            >
              {value}
              {unit}
            </text>
          </PieChart>
        </ResponsiveContainer>
        <h3 className="text-[var(--color-text-muted)] text-[12px] xl:text-[13px] font-normal mt-1 text-center">
          {title}
        </h3>
      </div>
    </div>
  );
};

const GraphCard = ({ title, children }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 mb-6">
    <h3 className="text-[var(--color-text-secondary)] text-[16px] xl:text-[18px] font-normal mb-4">
      {title}
    </h3>
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height={280}>
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

export default HederaStatsTab;
