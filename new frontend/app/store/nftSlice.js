import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeTab: 'explore',
  selectedWallet: null,
  searchQuery: '',
  filters: {
    priceRange: { min: 0, max: 10000 },
    category: 'all',
    sortBy: 'newest'
  },
  nfts: [],
  collections: [],
  selectedNft: null,
  isLoading: false,
  chatMessages: [],
  notifications: []
};

const nftSlice = createSlice({
  name: 'nft',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setSelectedWallet: (state, action) => {
      state.selectedWallet = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setNfts: (state, action) => {
      state.nfts = action.payload;
    },
    setCollections: (state, action) => {
      state.collections = action.payload;
    },
    setSelectedNft: (state, action) => {
      state.selectedNft = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    addChatMessage: (state, action) => {
      state.chatMessages.push(action.payload);
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    }
  }
});

export const {
  setActiveTab,
  setSelectedWallet,
  setSearchQuery,
  setFilters,
  setNfts,
  setCollections,
  setSelectedNft,
  setLoading,
  addChatMessage,
  addNotification
} = nftSlice.actions;

export default nftSlice.reducer;