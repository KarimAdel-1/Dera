import React from 'react';
import { Menu, Globe, Monitor, Search, RefreshCw } from 'lucide-react';
import { useSelector } from 'react-redux';
import NotificationPanel from '../common/NotificationPanel';

const Header = ({ title = 'Dashboard' }) => {
  const { address, isConnected, currentUser } = useSelector((state) => state.wallet);
  
  const formatAddress = (addr) => {
    if (!addr) return 'Not Connected';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  return (
    <div
      className="fixed top-0 end-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border border-s-0 border-[var(--color-border-primary)] bg-[var(--color-sidebar-bg)] transition-all duration-300"
      style={{ insetInlineStart: 'calc(var(--sidebar-width, 120px))' }}
    >
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        <button
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed lg:hidden"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
        <h1 className="text-[var(--color-text-secondary)] text-[16px] sm:text-[20px] md:text-[27px] font-normal truncate">
          {title}
        </h1>
      </div>

      <div className="flex justify-end items-center gap-0.5 sm:gap-1">
        <div className="hidden sm:block">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Switch language"
          >
            <Globe className="w-4.5 h-4.5" />
          </button>
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Toggle theme"
        >
          <Monitor className="w-4.5 h-4.5" />
        </button>

        <div className="border-l border-[var(--color-border-primary)] h-4 sm:h-6 mx-2 sm:mx-3 hidden sm:block"></div>

        <div className="hidden sm:block">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Search"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="hidden sm:block">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        </div>

        <NotificationPanel />

        <div className="border-l border-[var(--color-border-primary)] h-4 sm:h-6 mx-2 sm:mx-4 me-2 sm:me-3"></div>

        <button className="justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 py-2 flex items-center gap-2 sm:gap-3 px-1 sm:px-2 hover:bg-[var(--color-bg-hover)] min-w-0">
          <div className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">
              {isConnected && address ? address.slice(0, 2).toUpperCase() : 'NC'}
            </span>
          </div>
          <div className="flex-col text-[var(--color-text-primary)] text-sm sm:text-md text-start hidden sm:block min-w-0">
            <span className="truncate">{currentUser ? `User: ${currentUser.id.slice(0, 8)}...` : 'Not Connected'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Header;