import { createSlice } from '@reduxjs/toolkit';
import { supabaseService } from '../../services/supabaseService';

const initialState = {
  wallets: [],
  defaultWallet: null,
  isConnecting: false,
  isConnected: false,
  error: null,
  tempWallet: null,
  network: 'testnet',
  walletDetails: {
    balance: '$0.00',
    hbarBalance: '0',
    isLoading: false,
    network: 'testnet',
  },
  activeWalletId: null,
  transactions: [],
  transactionStats: {
    received: 0,
    sent: 0,
    total: 0,
    fees: 0,
  },
  isLoadingTransactions: false,
  hbarPrice: 0.05,
  // NEW: Store data for each wallet separately
  walletsData: {}, // { accountId: { balance, balanceUSD, transactions, ... } }
  isFetchingData: false,
  currentUser: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setConnecting: (state, action) => {
      state.isConnecting = action.payload;
    },
    addWallet: (state, action) => {
      const exists = state.wallets.find(
        (w) => w.accountId === action.payload.accountId
      );

      if (!exists) {
        // Create wallet with consistent structure including id property
        const wallet = {
          ...action.payload,
          id: action.payload.id || `${action.payload.walletType || 'hashpack'}_${action.payload.address || action.payload.accountId}`,
          address: action.payload.address || action.payload.accountId,
          connectedAt: action.payload.connectedAt || new Date().toISOString(),
          isDefault: action.payload.isDefault || state.wallets.length === 0,
        };

        state.wallets.push(wallet);

        // Set as default if it's the first wallet
        if (state.wallets.length === 1) {
          state.defaultWallet = wallet.address;
          state.activeWalletId = wallet.id;
        }
      }
    },
    removeWallet: (state, action) => {
      const walletToRemove = state.wallets.find((w) => w.id === action.payload || w.accountId === action.payload);

      state.wallets = state.wallets.filter(
        (w) => w.id !== action.payload && w.accountId !== action.payload
      );

      // Remove wallet data (using accountId for walletsData key)
      if (walletToRemove) {
        delete state.walletsData[walletToRemove.accountId];
      }

      // If removed wallet was default or active, set first wallet as default
      if (state.defaultWallet === walletToRemove?.address || state.activeWalletId === action.payload) {
        const firstWallet = state.wallets[0];
        state.defaultWallet = firstWallet?.address || null;
        state.activeWalletId = firstWallet?.id || null;
      }
    },
    setDefaultWallet: (state, action) => {
      // Update all wallets to not be default
      state.wallets.forEach(wallet => {
        wallet.isDefault = false;
      });

      // Find and set the new default wallet
      const wallet = state.wallets.find((w) => w.id === action.payload);
      if (wallet) {
        wallet.isDefault = true;
        state.defaultWallet = wallet.address;
        state.activeWalletId = wallet.id;
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearWallets: (state) => {
      state.wallets = [];
      state.defaultWallet = null;
      state.activeWalletId = null;
      state.error = null;
      state.walletsData = {};
      state.isConnected = false;
    },
    setNetwork: (state, action) => {
      state.network = action.payload;
    },
    createTempWallet: (state, action) => {
      const { walletType } = action.payload;
      state.tempWallet = {
        id: `temp_${walletType}_${Date.now()}`,
        walletType,
        walletAddress: null,
        walletId: null,
        cardSkin: 'Card-1.png',
        userId: state.currentUser?.id || null,
        connectedAt: null,
        createdAt: new Date().toISOString(),
        isActive: true
      };
    },
    updateTempWallet: (state, action) => {
      if (state.tempWallet) {
        state.tempWallet = { 
          ...state.tempWallet, 
          ...action.payload,
          // Update userId if current user exists and not already set
          userId: action.payload.userId || state.tempWallet.userId || state.currentUser?.id || null
        };
      }
    },
    deleteTempWallet: (state) => {
      state.tempWallet = null;
    },
    connectWallet: (state, action) => {
      state.isConnected = true;
      state.isConnecting = false;
      const wallet = {
        ...action.payload,
        id: `${action.payload.walletType}_${action.payload.address}`,
        connectedAt: new Date().toISOString(),
        isDefault: action.payload.isDefault || state.wallets.length === 0,
      };
      const exists = state.wallets.find((w) => w.address === wallet.address);
      if (!exists) {
        state.wallets.push(wallet);
        if (wallet.isDefault) {
          state.defaultWallet = wallet.address;
          state.activeWalletId = wallet.id;
        }
      }
    },
    disconnectWallet: (state) => {
      state.isConnected = false;
      state.wallets = [];
      state.defaultWallet = null;
      state.walletsData = {};
    },
    setWalletDetails: (state, action) => {
      state.walletDetails = { ...state.walletDetails, ...action.payload };
    },
    setWalletLoading: (state, action) => {
      state.walletDetails.isLoading = action.payload;
    },
    switchWallet: (state, action) => {
      state.activeWalletId = action.payload;
    },
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    updateWallet: (state, action) => {
      const { id, updates } = action.payload;
      const walletIndex = state.wallets.findIndex((w) => w.id === id);
      if (walletIndex !== -1) {
        state.wallets[walletIndex] = {
          ...state.wallets[walletIndex],
          ...updates,
        };
      }
    },
    setTransactionStats: (state, action) => {
      state.transactionStats = { ...state.transactionStats, ...action.payload };
    },
    setTransactionsLoading: (state, action) => {
      state.isLoadingTransactions = action.payload;
    },
    setHbarPrice: (state, action) => {
      state.hbarPrice = action.payload;
    },
    // NEW: Set data for a specific wallet
    setWalletData: (state, action) => {
      const { accountId, data } = action.payload;
      state.walletsData[accountId] = {
        ...state.walletsData[accountId],
        ...data,
        lastUpdated: Date.now(),
      };
    },
    // NEW: Set fetching state for wallet data
    setFetchingData: (state, action) => {
      state.isFetchingData = action.payload;
    },
    // NEW: Clear data for a specific wallet
    clearWalletData: (state, action) => {
      const accountId = action.payload;
      delete state.walletsData[accountId];
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
  },
});

export const {
  setConnecting,
  addWallet,
  removeWallet,
  setDefaultWallet,
  setError,
  clearWallets,
  setNetwork,
  createTempWallet,
  updateTempWallet,
  deleteTempWallet,
  connectWallet,
  disconnectWallet,
  setWalletDetails,
  setWalletLoading,
  switchWallet,
  setTransactions,
  updateWallet,
  setTransactionStats,
  setTransactionsLoading,
  setHbarPrice,
  setWalletData,
  setFetchingData,
  clearWalletData,
  setCurrentUser,
} = walletSlice.actions;

// Async thunk for processing wallet connection with wallet-first check
export const processWalletConnection = (walletAddress, walletData) => async (dispatch) => {
  try {
    console.log('🚀 Starting processWalletConnection:', { walletAddress, walletData });
    
    const result = await supabaseService.processWalletConnection(walletAddress, walletData);
    
    // Set current user
    dispatch(setCurrentUser(result.user));
    
    // Connect wallet with saved settings
    const walletToConnect = {
      address: walletAddress,
      walletType: result.wallet.wallet_type,
      cardSkin: result.wallet.card_skin,
      isDefault: result.wallet.is_default
    };
    
    dispatch(connectWallet(walletToConnect));
    
    console.log('✅ Wallet connection processed successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to process wallet connection:', error);
    throw error;
  }
};

// Legacy method for backward compatibility
export const saveWalletToSupabase = (walletData, uniqueIdentifier = null) => async (dispatch, getState) => {
  try {
    console.log('🚀 Starting saveWalletToSupabase:', { walletData, uniqueIdentifier });
    
    const state = getState();
    let user = state.wallet.currentUser;
    
    // If no current user, create/get user with unique identifier
    if (!user) {
      const identifier = uniqueIdentifier || generateUniqueIdentifier(walletData.address);
      user = await supabaseService.createOrGetUser(identifier);
      dispatch(setCurrentUser(user));
    }
    
    console.log('👤 Using user:', user);
    
    const walletToSave = {
      ...walletData,
      walletId: walletData.address,
      connectedAt: new Date().toISOString()
    };
    
    console.log('💾 About to save wallet:', walletToSave);
    
    const savedWallet = await supabaseService.saveWallet(user.id, walletToSave);
    
    console.log('✅ Wallet saved to Supabase successfully:', savedWallet);
  } catch (error) {
    console.error('❌ Failed to save wallet to Supabase:', error);
    console.error('Error details:', error.message, error.details, error.hint);
  }
};

// Async thunk for loading wallets from Supabase
export const loadWalletsFromSupabase = (uniqueIdentifier) => async (dispatch) => {
  try {
    const user = await supabaseService.createOrGetUser(uniqueIdentifier);
    dispatch(setCurrentUser(user));
    
    const wallets = await supabaseService.getUserWallets(user.id);
    
    wallets.forEach(wallet => {
      dispatch(connectWallet({
        address: wallet.wallet_address,
        walletType: wallet.wallet_type,
        cardSkin: wallet.card_skin,
        isDefault: wallet.is_default
      }));
    });
    
    console.log('Wallets loaded from Supabase successfully');
  } catch (error) {
    console.error('Failed to load wallets from Supabase:', error);
  }
};

// Async thunk for setting default wallet in database
export const setDefaultWalletInDB = (walletId) => async (dispatch, getState) => {
  try {
    const state = getState();
    const user = state.wallet.currentUser;
    const wallet = state.wallet.wallets.find(w => w.id === walletId);
    
    if (user && wallet) {
      await supabaseService.setDefaultWallet(user.id, wallet.address);
      dispatch(setDefaultWallet(walletId));
    }
  } catch (error) {
    console.error('Failed to set default wallet in database:', error);
  }
};

// Helper to generate unique identifier
export const generateUniqueIdentifier = (walletAddress) => {
  return `user_${walletAddress}`;
};

export default walletSlice.reducer;
