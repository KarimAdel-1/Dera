import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  House,
  CreditCard,
  ShoppingBag,
  ArrowRightLeft,
  Settings,
  ChevronLeft,
  Store,
} from 'lucide-react';

const HederaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 61.56 66.81"
    className="w-4 h-4 fill-current"
  >
    <g id="hedera" data-name="hedera">
      <g id="hedera" data-name="Layer 1">
        <path d="M61.56,66.81H50.4V46.67H11.19V66.78H0V0H11.14v20.1H50.2V0H61.56ZM11.34,37.58H50.16V29.15H11.34Z" />
      </g>
    </g>
  </svg>
);

const Sidebar = ({ activeTab, onTabChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      isCollapsed ? '80px' : '120px'
    );
  }, [isCollapsed]);

  const menuItems = [
    { icon: House, label: 'Dashboard', id: 'dashboard' },
    { icon: CreditCard, label: 'Your Wallets', id: 'wallets' },
    { icon: Store, label: 'Marketplace', id: 'marketplace' },
    { icon: ArrowRightLeft, label: 'Transactions', id: 'transactions' },
    { icon: HederaIcon, label: 'Hedera Stats', id: 'hedera-stats' },
  ];

  return (
    <div
      className={`fixed start-0 top-0 z-30 h-screen
      bg-[var(--color-sidebar-bg)] 
      transition-all duration-500 ease-in-out border border-[var(--color-border-primary)]
      ${isCollapsed ? 'w-[80px]' : 'w-[120px]'}
      -translate-x-full lg:translate-x-0
      lg:block`}
    >
      <div className="hidden lg:block">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -end-3 top-7 w-6 h-6 bg-[var(--color-sidebar-bg)] rounded-full flex items-center justify-center text-[var(--color-text-dimmed)] hover:text-[var(--color-text-primary)] transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft
            className={`w-4 h-4 text-[var(--color-text-primary)] transition-transform duration-300 ease-in-out ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <div className="flex flex-col justify-between h-full py-6">
        <div className="flex flex-col">
          <div className="flex justify-center mb-6">
            <div className="flex items-center justify-center cursor-pointer transition-all duration-500 ease-in-out hover:scale-105 w-[48px] h-[48px] mb-5">
              <div className="relative logo transition-all duration-500 ease-in-out">
                <Image
                  src="/dera-logo--white.png"
                  alt="Dera logo"
                  width={isCollapsed ? 28 : 40}
                  height={isCollapsed ? 28 : 40}
                  className="object-contain transition-all duration-500 ease-in-out"
                />
              </div>
            </div>
          </div>

          <nav className="flex flex-col items-center w-full transition-all duration-500 ease-in-out gap-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[var(--color-border-primary)] scrollbar-track-transparent">
            {menuItems.map((item, index) => {
              const isActive = activeTab === item.id;
              return (
                <div
                  key={index}
                  onClick={() => onTabChange(item.id)}
                  className="relative flex flex-col items-center cursor-pointer transition-all duration-500 ease-in-out group px-0 gap-2.5 py-2.5"
                  role="button"
                  tabIndex="0"
                  aria-label={item.label}
                  {...(isActive && { 'aria-current': 'page' })}
                >
                  <div
                    className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl group-hover:shadow-[var(--color-shadow-primary)] ${
                      isActive
                        ? 'text-[var(--color-primary)] bg-[var(--color-sidebar-active-bg)] border border-[var(--color-sidebar-active-border)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] bg-[var(--color-sidebar-bg)]/80 hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <div
                      className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} scale-100`}
                    >
                      <item.icon
                        className={isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}
                      />
                    </div>
                    {isActive && (
                      <div
                        className={`absolute start-0 top-1/2 transform -translate-y-1/2 w-1 ${isCollapsed ? 'h-6' : 'h-8'} bg-[var(--color-primary)] rounded-e-full transition-all duration-500 ease-in-out`}
                      />
                    )}
                  </div>
                  {!isCollapsed && (
                    <div className="overflow-hidden transition-all duration-500 ease-in-out h-[14px] mt-1">
                      <span
                        className={`text-xs font-medium leading-none transition-all duration-500 ease-in-out block text-center whitespace-nowrap opacity-100 transform scale-100 translate-y-0 ${
                          isActive
                            ? 'text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex justify-center flex-shrink-0">
          <div
            onClick={() => onTabChange('settings')}
            className="relative flex flex-col items-center cursor-pointer transition-all duration-500 ease-in-out group px-0 gap-2.5 py-2.5"
          >
            <div
              className={`relative flex items-center justify-center transition-all duration-500 ease-in-out ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl group-hover:shadow-[var(--color-shadow-primary)] ${
                activeTab === 'settings'
                  ? 'text-[var(--color-primary)] bg-[var(--color-sidebar-active-bg)] border border-[var(--color-sidebar-active-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] bg-[var(--color-sidebar-bg)]/80 hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              <div
                className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} scale-100`}
              >
                <Settings className={isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} />
              </div>
              {activeTab === 'settings' && (
                <div
                  className={`absolute start-0 top-1/2 transform -translate-y-1/2 w-1 ${isCollapsed ? 'h-6' : 'h-8'} bg-[var(--color-primary)] rounded-e-full transition-all duration-500 ease-in-out`}
                />
              )}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden transition-all duration-500 ease-in-out h-[14px] mt-1">
                <span
                  className={`text-xs font-medium leading-none transition-all duration-500 ease-in-out block text-center whitespace-nowrap opacity-100 transform scale-100 translate-y-0 ${
                    activeTab === 'settings'
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  Settings
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
