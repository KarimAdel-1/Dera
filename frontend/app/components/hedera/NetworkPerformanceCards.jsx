import React from 'react';
import { DollarSign } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/**
 * Display network performance metrics with gauge charts
 */
const NetworkPerformanceCards = ({ performance, overview }) => {
  return (
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
      <StatCard
        title="Network Fees (USD) (24h)"
        icon={<DollarSign />}
        value={`$${(overview.networkFees * overview.hbarUSD)?.toFixed(2) || '0.00'}`}
      />
    </div>
  );
};

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

const StatCard = ({ title, icon, value }) => (
  <div className="bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-4 xl:p-6 transition-all duration-200 hover:shadow-md">
    <div className="flex items-start justify-between mb-2 xl:mb-3">
      <h3 className="text-[var(--color-text-muted)] text-[13px] xl:text-[14px] font-normal">
        {title}
      </h3>
      <div className="w-4 h-4 text-[var(--color-text-muted)]">{icon}</div>
    </div>
    <span className="text-[var(--color-text-primary)] text-[20px] lg:text-[24px] xl:text-[28px] font-normal">
      {value}
    </span>
  </div>
);

export default NetworkPerformanceCards;
