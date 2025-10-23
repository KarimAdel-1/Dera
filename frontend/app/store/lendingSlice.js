import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  deposits: [],
  withdrawalRequests: [],
  poolStats: {
    tier1_total: 0,
    tier2_total: 0,
    tier3_total: 0,
    tier1_borrowed: 0,
    tier2_borrowed: 0,
    tier3_borrowed: 0,
    tier1_utilization: 0,
    tier2_utilization: 0,
    tier3_utilization: 0,
    tier1_apy: 4.5,
    tier2_apy: 5.85,
    tier3_apy: 7.65,
    total_volume: 0,
    last_update: null
  },
  earnings: {
    total: 0,
    tier1: 0,
    tier2: 0,
    tier3: 0,
    history: []
  },
  loading: {
    deposit: false,
    withdraw: false,
    fetchDeposits: false
  },
  error: null
}

const lendingSlice = createSlice({
  name: 'lending',
  initialState,
  reducers: {
    setDeposits: (state, action) => {
      state.deposits = action.payload
    },
    addDeposit: (state, action) => {
      state.deposits.push(action.payload)
    },
    updateDeposit: (state, action) => {
      const index = state.deposits.findIndex(d => d.id === action.payload.id)
      if (index !== -1) {
        state.deposits[index] = { ...state.deposits[index], ...action.payload }
      }
    },
    removeDeposit: (state, action) => {
      state.deposits = state.deposits.filter(d => d.id !== action.payload)
    },
    setWithdrawalRequests: (state, action) => {
      state.withdrawalRequests = action.payload
    },
    addWithdrawalRequest: (state, action) => {
      state.withdrawalRequests.push(action.payload)
    },
    updateWithdrawalRequest: (state, action) => {
      const index = state.withdrawalRequests.findIndex(w => w.id === action.payload.id)
      if (index !== -1) {
        state.withdrawalRequests[index] = { ...state.withdrawalRequests[index], ...action.payload }
      }
    },
    setPoolStats: (state, action) => {
      state.poolStats = { ...state.poolStats, ...action.payload }
    },
    updateTierAPY: (state, action) => {
      const { tier, apy } = action.payload
      if (state.poolStats[`tier${tier}`]) {
        state.poolStats[`tier${tier}`].currentAPY = apy
      }
    },
    setEarnings: (state, action) => {
      state.earnings = { ...state.earnings, ...action.payload }
    },
    addEarningsHistory: (state, action) => {
      state.earnings.history.push(action.payload)
    },
    setLoading: (state, action) => {
      state.loading = { ...state.loading, ...action.payload }
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    }
  }
})

export const {
  setDeposits,
  addDeposit,
  updateDeposit,
  removeDeposit,
  setWithdrawalRequests,
  addWithdrawalRequest,
  updateWithdrawalRequest,
  setPoolStats,
  updateTierAPY,
  setEarnings,
  addEarningsHistory,
  setLoading,
  setError,
  clearError
} = lendingSlice.actions

export default lendingSlice.reducer