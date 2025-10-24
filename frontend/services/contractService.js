import { ethers } from 'ethers'

/**
 * Contract Service for interacting with Dera smart contracts
 * Handles all blockchain interactions for lending and borrowing
 */

// Contract addresses (update these after deployment)
const CONTRACTS = {
  LendingPool: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS || '0x0000000000000000000000000000000000000000',
  BorrowingContract: process.env.NEXT_PUBLIC_BORROWING_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  PriceOracle: process.env.NEXT_PUBLIC_PRICE_ORACLE_ADDRESS || '0x0000000000000000000000000000000000000000',
  LPInstant: process.env.NEXT_PUBLIC_LP_INSTANT_ADDRESS || '0x0000000000000000000000000000000000000000',
  LPWarm: process.env.NEXT_PUBLIC_LP_WARM_ADDRESS || '0x0000000000000000000000000000000000000000',
  LPCold: process.env.NEXT_PUBLIC_LP_COLD_ADDRESS || '0x0000000000000000000000000000000000000000',
}

// Simplified ABIs (add complete ABIs from compiled contracts)
const LENDING_POOL_ABI = [
  'function deposit(uint8 tier) external payable',
  'function withdraw(uint8 tier, uint256 lpTokenAmount) external',
  'function requestWithdrawal(uint256 amount) external',
  'function getAvailableLiquidity(uint8 tier) public view returns (uint256)',
  'function getTotalAvailableLiquidity() external view returns (uint256)',
  'function getPoolStats() external view returns (uint256,uint256,uint256,uint256,uint256,uint256)',
  'function calculateAPY(uint8 tier, uint256 baseRate) public view returns (uint256)',
  'function getUtilization(uint8 tier) public view returns (uint256)',
  'function tierTotalDeposits(uint8) public view returns (uint256)',
  'function tierBorrowed(uint8) public view returns (uint256)',
  'event Deposited(address indexed user, uint8 indexed tier, uint256 amount, uint256 lpTokens)',
  'event Withdrawn(address indexed user, uint8 indexed tier, uint256 amount, uint256 lpTokens)',
  'event WithdrawalRequested(address indexed user, uint256 amount, uint256 fulfillmentDate)',
]

const BORROWING_CONTRACT_ABI = [
  'function depositCollateralAndBorrow(uint256 borrowAmountUSD, uint256 userIScore) external payable',
  'function repay(bool isFullRepayment) external payable',
  'function addCollateral() external payable',
  'function liquidate(address borrower) external payable',
  'function calculateHealthFactor(address borrower) public view returns (uint256)',
  'function getLoanTerms(uint256 userIScore, uint256 borrowAmountUSD) external view returns (uint256,uint256,uint256)',
  'function getLoan(address borrower) external view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,address,bool,uint256))',
  'function getCollateralRatio(uint256 iScore) public pure returns (uint256)',
  'function getInterestRate(uint256 iScore) public view returns (uint256)',
  'event CollateralDeposited(address indexed borrower, uint256 collateralAmount, uint256 iScore)',
  'event LoanCreated(address indexed borrower, uint256 borrowedUSD, uint256 borrowedHBAR, uint256 interestRate, uint256 iScore)',
  'event LoanRepaid(address indexed borrower, uint256 repaidAmount, uint256 interestPaid)',
  'event LoanLiquidated(address indexed borrower, address indexed liquidator, uint256 debtPaid, uint256 collateralSeized)',
]

const PRICE_ORACLE_ABI = [
  'function getPrice() external view returns (uint256)',
  'function getPriceWithTimestamp() external view returns (uint256 price, uint256 timestamp)',
  'function hbarToUsd(uint256 hbarAmount) external view returns (uint256)',
  'function usdToHbar(uint256 usdAmount) external view returns (uint256)',
  'function isStale() public view returns (bool)',
]

const LP_TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
]

class ContractService {
  constructor() {
    this.provider = null
    this.signer = null
    this.contracts = {}
  }

  /**
   * Initialize the contract service with a provider
   * @param {Object} provider - Ethers provider or Web3 provider
   */
  async initialize(provider) {
    try {
      if (!provider) {
        throw new Error('Provider is required')
      }

      this.provider = new ethers.BrowserProvider(provider)
      this.signer = await this.provider.getSigner()

      // Initialize contract instances
      this.contracts.lendingPool = new ethers.Contract(
        CONTRACTS.LendingPool,
        LENDING_POOL_ABI,
        this.signer
      )

      this.contracts.borrowingContract = new ethers.Contract(
        CONTRACTS.BorrowingContract,
        BORROWING_CONTRACT_ABI,
        this.signer
      )

      this.contracts.priceOracle = new ethers.Contract(
        CONTRACTS.PriceOracle,
        PRICE_ORACLE_ABI,
        this.signer
      )

      this.contracts.lpInstant = new ethers.Contract(
        CONTRACTS.LPInstant,
        LP_TOKEN_ABI,
        this.signer
      )

      this.contracts.lpWarm = new ethers.Contract(
        CONTRACTS.LPWarm,
        LP_TOKEN_ABI,
        this.signer
      )

      this.contracts.lpCold = new ethers.Contract(
        CONTRACTS.LPCold,
        LP_TOKEN_ABI,
        this.signer
      )

      return true
    } catch (error) {
      console.error('Failed to initialize contract service:', error)
      throw error
    }
  }

  // ============= LENDING POOL FUNCTIONS =============

  /**
   * Deposit HBAR into a lending tier
   * @param {number} tier - Tier number (1, 2, or 3)
   * @param {string} amount - Amount in HBAR
   */
  async deposit(tier, amount) {
    try {
      if (!this.contracts.lendingPool) {
        throw new Error('Contract service not initialized. Please connect your wallet first.')
      }
      const value = ethers.parseEther(amount.toString())
      const tx = await this.contracts.lendingPool.deposit(tier, { value })
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Deposit failed:', error)
      throw error
    }
  }

  /**
   * Withdraw HBAR from a lending tier
   * @param {number} tier - Tier number (1, 2, or 3)
   * @param {string} lpTokenAmount - Amount of LP tokens to burn
   */
  async withdraw(tier, lpTokenAmount) {
    try {
      const amount = ethers.parseEther(lpTokenAmount.toString())
      const tx = await this.contracts.lendingPool.withdraw(tier, amount)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Withdrawal failed:', error)
      throw error
    }
  }

  /**
   * Request withdrawal for Tier 2 (30-day notice)
   * @param {string} amount - Amount of LP tokens
   */
  async requestWithdrawal(amount) {
    try {
      const lpAmount = ethers.parseEther(amount.toString())
      const tx = await this.contracts.lendingPool.requestWithdrawal(lpAmount)
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Withdrawal request failed:', error)
      throw error
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStats() {
    try {
      const stats = await this.contracts.lendingPool.getPoolStats()
      return {
        tier1Total: ethers.formatEther(stats[0]),
        tier2Total: ethers.formatEther(stats[1]),
        tier3Total: ethers.formatEther(stats[2]),
        tier1Borrowed: ethers.formatEther(stats[3]),
        tier2Borrowed: ethers.formatEther(stats[4]),
        tier3Borrowed: ethers.formatEther(stats[5]),
      }
    } catch (error) {
      console.error('Failed to get pool stats:', error)
      throw error
    }
  }

  /**
   * Get available liquidity for a tier
   * @param {number} tier - Tier number (1, 2, or 3)
   */
  async getAvailableLiquidity(tier) {
    try {
      const liquidity = await this.contracts.lendingPool.getAvailableLiquidity(tier)
      return ethers.formatEther(liquidity)
    } catch (error) {
      console.error('Failed to get available liquidity:', error)
      throw error
    }
  }

  /**
   * Get APY for a tier
   * @param {number} tier - Tier number (1, 2, or 3)
   * @param {number} baseRate - Base rate (default 900 = 9%)
   */
  async getAPY(tier, baseRate = 900) {
    try {
      const apy = await this.contracts.lendingPool.calculateAPY(tier, baseRate)
      return Number(apy) / 100 // Convert from scaled value
    } catch (error) {
      console.error('Failed to get APY:', error)
      throw error
    }
  }

  /**
   * Get utilization rate for a tier
   * @param {number} tier - Tier number (1, 2, or 3)
   */
  async getUtilization(tier) {
    try {
      const utilization = await this.contracts.lendingPool.getUtilization(tier)
      return Number(utilization)
    } catch (error) {
      console.error('Failed to get utilization:', error)
      throw error
    }
  }

  // ============= BORROWING FUNCTIONS =============

  /**
   * Deposit collateral and borrow
   * @param {string} collateralAmount - Collateral in HBAR
   * @param {string} borrowAmountUSD - Borrow amount in USD
   * @param {number} iScore - User's iScore (0-1000)
   */
  async depositCollateralAndBorrow(collateralAmount, borrowAmountUSD, iScore) {
    try {
      const collateral = ethers.parseEther(collateralAmount.toString())
      const borrowUSD = ethers.parseUnits(borrowAmountUSD.toString(), 8) // USD with 8 decimals

      const tx = await this.contracts.borrowingContract.depositCollateralAndBorrow(
        borrowUSD,
        iScore,
        { value: collateral }
      )
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Borrow failed:', error)
      throw error
    }
  }

  /**
   * Repay loan
   * @param {string} repayAmount - Amount in HBAR
   * @param {boolean} isFullRepayment - True for full repayment
   */
  async repayLoan(repayAmount, isFullRepayment = false) {
    try {
      const amount = ethers.parseEther(repayAmount.toString())
      const tx = await this.contracts.borrowingContract.repay(isFullRepayment, { value: amount })
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Repayment failed:', error)
      throw error
    }
  }

  /**
   * Add collateral to existing loan
   * @param {string} collateralAmount - Additional collateral in HBAR
   */
  async addCollateral(collateralAmount) {
    try {
      const amount = ethers.parseEther(collateralAmount.toString())
      const tx = await this.contracts.borrowingContract.addCollateral({ value: amount })
      const receipt = await tx.wait()
      return receipt
    } catch (error) {
      console.error('Add collateral failed:', error)
      throw error
    }
  }

  /**
   * Get loan details for an address
   * @param {string} borrowerAddress - Borrower's address
   */
  async getLoan(borrowerAddress) {
    try {
      const loan = await this.contracts.borrowingContract.getLoan(borrowerAddress)
      return {
        collateralAmount: ethers.formatEther(loan[0]),
        borrowedAmountUSD: ethers.formatUnits(loan[1], 8),
        borrowedAmountHBAR: ethers.formatEther(loan[2]),
        interestRate: Number(loan[3]) / 100,
        lastInterestUpdate: Number(loan[4]),
        accruedInterest: ethers.formatUnits(loan[5], 8),
        iScore: Number(loan[6]),
        proxyAccountId: loan[7],
        active: loan[8],
        createdAt: Number(loan[9]),
      }
    } catch (error) {
      console.error('Failed to get loan:', error)
      throw error
    }
  }

  /**
   * Calculate health factor for a borrower
   * @param {string} borrowerAddress - Borrower's address
   */
  async calculateHealthFactor(borrowerAddress) {
    try {
      const healthFactor = await this.contracts.borrowingContract.calculateHealthFactor(borrowerAddress)
      return Number(healthFactor) / 100 // Convert from scaled value
    } catch (error) {
      console.error('Failed to calculate health factor:', error)
      throw error
    }
  }

  /**
   * Get loan terms for a user
   * @param {number} iScore - User's iScore
   * @param {string} borrowAmountUSD - Desired borrow amount in USD
   */
  async getLoanTerms(iScore, borrowAmountUSD) {
    try {
      const borrowUSD = ethers.parseUnits(borrowAmountUSD.toString(), 8)
      const terms = await this.contracts.borrowingContract.getLoanTerms(iScore, borrowUSD)
      return {
        collateralRatio: Number(terms[0]) / 100,
        interestRate: Number(terms[1]) / 100,
        maxBorrowUSD: ethers.formatUnits(terms[2], 8),
      }
    } catch (error) {
      console.error('Failed to get loan terms:', error)
      throw error
    }
  }

  // ============= PRICE ORACLE FUNCTIONS =============

  /**
   * Get current HBAR/USD price
   */
  async getHBARPrice() {
    try {
      const price = await this.contracts.priceOracle.getPrice()
      return ethers.formatUnits(price, 8)
    } catch (error) {
      console.error('Failed to get HBAR price:', error)
      throw error
    }
  }

  /**
   * Convert HBAR to USD
   * @param {string} hbarAmount - Amount in HBAR
   */
  async hbarToUsd(hbarAmount) {
    try {
      const hbar = ethers.parseEther(hbarAmount.toString())
      const usd = await this.contracts.priceOracle.hbarToUsd(hbar)
      return ethers.formatUnits(usd, 8)
    } catch (error) {
      console.error('Failed to convert HBAR to USD:', error)
      throw error
    }
  }

  /**
   * Convert USD to HBAR
   * @param {string} usdAmount - Amount in USD
   */
  async usdToHbar(usdAmount) {
    try {
      const usd = ethers.parseUnits(usdAmount.toString(), 8)
      const hbar = await this.contracts.priceOracle.usdToHbar(usd)
      return ethers.formatEther(hbar)
    } catch (error) {
      console.error('Failed to convert USD to HBAR:', error)
      throw error
    }
  }

  // ============= LP TOKEN FUNCTIONS =============

  /**
   * Get LP token balance for a user
   * @param {number} tier - Tier number (1, 2, or 3)
   * @param {string} userAddress - User's address
   */
  async getLPTokenBalance(tier, userAddress) {
    try {
      let contract
      if (tier === 1) contract = this.contracts.lpInstant
      else if (tier === 2) contract = this.contracts.lpWarm
      else if (tier === 3) contract = this.contracts.lpCold
      else throw new Error('Invalid tier')

      const balance = await contract.balanceOf(userAddress)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('Failed to get LP token balance:', error)
      throw error
    }
  }
}

// Export singleton instance
export const contractService = new ContractService()
export default contractService
