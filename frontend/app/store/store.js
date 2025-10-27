import { configureStore } from '@reduxjs/toolkit'
import walletReducer from './walletSlice'
import networkReducer from './hederaSlice'
import notificationReducer from './notificationSlice'
import contactsReducer from './contactsSlice'

const loadState = () => {
  try {
    const serializedState = localStorage.getItem('deraLendingState')
    if (serializedState === null) return undefined
    return JSON.parse(serializedState)
  } catch (err) {
    return undefined
  }
}

const saveState = (state) => {
  try {
    const serializedState = JSON.stringify({
      wallet: state.wallet,
      contacts: state.contacts
    })
    localStorage.setItem('deraLendingState', serializedState)
  } catch (err) {}
}

const persistedState = loadState()

export const store = configureStore({
  reducer: {
    wallet: walletReducer,
    network: networkReducer,
    notifications: notificationReducer,
    contacts: contactsReducer,
  },
  preloadedState: persistedState
})

store.subscribe(() => {
  saveState(store.getState())
})