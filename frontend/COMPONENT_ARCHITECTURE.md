# Component Architecture & Best Practices

This document outlines the component architecture and best practices implemented in the Dera frontend application.

## Table of Contents
1. [Overview](#overview)
2. [Component Structure](#component-structure)
3. [Custom Hooks](#custom-hooks)
4. [State Management](#state-management)
5. [Best Practices](#best-practices)
6. [File Organization](#file-organization)

---

## Overview

The frontend has been refactored to follow React best practices with:
- ✅ **Component Composition**: Breaking large components into smaller, reusable pieces
- ✅ **Custom Hooks**: Separating business logic from UI components
- ✅ **Single Responsibility**: Each component has one clear purpose
- ✅ **Prop Drilling Reduction**: Using hooks to access state efficiently
- ✅ **Code Reusability**: Shared components across features
- ✅ **Improved Maintainability**: Easier to test, debug, and update

---

## Component Structure

### 1. YourWalletsTab (Already Refactored)

**Main Component**: `app/components/YourWalletsTab.jsx`

**Sub-components**:
- `app/components/wallet/WalletStatsCards.jsx` - Statistics overview cards
- `app/components/wallet/WalletCard.jsx` - Individual wallet card display
- `app/components/wallet/WalletDetails.jsx` - Detailed wallet information panel

**Purpose**: Display and manage connected wallets with their balances and details.

---

### 2. TransactionsTab (Refactored)

**Main Component**: `app/components/TransactionsTab.jsx` (180 lines → clean, focused)

**Sub-components**:
```
app/components/transactions/
├── TransactionStatsCards.jsx      # Total received, sent, net balance, fees
├── WalletFilterDropdown.jsx       # Filter transactions by wallet
├── TransactionFilters.jsx         # Search and quick filter pills
├── TransactionTable.jsx           # Desktop table view
├── TransactionList.jsx            # Mobile card view
├── TransactionModal.jsx           # Transaction details modal
└── Pagination.jsx                 # Pagination controls
```

**Custom Hook**: `app/hooks/useTransactions.js`
- Handles data fetching
- Manages filtering and search
- Calculates statistics
- Handles pagination logic

**Benefits**:
- **Before**: 1,046 lines in single file ❌
- **After**: 180 lines main + 7 focused components ✅
- **Improved Testing**: Each component can be tested independently
- **Reusability**: Components can be used elsewhere
- **Maintainability**: Easier to find and fix bugs

---

### 3. HederaStatsTab (Refactored)

**Main Component**: `app/components/HederaStatsTab.jsx` (119 lines → clean, focused)

**Sub-components**:
```
app/components/hedera/
├── OverviewCards.jsx               # Network overview statistics
├── NetworkPerformanceCards.jsx     # Performance metrics with gauges
├── TransactionStatsCards.jsx       # Transaction count statistics
└── TransactionTypeChart.jsx        # Bar chart for transaction types
```

**Custom Hook**: `app/hooks/useHederaStats.js`
- Fetches network data
- Auto-refreshes every 5 minutes
- Manages timeframe selection
- Handles error states

**Benefits**:
- **Before**: 386 lines mixing UI and logic ❌
- **After**: 119 lines main + 4 focused components ✅
- **Separation of Concerns**: UI and logic separated
- **Easier Updates**: Change data fetching without touching UI

---

## Custom Hooks

### useTransactions.js

**Location**: `app/hooks/useTransactions.js`

**Responsibilities**:
- Load wallets from database
- Fetch HBAR price from CoinGecko
- Fetch wallet transaction data from Hedera
- Filter and search transactions
- Calculate transaction statistics
- Handle pagination

**Exported Values**:
```javascript
{
  // Data
  wallets,
  allTransactions,
  filteredTransactions,
  paginatedTransactions,
  statistics: {
    totalReceived,
    totalSent,
    netBalance,
    totalFees
  },
  hbarPriceUSD,
  isLoading,

  // Filters
  searchTerm,
  setSearchTerm,
  selectedFilter,
  setSelectedFilter,
  selectedWalletFilter,
  setSelectedWalletFilter,

  // Pagination
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex,

  // Helpers
  getTransactionType,
  getTransactionAmount,
}
```

**Usage Example**:
```javascript
const TransactionsTab = () => {
  const {
    paginatedTransactions,
    statistics,
    isLoading,
    searchTerm,
    setSearchTerm,
  } = useTransactions();

  // Component focuses on rendering, not logic
  return (
    <div>
      <TransactionStatsCards statistics={statistics} />
      <TransactionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />
    </div>
  );
};
```

---

### useHederaStats.js

**Location**: `app/hooks/useHederaStats.js`

**Responsibilities**:
- Fetch network overview data
- Fetch ecosystem metrics
- Fetch transaction type data
- Auto-refresh every 5 minutes
- Handle timeframe changes
- Manage loading and error states

**Exported Values**:
```javascript
{
  // Data
  overview: {
    networkFees,
    newAccounts1h,
    activeAccounts1h,
    hbarUSD,
    hederaTVL,
    stablecoinMC
  },
  performance: {
    avgTTC,
    tps
  },
  transactions: {
    totalTx,
    newTx1h,
    perType,
    newPerType
  },
  transactionTab,
  transactionTimeframe,
  timeframe,
  formattedTime,
  isLoading,
  error,

  // Actions
  handleRefresh,
  handleTimeframeChange,
  handleTransactionTimeframeChange,
  handleTransactionTabChange,
}
```

---

## State Management

### Redux Slices

**wallet Slice** (`app/store/walletSlice.js`):
- Manages connected wallets
- Stores wallet balances and transactions
- Handles HBAR price

**network Slice** (`app/store/hederaSlice.js`):
- Hedera network statistics
- Transaction data
- Performance metrics

**Best Practices Used**:
1. ✅ **Redux for Global State**: Wallets, network data
2. ✅ **Local State for UI**: Modals, dropdowns, search inputs
3. ✅ **Derived State in useMemo**: Filtered data, calculations
4. ✅ **Custom Hooks for Complex Logic**: Encapsulated in `useTransactions`, `useHederaStats`

---

## Best Practices

### 1. Component Composition

**❌ Bad** - Monolithic component:
```javascript
const TransactionsTab = () => {
  // 1000+ lines of mixed UI and logic
  return (
    <div>
      {/* Inline stat cards */}
      {/* Inline filters */}
      {/* Inline table */}
      {/* Inline modal */}
    </div>
  );
};
```

**✅ Good** - Composed from smaller components:
```javascript
const TransactionsTab = () => {
  const { statistics, isLoading } = useTransactions();

  return (
    <div>
      <TransactionStatsCards statistics={statistics} isLoading={isLoading} />
      <TransactionFilters {...filterProps} />
      <TransactionTable {...tableProps} />
      <TransactionModal {...modalProps} />
    </div>
  );
};
```

---

### 2. Custom Hooks for Logic

**❌ Bad** - Logic mixed with UI:
```javascript
const TransactionsTab = () => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    // Complex data fetching logic
    // Filtering logic
    // Pagination logic
  }, [/* dependencies */]);

  return <div>{/* UI */}</div>;
};
```

**✅ Good** - Logic in custom hook:
```javascript
// Hook handles all logic
const useTransactions = () => {
  // All data fetching, filtering, pagination
  return { transactions, /* ... */ };
};

// Component focuses on UI
const TransactionsTab = () => {
  const { transactions } = useTransactions();
  return <div>{/* UI */}</div>;
};
```

---

### 3. Prop Drilling Prevention

**❌ Bad** - Prop drilling:
```javascript
<Parent>
  <Child level={level} onLevelChange={onChange} />
    <GrandChild level={level} onLevelChange={onChange} />
      <GreatGrandChild level={level} onLevelChange={onChange} />
    </GrandChild>
  </Child>
</Parent>
```

**✅ Good** - Use hooks:
```javascript
// Each component gets data from hook
const ChildComponent = () => {
  const { level, onChange } = useHederaStats();
  // No prop drilling needed
};
```

---

### 4. Single Responsibility

Each component has one clear purpose:

- `TransactionStatsCards` - Display statistics only
- `TransactionFilters` - Handle filtering UI only
- `TransactionTable` - Display table view only
- `TransactionModal` - Show transaction details only

**Benefits**:
- Easy to test
- Easy to update
- Easy to reuse
- Clear naming

---

### 5. Responsive Design

**Desktop and Mobile Views**:
```javascript
// Desktop view
<TransactionTable transactions={...} />  // Hidden on mobile

// Mobile view
<TransactionList transactions={...} />    // Hidden on desktop
```

**Benefits**:
- Separate components for each view
- Easier to optimize for each platform
- Better code organization

---

### 6. Performance Optimization

**useMemo for Expensive Calculations**:
```javascript
const filteredTransactions = useMemo(() => {
  return allTransactions.filter(/* filter logic */);
}, [allTransactions, searchTerm, selectedFilter]);
```

**useCallback for Event Handlers**:
```javascript
const handleClick = useCallback((id) => {
  // Handler logic
}, [/* dependencies */]);
```

**Pagination to Limit Rendering**:
- Only render 10 transactions per page
- Reduces DOM nodes
- Improves performance

---

## File Organization

```
frontend/
├── app/
│   ├── components/
│   │   ├── YourWalletsTab.jsx           # Main wallet tab
│   │   ├── TransactionsTab.jsx          # Main transactions tab
│   │   ├── HederaStatsTab.jsx           # Main Hedera stats tab
│   │   │
│   │   ├── wallet/                      # Wallet sub-components
│   │   │   ├── WalletStatsCards.jsx
│   │   │   ├── WalletCard.jsx
│   │   │   └── WalletDetails.jsx
│   │   │
│   │   ├── transactions/                # Transaction sub-components
│   │   │   ├── TransactionStatsCards.jsx
│   │   │   ├── WalletFilterDropdown.jsx
│   │   │   ├── TransactionFilters.jsx
│   │   │   ├── TransactionTable.jsx
│   │   │   ├── TransactionList.jsx
│   │   │   ├── TransactionModal.jsx
│   │   │   └── Pagination.jsx
│   │   │
│   │   ├── hedera/                      # Hedera stats sub-components
│   │   │   ├── OverviewCards.jsx
│   │   │   ├── NetworkPerformanceCards.jsx
│   │   │   ├── TransactionStatsCards.jsx
│   │   │   └── TransactionTypeChart.jsx
│   │   │
│   │   ├── lend/                        # Lending components (already exists)
│   │   ├── borrow/                      # Borrowing components (already exists)
│   │   └── analytics/                   # Analytics components (already exists)
│   │
│   ├── hooks/                           # Custom hooks
│   │   ├── useTransactions.js           # Transaction data and logic
│   │   ├── useHederaStats.js            # Hedera stats data and logic
│   │   ├── useLendingActions.js         # Lending actions (already exists)
│   │   └── useBorrowingActions.js       # Borrowing actions (already exists)
│   │
│   └── store/                           # Redux slices
│       ├── walletSlice.js               # Wallet state
│       ├── hederaSlice.js               # Network state
│       ├── lendingSlice.js              # Lending state (already exists)
│       ├── borrowingSlice.js            # Borrowing state (already exists)
│       └── store.js                     # Store configuration
│
└── services/                            # API services
    ├── hederaService.js
    ├── priceService.js
    └── supabaseService.js
```

---

## Component Guidelines

### When to Create a New Component

Create a new component when:
1. ✅ Code block exceeds 50-100 lines
2. ✅ Logic can be reused elsewhere
3. ✅ Component has a single, clear responsibility
4. ✅ Component can be tested independently
5. ✅ Component improves readability

### Naming Conventions

- **Components**: PascalCase (e.g., `TransactionStatsCards.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTransactions.js`)
- **Props**: camelCase (e.g., `onSearchChange`, `isLoading`)
- **Event Handlers**: `handle` prefix (e.g., `handleClick`, `handleRefresh`)

### Component Documentation

Each component file should have:
```javascript
/**
 * Brief description of what the component does
 *
 * @param {Object} props - Component props
 * @param {Array} props.transactions - Array of transaction objects
 * @param {Function} props.onTransactionClick - Callback when transaction is clicked
 */
const TransactionTable = ({ transactions, onTransactionClick }) => {
  // Component implementation
};
```

---

## Testing Strategy

### Component Testing

Each component can be tested independently:

```javascript
// TransactionStatsCards.test.js
import { render, screen } from '@testing-library/react';
import TransactionStatsCards from './TransactionStatsCards';

test('displays correct total received amount', () => {
  const statistics = {
    totalReceived: 100.50,
    totalSent: 50.25,
    netBalance: 50.25,
    totalFees: 0.05
  };

  render(<TransactionStatsCards statistics={statistics} />);
  expect(screen.getByText('100.50 HBAR')).toBeInTheDocument();
});
```

### Hook Testing

Custom hooks can be tested with `@testing-library/react-hooks`:

```javascript
// useTransactions.test.js
import { renderHook } from '@testing-library/react-hooks';
import { useTransactions } from './useTransactions';

test('filters transactions by search term', () => {
  const { result } = renderHook(() => useTransactions());

  act(() => {
    result.current.setSearchTerm('0.0.12345');
  });

  expect(result.current.filteredTransactions).toHaveLength(expected);
});
```

---

## Migration Path

If you need to refactor other components, follow this pattern:

### Step 1: Identify Responsibilities
```
Original Component:
- Data fetching ✅
- State management ✅
- Filtering logic ✅
- UI rendering ✅
- Event handling ✅
```

### Step 2: Extract Logic to Hook
```javascript
// Create custom hook
const useYourFeature = () => {
  // Move data fetching here
  // Move state management here
  // Move complex logic here
  return { data, isLoading, handlers };
};
```

### Step 3: Break UI into Components
```javascript
// Extract stat cards
<FeatureStatsCards stats={stats} />

// Extract filters
<FeatureFilters onFilterChange={...} />

// Extract table/list
<FeatureTable data={data} />
```

### Step 4: Refactor Main Component
```javascript
const YourFeatureTab = () => {
  const { data, isLoading, handlers } = useYourFeature();

  return (
    <div>
      <FeatureStatsCards {...} />
      <FeatureFilters {...} />
      <FeatureTable {...} />
    </div>
  );
};
```

---

## Benefits Achieved

### Maintainability
- ✅ Easier to find and fix bugs
- ✅ Clear separation of concerns
- ✅ Self-documenting code structure

### Testability
- ✅ Each component testable independently
- ✅ Hooks testable separately from UI
- ✅ Easier to mock dependencies

### Reusability
- ✅ Components can be used in multiple places
- ✅ Hooks can be shared across features
- ✅ Reduced code duplication

### Performance
- ✅ useMemo prevents unnecessary recalculations
- ✅ Component memoization possible
- ✅ Smaller re-render footprint

### Developer Experience
- ✅ Easier onboarding for new developers
- ✅ Clear file organization
- ✅ Better IDE autocomplete
- ✅ Faster development speed

---

## Questions or Feedback?

For questions about this architecture or suggestions for improvements, please create an issue or reach out to the team.

**Happy coding! 🚀**
