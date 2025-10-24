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
import { contractService } from '../../services/contractService'

export const useBorrowingActions = () => {
  const dispatch = useDispatch()

  const borrow = async (collateralAmount, borrowAmountUSD, iScore, walletId) => {
    try {
      dispatch(setLoading({ borrow: true }))

      // Call smart contract to deposit collateral and borrow
      const receipt = await contractService.depositCollateralAndBorrow(
        collateralAmount,
        borrowAmountUSD,
        iScore
      )

      // Get loan details from contract
      const loanData = await contractService.getLoan(walletId)
      const healthFactor = await contractService.calculateHealthFactor(walletId)

      const loan = {
        id: receipt.hash,
        borrowed: loanData.borrowedAmountHBAR,
        borrowedUSD: loanData.borrowedAmountUSD,
        collateral: loanData.collateralAmount,
        totalDebt: loanData.borrowedAmountHBAR,
        interestRate: loanData.interestRate,
        healthFactor,
        stakingRewards: '0',
        accruedInterest: loanData.accruedInterest,
        iScore: loanData.iScore,
        createdAt: new Date(loanData.createdAt * 1000).toISOString(),
        status: 'active',
        walletId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      }

      dispatch(addLoan(loan))
      dispatch(addNotification({
        type: 'success',
        title: 'Loan Created',
        message: `Successfully borrowed $${borrowAmountUSD} with ${collateralAmount} HBAR collateral`,
        txHash: receipt.hash
      }))

      return loan
    } catch (error) {
      console.error('Borrow error:', error)
      const errorMessage = error.reason || error.message || 'Failed to create loan'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Borrow Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ borrow: false }))
    }
  }

  const repayLoan = async (repayAmount, isFullRepayment = false, walletId) => {
    try {
      dispatch(setLoading({ repay: true }))

      // Call smart contract to repay loan
      const receipt = await contractService.repayLoan(repayAmount, isFullRepayment)

      if (isFullRepayment) {
        dispatch(updateLoan({
          id: walletId,
          status: 'repaid',
          totalDebt: '0',
          active: false
        }))

        // Improve iScore on successful repayment
        dispatch(updateIScore({
          change: 10,
          reason: 'Loan repaid successfully'
        }))

        dispatch(addNotification({
          type: 'success',
          title: 'Loan Repaid',
          message: 'Loan fully repaid! Collateral has been returned.',
          txHash: receipt.hash
        }))
      } else {
        // Partial repayment - update loan details
        const loanData = await contractService.getLoan(walletId)
        const healthFactor = await contractService.calculateHealthFactor(walletId)

        dispatch(updateLoan({
          id: walletId,
          totalDebt: loanData.borrowedAmountHBAR,
          accruedInterest: loanData.accruedInterest,
          healthFactor
        }))

        dispatch(addNotification({
          type: 'success',
          title: 'Payment Processed',
          message: `Successfully repaid ${repayAmount} HBAR`,
          txHash: receipt.hash
        }))
      }

      return receipt
    } catch (error) {
      console.error('Repayment error:', error)
      const errorMessage = error.reason || error.message || 'Failed to repay loan'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Repayment Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ repay: false }))
    }
  }

  const addCollateral = async (collateralAmount, walletId) => {
    try {
      dispatch(setLoading({ addCollateral: true }))

      // Call smart contract to add collateral
      const receipt = await contractService.addCollateral(collateralAmount)

      // Get updated loan details
      const loanData = await contractService.getLoan(walletId)
      const healthFactor = await contractService.calculateHealthFactor(walletId)

      dispatch(updateLoan({
        id: walletId,
        collateral: loanData.collateralAmount,
        healthFactor
      }))

      dispatch(addNotification({
        type: 'success',
        title: 'Collateral Added',
        message: `Successfully added ${collateralAmount} HBAR collateral`,
        txHash: receipt.hash
      }))

      return receipt
    } catch (error) {
      console.error('Add collateral error:', error)
      const errorMessage = error.reason || error.message || 'Failed to add collateral'
      dispatch(setError(errorMessage))
      dispatch(addNotification({
        type: 'error',
        title: 'Add Collateral Failed',
        message: errorMessage
      }))
      throw error
    } finally {
      dispatch(setLoading({ addCollateral: false }))
    }
  }

  const checkHealthFactor = async (walletId) => {
    try {
      const healthFactor = await contractService.calculateHealthFactor(walletId)

      dispatch(updateHealthFactor({ loanId: walletId, healthFactor }))

      if (healthFactor < 1.2) {
        dispatch(addHealthFactorWarning({ loanId: walletId, healthFactor }))
        dispatch(addNotification({
          type: 'warning',
          title: 'Low Health Factor Warning',
          message: `Your health factor is ${healthFactor.toFixed(2)}. Consider adding collateral to avoid liquidation.`
        }))
      }

      return healthFactor
    } catch (error) {
      console.error('Health factor check error:', error)
      throw error
    }
  }

  const getLoanTerms = async (iScore, borrowAmountUSD) => {
    try {
      const terms = await contractService.getLoanTerms(iScore, borrowAmountUSD)
      return terms
    } catch (error) {
      console.error('Failed to get loan terms:', error)
      throw error
    }
  }

  const getUserLoan = async (walletId) => {
    try {
      const loanData = await contractService.getLoan(walletId)

      if (!loanData.active) {
        return null
      }

      const healthFactor = await contractService.calculateHealthFactor(walletId)

      return {
        borrowed: loanData.borrowedAmountHBAR,
        borrowedUSD: loanData.borrowedAmountUSD,
        collateral: loanData.collateralAmount,
        totalDebt: loanData.borrowedAmountHBAR,
        interestRate: loanData.interestRate,
        healthFactor,
        accruedInterest: loanData.accruedInterest,
        iScore: loanData.iScore,
        createdAt: new Date(loanData.createdAt * 1000).toISOString(),
        status: 'active',
        walletId
      }
    } catch (error) {
      console.error('Failed to get user loan:', error)
      return null
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
    getLoanTerms,
    getUserLoan,
    distributeStakingRewards
  }
}