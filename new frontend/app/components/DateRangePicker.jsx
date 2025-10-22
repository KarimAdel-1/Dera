import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const DateRangePicker = ({ onDateChange }) => {
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [fromDate, setFromDate] = useState('01 Oct 2025');
  const [toDate, setToDate] = useState('31 Oct 2025');

  const quickOptions = [
    'Custom', 'Today', 'Yesterday', 'Last 7 days', 
    'Last 28 days', 'Last 30 days', 'This Month', 'Last Month'
  ];

  return (
    <div className="bg-[var(--color-bg-card)] border-[var(--color-border-primary)] shadow-xl rounded-lg overflow-hidden w-auto">
      <div className="flex flex-col lg:flex-row">
        {/* Quick Select Sidebar */}
        <div className="border-b lg:border-b-0 lg:border-r border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/50 w-full lg:w-52">
          <div className="p-3 space-y-1.5">
            <h4 className="font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 text-xs">
              Quick Select
            </h4>
            <div className="gap-1.5 grid grid-cols-2 lg:grid-cols-1">
              {quickOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedRange(option)}
                  className={`w-full text-start rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] border border-transparent px-3 py-2.5 text-sm ${
                    selectedRange === option
                      ? 'bg-[var(--color-primary)] text-white font-medium shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="flex-1">
          {/* Date Range Header */}
          <div className="px-4 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block uppercase tracking-wider">
                  From
                </label>
                <div className="px-3 py-2 rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] text-sm font-semibold text-[var(--color-text-primary)]">
                  {fromDate}
                </div>
              </div>
              <div className="flex items-center justify-center pt-0 sm:pt-5">
                <div className="flex items-center gap-2 rotate-90 sm:rotate-0">
                  <div className="w-4 h-[2px] bg-[var(--color-border-secondary)] rounded-full"></div>
                  <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
                  <div className="w-4 h-[2px] bg-[var(--color-border-secondary)] rounded-full"></div>
                </div>
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block uppercase tracking-wider">
                  To
                </label>
                <div className="px-3 py-2 rounded-md border border-[var(--color-border-secondary)] bg-[var(--color-bg-card)] text-sm font-semibold text-[var(--color-text-primary)]">
                  {toDate}
                </div>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-1">
            <div className="w-fit p-0 bg-[var(--color-bg-card)]">
              <div className="flex flex-col justify-center sm:flex-row flex-wrap gap-4">
                {/* Navigation */}
                <nav className="flex items-center justify-center w-full mt-2">
                  <button className="h-7 w-7 bg-transparent p-0 text-[var(--color-text-muted)] opacity-60 hover:opacity-100 hover:bg-[var(--color-bg-hover)] rounded-md">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button className="h-7 w-7 bg-transparent p-0 text-[var(--color-text-muted)] opacity-60 hover:opacity-100 hover:bg-[var(--color-bg-hover)] rounded-md">
                    <ChevronRight className="size-4" />
                  </button>
                </nav>

                {/* Calendar Month */}
                <div className="space-y-3">
                  <div className="flex justify-center pt-1 items-center">
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      October 2025
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-center pt-1 items-center rdp-month_caption">
                      <span className="text-sm font-semibold text-[var(--color-text-primary)]" role="status" aria-live="polite">October 2025</span>
                    </div>
                    <table role="grid" aria-multiselectable="true" aria-label="October 2025" className="rdp-month_grid">
                      <thead aria-hidden="true">
                        <tr className="flex rdp-weekdays">
                          <th aria-label="Sunday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Su</th>
                          <th aria-label="Monday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Mo</th>
                          <th aria-label="Tuesday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Tu</th>
                          <th aria-label="Wednesday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">We</th>
                          <th aria-label="Thursday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Th</th>
                          <th aria-label="Friday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Fr</th>
                          <th aria-label="Saturday" className="text-[var(--color-text-muted)] rounded-md w-9 font-medium text-[0.8rem] text-center" scope="col">Sa</th>
                        </tr>
                      </thead>
                      <tbody className="rdp-weeks">
                        <tr className="flex w-full mt-2 rdp-week">
                          <td className="h-9 w-9 p-0 font-normal transition-all duration-150 rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-primary)]/20 focus:text-[var(--color-text-primary)] text-muted-foreground aria-selected:text-muted-foreground rdp-outside" role="gridcell" data-day="2025-09-28" data-month="2025-09" data-outside="true">
                            <button className="items-center justify-center whitespace-nowrap rounded-md text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 hover:text-accent-foreground dark:hover:bg-accent/50 data-[selected-single=true]:bg-[var(--color-primary)] data-[selected-single=true]:text-white data-[range-start=true]:bg-[var(--color-primary)] data-[range-start=true]:text-white data-[range-start=true]:rounded-l-md data-[range-end=true]:bg-[var(--color-primary)] data-[range-end=true]:text-white data-[range-end=true]:rounded-r-md data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] data-[selected=true]:hover:bg-[var(--color-primary)] data-[selected=true]:hover:text-white group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square size-auto w-full min-w-[2rem] flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 transition-colors duration-150 rdp-day rdp-day_button" data-day="9/28/2025" data-range-start="false" data-range-end="false" data-range-middle="false" type="button" tabIndex="-1" aria-label="Sunday, September 28th, 2025">28</button>
                          </td>
                          <td className="h-9 w-9 p-0 font-normal transition-all duration-150 rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] focus:bg-[var(--color-primary)]/20 focus:text-[var(--color-text-primary)] rdp-selected rounded-l-md bg-[var(--color-primary)] text-white rdp-range_start" role="gridcell" aria-selected="true" data-day="2025-10-01" data-selected="true">
                            <button className="items-center justify-center whitespace-nowrap rounded-md text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 hover:text-accent-foreground dark:hover:bg-accent/50 data-[selected-single=true]:bg-[var(--color-primary)] data-[selected-single=true]:text-white data-[range-start=true]:bg-[var(--color-primary)] data-[range-start=true]:text-white data-[range-start=true]:rounded-l-md data-[range-end=true]:bg-[var(--color-primary)] data-[range-end=true]:text-white data-[range-end=true]:rounded-r-md data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] data-[selected=true]:hover:bg-[var(--color-primary)] data-[selected=true]:hover:text-white group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square size-auto w-full min-w-[2rem] flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 transition-colors duration-150 rdp-day rdp-day_button" data-day="10/1/2025" data-selected-single="false" data-range-start="true" data-range-end="false" data-range-middle="false" type="button" tabIndex="0" aria-label="Wednesday, October 1st, 2025, selected">1</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30 flex justify-between items-center px-4 py-3">
            <div className="text-[var(--color-text-muted)] text-xs">
              <span>33 days selected</span>
            </div>
            <div className="flex gap-2">
              <button className="h-8 rounded-md px-4 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-card)]/70 text-sm">
                Cancel
              </button>
              <button className="h-8 rounded-md px-4 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 text-sm">
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;