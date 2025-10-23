import { configureStore } from '@reduxjs/toolkit'
import walletReducer from './walletSlice'
import networkReducer from './hederaSlice'
import nftReducer from './nftSlice'
import lendingReducer from './lendingSlice'
import borrowingReducer from './borrowingSlice'
import notificationReducer from './notificationSlice'

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    network: networkReducer,
    nft: nftReducer,
    lending: lendingReducer,
    borrowing: borrowingReducer,
    notifications: notificationReducer,
  },
})