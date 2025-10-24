import { useDispatch } from 'react-redux'
import {
  addDeposit,
  addWithdrawalRequest,
  updateDeposit,
  setLoading,
  setError
} from '../store/lendingSlice'
import { addNotification, addWithdrawalReady } from '../store/notificationSlice'
import { contractService } from '../../services/contractService'

export const useLendingActions = () => {
  const dispatch = useDispatch()

  const deposit = async (tier, amount, walletId) => {
    try {
      dispatch(setLoading({ deposit: true }))

      // Call smart contract deposit function
      const receipt = await contractService.deposit(tier, amount)

      // Get APY for the tier
      const apy = await contractService.getAPY(tier)

      const depositRecord = {
        id: receipt.hash,
        tier,
        tierName: `Tier ${tier} - ${tier === 1 ? 'Instant' : tier === 2 ? '30-Day Notice' : '90-Day Locked'}`,
        amount: amount.toString(),
        balance: amount.toString(),
        apy,
        earned: '0',
        createdAt: new Date().toISOString(),
        walletId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }

      dispatch(addDeposit(depositRecord))
      dispatch(addNotification({
        type: 'success',
        title: 'Deposit Successful',
        message: `Successfully deposited ${amount} HBAR to ${depositRecord.tierName}`,
        txHash: receipt.hash
      }))

      return depositRecord
    } catch (error) {
      console.error('Deposit error:', error)
      const errorMessage = error.reason || error.message || 'Failed to deposit'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Deposit Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ deposit: false }))
    }
  }

  const withdraw = async (depositId, amount, tier, walletId) => {
    try {
      dispatch(setLoading({ withdraw: true }))

      if (tier === 1) {
        // Instant withdrawal - call smart contract
        const lpBalance = await contractService.getLPTokenBalance(tier, walletId)
        const receipt = await contractService.withdraw(tier, amount)

        dispatch(updateDeposit({
          id: depositId,
          balance: (parseFloat(lpBalance) - parseFloat(amount)).toString()
        }))

        dispatch(addNotification({
          type: 'success',
          title: 'Withdrawal Complete',
          message: `Successfully withdrew ${amount} HBAR instantly`,
          txHash: receipt.hash
        }))

        return receipt
      } else {
        // Request withdrawal for Tier 2 (Tier 3 has no notice period, just lock period)
        if (tier === 2) {
          const receipt = await contractService.requestWithdrawal(amount)

          const withdrawalRequest = {
            id: receipt.hash,
            depositId,
            amount: amount.toString(),
            tier,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            completionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            transactionHash: receipt.hash
          }

          dispatch(addWithdrawalRequest(withdrawalRequest))
          dispatch(addNotification({
            type: 'info',
            title: 'Withdrawal Requested',
            message: `Withdrawal request submitted. 30-day notice period started.`,
            txHash: receipt.hash
          }))

          return receipt
        } else {
          // Tier 3 - direct withdrawal if lock period has passed
          const receipt = await contractService.withdraw(tier, amount)

          dispatch(updateDeposit({
            id: depositId,
            balance: '0'
          }))

          dispatch(addNotification({
            type: 'success',
            title: 'Withdrawal Complete',
            message: `Successfully withdrew ${amount} HBAR from Tier 3`,
            txHash: receipt.hash
          }))

          return receipt
        }
      }
    } catch (error) {
      console.error('Withdrawal error:', error)
      const errorMessage = error.reason || error.message || 'Failed to withdraw'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ withdraw: false }))
    }
  }

  const completeWithdrawal = async (tier, amount, walletId) => {
    try {
      dispatch(setLoading({ withdraw: true }))

      // Call smart contract to complete withdrawal after notice period
      const receipt = await contractService.withdraw(tier, amount)

      dispatch(addNotification({
        type: 'success',
        title: 'Withdrawal Complete',
        message: 'Your withdrawal has been processed successfully',
        txHash: receipt.hash
      }))

      return receipt
    } catch (error) {
      console.error('Complete withdrawal error:', error)
      const errorMessage = error.reason || error.message || 'Failed to complete withdrawal'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Withdrawal Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ withdraw: false }))
    }
  }

  const getPoolStatistics = async () => {
    try {
      const stats = await contractService.getPoolStats()
      const hbarPrice = await contractService.getHBARPrice()

      return {
        ...stats,
        hbarPrice
      }
    } catch (error) {
      console.error('Failed to get pool statistics:', error)
      throw error
    }
  }

  const getUserDeposits = async (walletId) => {
    try {
      const deposits = []

      // Get LP token balances for all tiers
      for (let tier = 1; tier <= 3; tier++) {
        const balance = await contractService.getLPTokenBalance(tier, walletId)

        if (parseFloat(balance) > 0) {
          const apy = await contractService.getAPY(tier)

          deposits.push({
            tier,
            tierName: `Tier ${tier} - ${tier === 1 ? 'Instant' : tier === 2 ? '30-Day Notice' : '90-Day Locked'}`,
            balance,
            apy
          })
        }
      }

      return deposits
    } catch (error) {
      console.error('Failed to get user deposits:', error)
      throw error
    }
  }

  return {
    deposit,
    withdraw,
    completeWithdrawal,
    getPoolStatistics,
    getUserDeposits
  }
}