import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  loans: [],
  user: {
    iscore: 500,
    total_loans: 0,
    total_repaid: 0,
    total_liquidations: 0,
    on_time_repayments: 0,
    account_created_at: null,
    last_score_update: null
  },
  iScoreHistory: [],
  collateralRatios: {
    300: 200,
    600: 175,
    850: 150,
    1000: 130
  },
  interestRates: {
    300: 12,
    600: 9,
    850: 7,
    1000: 5
  },
  stakingRewards: {
    total: 0,
    earned: 0,
    pending: 0,
    history: []
  },
  proxyAccounts: [],
  rewardDistributions: [],
  loanWarnings: [],
  liquidationThreshold: 1.0,
  warningThreshold: 1.2,
  loading: {
    borrow: false,
    repay: false,
    addCollateral: false,
    fetchLoans: false,
    fetchUser: false
  },
  error: null
}

const borrowingSlice = createSlice({
  name: 'borrowing',
  initialState,
  reducers: {
    setLoans: (state, action) => {
      state.loans = action.payload
    },
    addLoan: (state, action) => {
      state.loans.push(action.payload)
    },
    updateLoan: (state, action) => {
      const index = state.loans.findIndex(l => l.id === action.payload.id)
      if (index !== -1) {
        state.loans[index] = { ...state.loans[index], ...action.payload }
      }
    },
    removeLoan: (state, action) => {
      state.loans = state.loans.filter(l => l.id !== action.payload)
    },
    setUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
    },
    setIScore: (state, action) => {
      state.user.iscore = action.payload
    },
    updateIScore: (state, action) => {
      const { change, reason } = action.payload
      state.user.iscore = Math.max(300, Math.min(1000, state.user.iscore + change))
      state.user.total_loans += 1
      state.user.last_score_update = new Date().toISOString()
      state.iScoreHistory.push({
        score: state.user.iscore,
        change,
        reason,
        timestamp: new Date().toISOString()
      })
    },
    setIScoreHistory: (state, action) => {
      state.iScoreHistory = action.payload
    },
    setStakingRewards: (state, action) => {
      state.stakingRewards = { ...state.stakingRewards, ...action.payload }
    },
    addStakingReward: (state, action) => {
      state.stakingRewards.history.push(action.payload)
      state.stakingRewards.total += action.payload.amount
      state.stakingRewards.earned += action.payload.amount
    },
    setHealthFactors: (state, action) => {
      state.healthFactors = { ...state.healthFactors, ...action.payload }
    },
    updateHealthFactor: (state, action) => {
      const { loanId, healthFactor } = action.payload
      const loanIndex = state.loans.findIndex(l => l.id === loanId)
      if (loanIndex !== -1) {
        state.loans[loanIndex].health_factor = healthFactor
        state.loans[loanIndex].last_health_check = new Date().toISOString()
      }
    },
    setProxyAccounts: (state, action) => {
      state.proxyAccounts = action.payload
    },
    addProxyAccount: (state, action) => {
      state.proxyAccounts.push(action.payload)
    },
    setRewardDistributions: (state, action) => {
      state.rewardDistributions = action.payload
    },
    addRewardDistribution: (state, action) => {
      state.rewardDistributions.push(action.payload)
    },
    setLoanWarnings: (state, action) => {
      state.loanWarnings = action.payload
    },
    addLoanWarning: (state, action) => {
      state.loanWarnings.push(action.payload)
    },
    setLoading: (state, action) => {
      state.loading = { ...state.loading, ...action.payload }
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    // Helper functions for calculations
    getCollateralRatio: (state, action) => {
      const iScore = action.payload || state.user.iscore
      if (iScore >= 1000) return 130
      if (iScore >= 850) return 150
      if (iScore >= 600) return 175
      return 200
    },
    getInterestRate: (state, action) => {
      const iScore = action.payload || state.user.iscore
      if (iScore >= 1000) return 5
      if (iScore >= 850) return 7
      if (iScore >= 600) return 9
      return 12
    }
  }
})

export const {
  setLoans,
  addLoan,
  updateLoan,
  removeLoan,
  setUser,
  setIScore,
  updateIScore,
  setIScoreHistory,
  setStakingRewards,
  addStakingReward,
  updateHealthFactor,
  setProxyAccounts,
  addProxyAccount,
  setRewardDistributions,
  addRewardDistribution,
  setLoanWarnings,
  addLoanWarning,
  setLoading,
  setError,
  clearError,
  getCollateralRatio,
  getInterestRate
} = borrowingSlice.actions

export default borrowingSlice.reducer