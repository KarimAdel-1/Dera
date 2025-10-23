import React from 'react';

/**
 * Pagination controls for transaction list
 */
const Pagination = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange
}) => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between space-y-2 lg:space-y-0 lg:space-x-2 py-2 lg:py-4">
      <div className="text-sm text-[var(--color-text-muted)] text-center lg:text-left">
        Showing {endIndex > 0 ? `${startIndex + 1} to ${endIndex}` : '0'} of {totalItems} crypto transactions
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 h-8 rounded-md px-3 flex items-center gap-1"
        >
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
            className="h-4 w-4"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
          <span className="hidden lg:inline">Previous</span>
        </button>
        <span className="text-sm text-[var(--color-text-muted)] px-2">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 h-8 rounded-md px-3 flex items-center gap-1"
        >
          <span className="hidden lg:inline">Next</span>
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
            className="h-4 w-4"
          >
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
