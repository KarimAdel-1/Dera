import { useDispatch } from 'react-redux'
import { 
  addDeposit, 
  addWithdrawalRequest, 
  updateDeposit, 
  setLoading, 
  setError 
} from '../store/lendingSlice'
import { addNotification, addWithdrawalReady } from '../store/notificationSlice'
import { apiService } from '../../services/apiService'

export const useLendingActions = () => {
  const dispatch = useDispatch()

  const deposit = async (tier, amount, walletId) => {
    try {
      dispatch(setLoading({ deposit: true }))
      
      // TODO: Replace with actual API call
      const mockDeposit = {
        id: Date.now(),
        tier,
        tierName: `Tier ${tier} - ${tier === 1 ? 'Instant' : tier === 2 ? '30-Day Notice' : '90-Day Locked'}`,
        amount: amount.toString(),
        balance: amount.toString(),
        apy: tier === 1 ? 4.5 : tier === 2 ? 5.85 : 7.65,
        earned: '0',
        createdAt: new Date().toISOString(),
        walletId
      }
      
      dispatch(addDeposit(mockDeposit))
      dispatch(addNotification({
        type: 'success',
        title: 'Deposit Successful',
        message: `Successfully deposited ${amount} HBAR to ${mockDeposit.tierName}`
      }))
      
      return mockDeposit
    } catch (error) {
      dispatch(setError(error.message))
      dispatch(addNotification({
        type: 'error',
        title: 'Deposit Failed',
        message: error.message
      }))
      throw error
    } finally {
      dispatch(setLoading({ deposit: false }))
    }
  }

  const withdraw = async (depositId, amount, tier) => {
    try {
      dispatch(setLoading({ withdraw: true }))
      
      if (tier === 1) {
        // Instant withdrawal
        // TODO: Replace with actual API call
        dispatch(updateDeposit({ 
          id: depositId, 
          balance: (parseFloat(amount) - parseFloat(amount)).toString() 
        }))
        
        dispatch(addNotification({
          type: 'success',
          title: 'Withdrawal Complete',
          message: `Successfully withdrew ${amount} HBAR instantly`
        }))
      } else {
        // Request withdrawal for Tier 2/3
        const withdrawalRequest = {
          id: Date.now(),
          depositId,
          amount: amount.toString(),
          tier,
          requestedAt: new Date().toISOString(),
          status: 'pending',
          completionDate: new Date(Date.now() + (tier === 2 ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString()
        }
        
        dispatch(addWithdrawalRequest(withdrawalRequest))
        dispatch(addNotification({
          type: 'info',
          title: 'Withdrawal Requested',
          message: `Withdrawal request submitted. ${tier === 2 ? '30-day' : '90-day'} notice period started.`
        }))
        
        // Mock notification after notice period (for demo)
        setTimeout(() => {
          dispatch(addWithdrawalReady({
            depositId,
            amount,
            tier
          }))
        }, 5000) // 5 seconds for demo, should be actual notice period
      }
    } catch (error) {
      dispatch(setError(error.message))
      dispatch(addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: error.message
      }))
      throw error
    } finally {
      dispatch(setLoading({ withdraw: false }))
    }
  }

  const completeWithdrawal = async (withdrawalRequestId) => {
    try {
      dispatch(setLoading({ withdraw: true }))
      
      // TODO: Replace with actual API call
      dispatch(addNotification({
        type: 'success',
        title: 'Withdrawal Complete',
        message: 'Your withdrawal has been processed successfully'
      }))
    } catch (error) {
      dispatch(setError(error.message))
      throw error
    } finally {
      dispatch(setLoading({ withdraw: false }))
    }
  }

  return {
    deposit,
    withdraw,
    completeWithdrawal
  }
}