import React, { useState } from 'react';
import { User, Shield, Bell, Palette, Globe } from 'lucide-react';
import { LogoutButton } from '../../auth/LogoutButton';

const SettingsTab = () => {
  const [activeTab, setActiveTab] = useState('profile');
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-6">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-start px-4 py-3 rounded-lg transition-all ${activeTab === 'profile' ? 'bg-[var(--color-primary-opacity)] text-[var(--color-primary)] border-s-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              <span className="text-[14px]">Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full text-start px-4 py-3 rounded-lg transition-all ${activeTab === 'security' ? 'bg-[var(--color-primary-opacity)] text-[var(--color-primary)] border-s-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              <span className="text-[14px]">Security</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-start px-4 py-3 rounded-lg transition-all ${activeTab === 'notifications' ? 'bg-[var(--color-primary-opacity)] text-[var(--color-primary)] border-s-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              <span className="text-[14px]">Notifications</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full text-start px-4 py-3 rounded-lg transition-all ${activeTab === 'preferences' ? 'bg-[var(--color-primary-opacity)] text-[var(--color-primary)] border-s-2 border-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'}`}
            >
              <span className="text-[14px]">Preferences</span>
            </button>
          </div>
          <div className="mt-8 pt-8 border-t border-[var(--color-border-primary)] space-y-2">
            <button className="w-full text-start px-4 py-3 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-all">
              <div className="flex items-center gap-3">
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
                  className="lucide lucide-circle-question-mark w-4 h-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <path d="M12 17h.01"></path>
                </svg>
                <span className="text-[14px]">Help & Support</span>
              </div>
            </button>
            {/* <button className="w-full text-start px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out w-4 h-4" aria-hidden="true">
                  <path d="m16 17 5-5-5-5"></path>
                  <path d="M21 12H9"></path>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                </svg>
                <span className="text-[14px]">Sign Out</span>
              </div>
            </button> */}
            <LogoutButton />
          </div>
        </div>
        <div className="lg:col-span-3 bg-[var(--color-bg-secondary)] rounded-[20px] border border-[var(--color-border-primary)] p-6">
          <h3 className="text-[var(--color-text-primary)] text-[20px] font-normal mb-6">
            Profile
          </h3>
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[#ff0f80] flex items-center justify-center overflow-hidden">
                  <span className="text-white text-[28px] font-normal">AM</span>
                </div>
                <button className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="lucide lucide-camera w-6 h-6 text-white"
                    aria-hidden="true"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                    <circle cx="12" cy="13" r="3"></circle>
                  </svg>
                </button>
                <input accept="image/*" className="hidden" type="file" />
              </div>
              <div className="flex-1">
                <h3 className="text-[var(--color-text-primary)] text-[20px] font-normal">
                  Alexander Munoz
                </h3>
                <p className="text-[var(--color-text-muted)] text-[14px]">
                  alexander.munoz@example.com
                </p>
              </div>
              <button
                data-slot="button"
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 h-8 rounded-md gap-1.5 px-3"
              >
                Change Photo
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-[var(--color-text-muted)]">
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
                    className="lucide lucide-user w-5 h-5"
                    aria-hidden="true"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-[var(--color-text-primary)]">
                    Personal Information
                  </h3>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                    Manage your basic profile information
                  </p>
                </div>
              </div>
              <div className="space-y-4 ps-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                        First Name
                      </label>
                    </div>
                    <div className="w-full">
                      <input
                        className="flex w-full rounded-lg border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--color-bg-input)] border-[var(--color-border-input)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]/50 h-10 px-4 py-2 text-[14px]"
                        placeholder="Alexander"
                        defaultValue="Alexander"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                        Last Name
                      </label>
                    </div>
                    <div className="w-full">
                      <input
                        className="flex w-full rounded-lg border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--color-bg-input)] border-[var(--color-border-input)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]/50 h-10 px-4 py-2 text-[14px]"
                        placeholder="Munoz"
                        defaultValue="Munoz"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      Email
                    </label>
                  </div>
                  <div className="w-full">
                    <input
                      className="flex w-full rounded-lg border transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 bg-[var(--color-bg-input)] border-[var(--color-border-input)] text-[var(--color-text-primary)] focus:border-[var(--color-primary)]/50 h-10 px-4 py-2 text-[14px]"
                      placeholder="alexander.munoz@example.com"
                      type="email"
                      defaultValue="alexander.munoz@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      Phone
                    </label>
                  </div>
                  <div className="w-full">
                    <div className="relative">
                      <div className="flex">
                        <button
                          data-slot="popover-trigger"
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 py-2 h-10 border-r-0 rounded-r-none px-3 hover:bg-[var(--color-bg-hover)]"
                          type="button"
                          aria-haspopup="dialog"
                          aria-expanded="false"
                        >
                          <div className="w-5 h-4 flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 513 342"
                            >
                              <title>US</title>
                              <path fill="#FFF" d="M0 0h513v342H0z"></path>
                              <path
                                d="M0 0h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.7h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513V342H0z"
                                fill="#D80027"
                              ></path>
                              <path
                                fill="#2E52B2"
                                d="M0 0h256.5v184.1H0z"
                              ></path>
                            </svg>
                          </div>
                          <span className="text-sm text-[var(--color-text-secondary)]">
                            +1
                          </span>
                        </button>
                        <div className="flex-1 relative">
                          <input
                            placeholder="Enter your phone number"
                            className="flex w-full h-10 px-4 py-2 text-[14px] bg-[var(--color-bg-input)] border border-[var(--color-border-input)] text-[var(--color-text-primary)] transition-colors rounded-l-none rounded-r-lg placeholder:text-[var(--color-text-placeholder)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--color-primary)]/50"
                            type="tel"
                            defaultValue=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      Country
                    </label>
                  </div>
                  <div className="w-full">
                    <button
                      data-slot="popover-trigger"
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 px-4 py-2 w-full justify-between h-10"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-4 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 513 342"
                          >
                            <title>US</title>
                            <path fill="#FFF" d="M0 0h513v342H0z"></path>
                            <path
                              d="M0 0h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513v26.3H0zm0 52.7h513v26.3H0zm0 52.6h513v26.3H0zm0 52.6h513V342H0z"
                              fill="#D80027"
                            ></path>
                            <path fill="#2E52B2" d="M0 0h256.5v184.1H0z"></path>
                          </svg>
                        </div>
                        <span>United States</span>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      Date of Birth
                    </label>
                  </div>
                  <div className="w-full">
                    <button
                      data-slot="popover-trigger"
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-offset-0 border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] shadow-xs hover:bg-[var(--color-bg-card)]/70 hover:text-[var(--color-text-primary)] focus-visible:ring-[var(--color-primary)]/20 px-4 py-2 w-full justify-start text-left font-normal h-10 text-[var(--color-text-placeholder)]"
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded="false"
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
                        className="lucide lucide-calendar mr-2 h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M8 2v4"></path>
                        <path d="M16 2v4"></path>
                        <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                        <path d="M3 10h18"></path>
                      </svg>
                      <span>Select your date of birth</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  data-slot="button"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/20 focus-visible:ring-offset-0 bg-[var(--color-primary)] text-white shadow-xs hover:bg-[var(--color-primary)]/90 h-9 px-4 py-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
