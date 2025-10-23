import { useDispatch } from 'react-redux'
import { 
  addLoan, 
  updateLoan, 
  updateIScore, 
  addStakingReward, 
  updateHealthFactor,
  setLoading, 
  setError 
} from '../store/borrowingSlice'
import { addNotification, addHealthFactorWarning } from '../store/notificationSlice'
import { apiService } from '../../services/apiService'

export const useBorrowingActions = () => {
  const dispatch = useDispatch()

  const borrow = async (collateralAmount, borrowAmount, interestRate, walletId) => {
    try {
      dispatch(setLoading({ borrow: true }))
      
      // TODO: Replace with actual API call
      const mockLoan = {
        id: `loan_${Date.now()}`,
        borrowed: borrowAmount.toString(),
        collateral: collateralAmount.toString(),
        totalDebt: borrowAmount.toString(),
        interestRate,
        healthFactor: (parseFloat(collateralAmount) * 0.8) / parseFloat(borrowAmount), // 80% LTV
        stakingRewards: '0',
        createdAt: new Date().toISOString(),
        status: 'active',
        walletId
      }
      
      dispatch(addLoan(mockLoan))
      dispatch(addNotification({
        type: 'success',
        title: 'Loan Created',
        message: `Successfully borrowed ${borrowAmount} HBAR with ${collateralAmount} HBAR collateral`
      }))
      
      return mockLoan
    } catch (error) {
      dispatch(setError(error.message))
      dispatch(addNotification({
        type: 'error',
        title: 'Borrow Failed',
        message: error.message
      }))
      throw error
    } finally {
      dispatch(setLoading({ borrow: false }))
    }
  }

  const repayLoan = async (loanId, repayAmount, isFullRepayment = false) => {
    try {
      dispatch(setLoading({ repay: true }))
      
      // TODO: Replace with actual API call
      if (isFullRepayment) {
        dispatch(updateLoan({ 
          id: loanId, 
          status: 'repaid',
          totalDebt: '0'
        }))
        
        // Improve iScore on successful repayment
        dispatch(updateIScore({ 
          change: 10, 
          reason: 'Loan repaid successfully' 
        }))
        
        dispatch(addNotification({
          type: 'success',
          title: 'Loan Repaid',
          message: 'Loan fully repaid! Collateral will be returned with staking rewards.'
        }))
      } else {
        // Partial repayment
        dispatch(addNotification({
          type: 'success',
          title: 'Payment Processed',
          message: `Successfully repaid ${repayAmount} HBAR`
        }))
      }
    } catch (error) {
      dispatch(setError(error.message))
      dispatch(addNotification({
        type: 'error',
        title: 'Repayment Failed',
        message: error.message
      }))
      throw error
    } finally {
      dispatch(setLoading({ repay: false }))
    }
  }

  const addCollateral = async (loanId, collateralAmount) => {
    try {
      dispatch(setLoading({ addCollateral: true }))
      
      // TODO: Replace with actual API call
      dispatch(addNotification({
        type: 'success',
        title: 'Collateral Added',
        message: `Successfully added ${collateralAmount} HBAR collateral`
      }))
    } catch (error) {
      dispatch(setError(error.message))
      throw error
    } finally {
      dispatch(setLoading({ addCollateral: false }))
    }
  }

  const checkHealthFactor = (loanId, currentHealthFactor) => {
    dispatch(updateHealthFactor({ loanId, healthFactor: currentHealthFactor }))
    
    if (currentHealthFactor < 1.2) {
      dispatch(addHealthFactorWarning({ loanId, healthFactor: currentHealthFactor }))
    }
  }

  const distributeStakingRewards = (loanId, totalRewards) => {
    const borrowerShare = totalRewards * 0.4 // 40% to borrower
    
    dispatch(addStakingReward({
      loanId,
      amount: borrowerShare,
      timestamp: new Date().toISOString(),
      type: 'staking_reward'
    }))
    
    dispatch(addNotification({
      type: 'info',
      title: 'Staking Rewards',
      message: `Earned ${borrowerShare.toFixed(4)} HBAR in staking rewards`
    }))
  }

  return {
    borrow,
    repayLoan,
    addCollateral,
    checkHealthFactor,
    distributeStakingRewards
  }
}