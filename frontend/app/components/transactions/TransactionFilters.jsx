import React from 'react';

/**
 * Search and quick filters for transactions
 */
const TransactionFilters = ({
  searchTerm,
  onSearchChange,
  selectedFilter,
  onFilterChange
}) => {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'received', label: 'Received' },
    { id: 'sent', label: 'Sent' },
    { id: 'pending', label: 'Pending' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4">
        <div className="relative w-full lg:max-w-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] w-4 h-4"
          >
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>
          <input
            className="flex w-full rounded-lg border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--color-bg-input)] border-[var(--color-border-input)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]/50 h-8 px-3 py-2 text-sm pl-10 pr-4"
            placeholder="Search transactions..."
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="space-y-2 lg:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--color-text-muted)] font-medium">
            Quick filters
          </span>
        </div>
        <div className="flex items-center gap-1.5 lg:gap-2 flex-wrap">
          {filters.map(filter => (
            <FilterPill
              key={filter.id}
              label={filter.label}
              active={selectedFilter === filter.id}
              onClick={() => onFilterChange(filter.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const FilterPill = ({ label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 px-3 py-1 cursor-pointer transition-all hover:scale-105 text-xs lg:text-sm ${
      active
        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
        : 'text-[var(--color-text-primary)] border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]'
    }`}
  >
    {label}
  </div>
);

export default TransactionFilters;
