'use client'

import { Provider } from 'react-redux'
import { store } from './store/store'
import { HashConnectClient } from './components/auth/HashConnectClient'

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <HashConnectClient />
      {children}
    </Provider>
  )
}