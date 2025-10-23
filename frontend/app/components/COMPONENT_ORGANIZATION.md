# Component Organization

This document describes the new organized structure of the components directory.

## Directory Structure

```
components/
├── auth/              # Authentication & Connection Components
├── common/            # Reusable UI Components
├── features/          # Feature-specific Components
│   ├── analytics/     # Analytics & Portfolio
│   ├── dashboard/     # Dashboard Tab & Components
│   ├── hedera-stats/  # Hedera Network Statistics
│   ├── lending-borrowing/  # Lending & Borrowing Features
│   ├── marketplace/   # NFT Marketplace
│   ├── nft/           # NFT Components
│   ├── settings/      # Settings Tab
│   ├── transactions/  # Transaction History
│   └── wallets/       # Wallet Management
└── layout/            # Layout Components (Navigation)
```

## Categories

### 1. **auth/** - Authentication & Connection
Components related to wallet authentication and connection management.

- `AuthButton.jsx` - Main authentication button
- `HashConnectClient.jsx` - HashConnect integration
- `LogoutButton.jsx` - Logout functionality
- `ReconnectHelper.jsx` - Reconnection helper utilities

### 2. **common/** - Reusable UI Components
Generic, reusable UI components used across the application.

- `Calendar.jsx` - Calendar component
- `DateRangePicker.jsx` - Date range selection
- `NotificationPanel.jsx` - Notification system
- `SkeletonLoaders.jsx` - Loading state skeletons
- `WalletModal.jsx` - Generic wallet modal

### 3. **layout/** - Navigation & Layout
Components that define the application's layout structure.

- `Footer.jsx` - Application footer
- `Header.jsx` - Page header
- `Navbar.jsx` - Main navigation bar
- `Sidebar.jsx` - Sidebar navigation

### 4. **features/** - Feature-specific Components
Components organized by application features.

#### **features/analytics/**
- `PortfolioOverview.jsx` - Portfolio analytics and overview

#### **features/dashboard/**
Main dashboard components and sections.
- `DashboardTab.jsx` - Main dashboard tab
- `DashboardHeader.jsx` - Dashboard header
- `SidebarSection.jsx` - Dashboard sidebar
- `StatisticsSection.jsx` - Statistics display
- `TransactionsSection.jsx` - Transactions section
- `WalletSection.jsx` - Wallet section

#### **features/hedera-stats/**
Hedera network statistics and monitoring.
- `HederaStatsTab.jsx` - Main stats tab
- `HederaStatsSkeleton.jsx` - Loading skeleton
- `NetworkPerformanceCards.jsx` - Network performance metrics
- `OverviewCards.jsx` - Network overview cards
- `TransactionStatsCards.jsx` - Transaction statistics
- `TransactionTypeChart.jsx` - Transaction type visualization

#### **features/lending-borrowing/**
DeFi lending and borrowing functionality.
- `LendingBorrowingTab.jsx` - Main tab
- `LendTab.jsx` - Lending interface
- `BorrowTab.jsx` - Borrowing interface
- `DepositForm.jsx` - Deposit form
- `WithdrawalForm.jsx` - Withdrawal form
- `BorrowForm.jsx` - Borrow form
- `RepaymentForm.jsx` - Repayment form
- `MyDeposits.jsx` - User deposits list
- `MyLoans.jsx` - User loans list
- `EarningsDisplay.jsx` - Earnings display
- `CollateralCalculator.jsx` - Collateral calculator
- `HealthFactorMonitor.jsx` - Health factor monitoring
- `IScoreDisplay.jsx` - Interest score display
- `LoanInterestTracker.jsx` - Loan interest tracker
- `StakingRewardsDisplay.jsx` - Staking rewards
- `TierSelector.jsx` - Tier selection
- `WithdrawalRequestTracker.jsx` - Withdrawal tracking

#### **features/marketplace/**
NFT marketplace functionality.
- `MarketplaceTab.jsx` - Main marketplace tab

#### **features/nft/**
NFT creation, viewing, and management.
- `NFTCard.jsx` - NFT card component
- `NFTCollections.jsx` - Collections view
- `NFTCreate.jsx` - NFT creation form
- `NFTExplore.jsx` - Explore NFTs
- `NFTLaunchpad.jsx` - NFT launchpad
- `NFTMessages.jsx` - NFT messaging
- `WalletSelector.jsx` - Wallet selection for NFTs

#### **features/settings/**
Application settings and configuration.
- `SettingsTab.jsx` - Settings interface

#### **features/transactions/**
Transaction history and management.
- `TransactionsTab.jsx` - Main transactions tab
- `TransactionTable.jsx` - Desktop table view
- `TransactionList.jsx` - Mobile list view
- `TransactionModal.jsx` - Transaction details modal
- `TransactionStatsCards.jsx` - Transaction statistics
- `TransactionFilters.jsx` - Filter controls
- `WalletFilterDropdown.jsx` - Wallet filter
- `Pagination.jsx` - Pagination controls

#### **features/wallets/**
Wallet management and connection.
- `YourWalletsTab.jsx` - Main wallets tab
- `WalletCard.jsx` - Wallet card component
- `WalletDetails.jsx` - Wallet details view
- `WalletStatsCards.jsx` - Wallet statistics
- `ConnectWalletModal.jsx` - Wallet connection modal
- `ConnectedWalletConfirmation.jsx` - Connection confirmation
- `WalletConnectionButtons.jsx` - Connection buttons
- `CardSkinSelector.jsx` - Card appearance selector
- `AssetsModal.jsx` - Token/NFT assets view
- `EmptyWalletState.jsx` - Empty state component

## Import Path Updates

When importing components, use the new paths:

### Before
```jsx
import Sidebar from '../components/Sidebar';
import DashboardTab from '../components/DashboardTab';
import { AuthButton } from '../components/AuthButton';
```

### After
```jsx
import Sidebar from '../components/layout/Sidebar';
import DashboardTab from '../components/features/dashboard/DashboardTab';
import { AuthButton } from '../components/auth/AuthButton';
```

## Benefits

1. **Clear Organization**: Components are grouped by purpose and domain
2. **Easier Navigation**: Find components quickly by category
3. **Better Scalability**: Easy to add new components in the right place
4. **Improved Maintainability**: Related components are co-located
5. **Feature-based Structure**: Follows modern React best practices

## Guidelines

When adding new components:

1. **Layout components** → `layout/`
2. **Authentication/connection** → `auth/`
3. **Generic reusable UI** → `common/`
4. **Feature-specific** → `features/<feature-name>/`
5. **Always update imports** when moving components
6. **Keep feature folders focused** on a single domain

## Migration Complete

All components have been successfully reorganized. All import paths have been updated throughout the application.
