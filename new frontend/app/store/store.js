import { configureStore } from '@reduxjs/toolkit'
import walletReducer from './walletSlice'
import networkReducer from './hederaSlice'
import nftReducer from './nftSlice'

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    network: networkReducer,
    nft: nftReducer,
  },
})