import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    healthFactorWarnings: true,
    withdrawalReady: true,
    stakingRewards: true,
    liquidationAlerts: true,
    emailNotifications: false
  }
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      const notification = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        read: false,
        ...action.payload
      }
      state.notifications.unshift(notification)
      state.unreadCount += 1
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload)
      if (notification && !notification.read) {
        notification.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => n.read = true)
      state.unreadCount = 0
    },
    removeNotification: (state, action) => {
      const index = state.notifications.findIndex(n => n.id === action.payload)
      if (index !== -1) {
        const notification = state.notifications[index]
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
        state.notifications.splice(index, 1)
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = []
      state.unreadCount = 0
    },
    updateSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload }
    },
    // Predefined notification creators
    addHealthFactorWarning: (state, action) => {
      const { loanId, healthFactor } = action.payload
      if (state.settings.healthFactorWarnings) {
        const notification = {
          id: Date.now() + Math.random(),
          type: healthFactor < 1.0 ? 'critical' : 'warning',
          title: healthFactor < 1.0 ? 'Liquidation Risk!' : 'Health Factor Warning',
          message: healthFactor < 1.0 
            ? `Loan ${loanId} is at risk of liquidation (HF: ${healthFactor.toFixed(2)})`
            : `Loan ${loanId} health factor is low (HF: ${healthFactor.toFixed(2)})`,
          actionType: 'ADD_COLLATERAL',
          actionData: { loanId },
          timestamp: new Date().toISOString(),
          read: false
        }
        state.notifications.unshift(notification)
        state.unreadCount += 1
      }
    },
    addWithdrawalReady: (state, action) => {
      const { depositId, amount, tier } = action.payload
      if (state.settings.withdrawalReady) {
        const notification = {
          id: Date.now() + Math.random(),
          type: 'success',
          title: 'Withdrawal Ready',
          message: `Your ${amount} HBAR withdrawal from Tier ${tier} is ready to complete`,
          actionType: 'COMPLETE_WITHDRAWAL',
          actionData: { depositId },
          timestamp: new Date().toISOString(),
          read: false
        }
        state.notifications.unshift(notification)
        state.unreadCount += 1
      }
    },
    addStakingReward: (state, action) => {
      const { amount, loanId } = action.payload
      if (state.settings.stakingRewards) {
        const notification = {
          id: Date.now() + Math.random(),
          type: 'info',
          title: 'Staking Rewards Earned',
          message: `You earned ${amount} HBAR in staking rewards from loan ${loanId}`,
          actionType: 'VIEW_LOAN',
          actionData: { loanId },
          timestamp: new Date().toISOString(),
          read: false
        }
        state.notifications.unshift(notification)
        state.unreadCount += 1
      }
    }
  }
})

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  updateSettings,
  addHealthFactorWarning,
  addWithdrawalReady,
  addStakingReward
} = notificationSlice.actions

export default notificationSlice.reducer