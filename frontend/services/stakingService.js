import { ethers } from 'ethers';

/**
 * StakingService - Handles all interactions with DeraMultiAssetStaking contract
 *
 * Features:
 * - Stake HBAR, HTS tokens, NFTs, and RWAs
 * - Unstake assets after lock period
 * - Claim rewards without unstaking
 * - Emergency unstake with penalty
 * - View user stakes and pending rewards
 */
class StakingService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.contractAddress = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the staking service
   * @param {string} contractAddress - DeraMultiAssetStaking contract address
   */
  async initialize(contractAddress) {
    try {
      if (!contractAddress) {
        console.warn('⚠️ StakingService: Contract address not provided. Using placeholder.');
        this.contractAddress = process.env.NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS || null;
      } else {
        this.contractAddress = contractAddress;
      }

      if (!this.contractAddress) {
        console.warn('⚠️ StakingService: No contract address configured. Service will use mock data.');
        this.isInitialized = false;
        return;
      }

      // Setup provider (will be replaced with HashPack provider)
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
      }

      // Import contract ABI
      const { default: DeraMultiAssetStakingABI } = await import('../contracts/abis/DeraMultiAssetStaking.json');

      // Create contract instance
      this.contract = new ethers.Contract(
        this.contractAddress,
        DeraMultiAssetStakingABI.abi,
        this.signer || this.provider
      );

      this.isInitialized = true;
      console.log('✅ StakingService initialized with contract:', this.contractAddress);
    } catch (error) {
      console.error('❌ StakingService initialization error:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get signer from HashPack or wallet provider
   */
  async getSigner() {
    if (this.signer) return this.signer;

    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      return this.signer;
    }

    throw new Error('No signer available');
  }

  /**
   * Stake fungible tokens (HBAR, HTS Token, RWA)
   * @param {string} tokenAddress - Token address (0x0 for HBAR)
   * @param {string} amount - Amount to stake in token units
   * @param {number} lockPeriodDays - Lock period in days (7, 30, 90, 180, 365)
   * @returns {Promise<Object>} Transaction receipt
   */
  async stakeFungibleToken(tokenAddress, amount, lockPeriodDays) {
    if (!this.isInitialized) {
      throw new Error('StakingService not initialized');
    }

    try {
      const lockPeriodSeconds = lockPeriodDays * 24 * 60 * 60;
      const amountWei = ethers.parseEther(amount.toString());

      console.log('🔄 Staking fungible token:', {
        tokenAddress,
        amount,
        lockPeriodDays,
        lockPeriodSeconds
      });

      // Call contract method
      const tx = await this.contract.stakeFungibleToken(
        tokenAddress,
        amountWei,
        lockPeriodSeconds
      );

      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Stake successful:', receipt);

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ Staking error:', error);
      throw error;
    }
  }

  /**
   * Stake NFT
   * @param {string} tokenAddress - NFT token address
   * @param {number} serialNumber - NFT serial number
   * @param {number} lockPeriodDays - Lock period in days
   * @returns {Promise<Object>} Transaction receipt
   */
  async stakeNFT(tokenAddress, serialNumber, lockPeriodDays) {
    if (!this.isInitialized) {
      throw new Error('StakingService not initialized');
    }

    try {
      const lockPeriodSeconds = lockPeriodDays * 24 * 60 * 60;

      console.log('🔄 Staking NFT:', {
        tokenAddress,
        serialNumber,
        lockPeriodDays
      });

      const tx = await this.contract.stakeNFT(
        tokenAddress,
        serialNumber,
        lockPeriodSeconds
      );

      console.log('⏳ Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ NFT stake successful:', receipt);

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ NFT staking error:', error);
      throw error;
    }
  }

  /**
   * Unstake assets after lock period
   * @param {number} stakeId - Stake ID
   * @returns {Promise<Object>} Transaction receipt
   */
  async unstake(stakeId) {
    if (!this.isInitialized) {
      throw new Error('StakingService not initialized');
    }

    try {
      console.log('🔄 Unstaking:', stakeId);

      const tx = await this.contract.unstake(stakeId);
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Unstake successful:', receipt);

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ Unstake error:', error);
      throw error;
    }
  }

  /**
   * Emergency unstake (with 20% penalty)
   * @param {number} stakeId - Stake ID
   * @returns {Promise<Object>} Transaction receipt
   */
  async emergencyUnstake(stakeId) {
    if (!this.isInitialized) {
      throw new Error('StakingService not initialized');
    }

    try {
      console.log('🔄 Emergency unstaking:', stakeId);

      const tx = await this.contract.emergencyUnstake(stakeId);
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Emergency unstake successful:', receipt);

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ Emergency unstake error:', error);
      throw error;
    }
  }

  /**
   * Claim rewards without unstaking
   * @param {number} stakeId - Stake ID
   * @returns {Promise<Object>} Transaction receipt
   */
  async claimRewards(stakeId) {
    if (!this.isInitialized) {
      throw new Error('StakingService not initialized');
    }

    try {
      console.log('🔄 Claiming rewards:', stakeId);

      const tx = await this.contract.claimRewards(stakeId);
      console.log('⏳ Transaction sent:', tx.hash);

      const receipt = await tx.wait();
      console.log('✅ Claim successful:', receipt);

      return {
        success: true,
        transactionHash: receipt.hash,
        receipt
      };
    } catch (error) {
      console.error('❌ Claim rewards error:', error);
      throw error;
    }
  }

  /**
   * Get user's stakes
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Array>} Array of user stakes
   */
  async getUserStakes(userAddress) {
    if (!this.isInitialized) {
      console.warn('⚠️ StakingService not initialized, returning mock data');
      return this.getMockStakes(userAddress);
    }

    try {
      console.log('🔍 Fetching stakes for:', userAddress);

      const stakeIds = await this.contract.getUserStakeIds(userAddress);

      const stakes = await Promise.all(
        stakeIds.map(async (stakeId) => {
          const stake = await this.contract.getStake(userAddress, stakeId);
          const pendingRewards = await this.contract.getPendingRewards(userAddress, stakeId);

          return {
            stakeId: stakeId.toString(),
            assetType: this.getAssetTypeName(stake.assetType),
            tokenAddress: stake.tokenAddress,
            amount: ethers.formatEther(stake.amount),
            serialNumber: stake.serialNumber.toString(),
            startTime: Number(stake.startTime) * 1000, // Convert to milliseconds
            lockPeriod: Number(stake.lockPeriod),
            unlockTime: Number(stake.unlockTime) * 1000,
            rewardAPY: Number(stake.rewardAPY),
            accumulatedRewards: ethers.formatEther(stake.accumulatedRewards),
            pendingRewards: ethers.formatEther(pendingRewards),
            status: this.getStakeStatus(stake.status)
          };
        })
      );

      console.log('✅ Found stakes:', stakes.length);
      return stakes;
    } catch (error) {
      console.error('❌ Error fetching stakes:', error);
      return this.getMockStakes(userAddress);
    }
  }

  /**
   * Get pending rewards for a stake
   * @param {string} userAddress - User's wallet address
   * @param {number} stakeId - Stake ID
   * @returns {Promise<string>} Pending rewards amount
   */
  async getPendingRewards(userAddress, stakeId) {
    if (!this.isInitialized) {
      return '0';
    }

    try {
      const rewards = await this.contract.getPendingRewards(userAddress, stakeId);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('❌ Error fetching pending rewards:', error);
      return '0';
    }
  }

  /**
   * Helper: Convert asset type enum to string
   */
  getAssetTypeName(assetType) {
    const types = ['HBAR', 'FUNGIBLE_TOKEN', 'NFT', 'RWA'];
    return types[assetType] || 'UNKNOWN';
  }

  /**
   * Helper: Convert stake status enum to string
   */
  getStakeStatus(status) {
    const statuses = ['ACTIVE', 'UNSTAKED', 'EMERGENCY_UNSTAKED'];
    return statuses[status] || 'UNKNOWN';
  }

  /**
   * Get mock stakes for development/testing
   */
  getMockStakes(userAddress) {
    return [
      {
        stakeId: '1',
        assetType: 'HBAR',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        amount: '100',
        serialNumber: '0',
        startTime: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        lockPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
        unlockTime: Date.now() + 25 * 24 * 60 * 60 * 1000, // 25 days from now
        rewardAPY: 10,
        accumulatedRewards: '1.37',
        pendingRewards: '1.37',
        status: 'ACTIVE'
      }
    ];
  }

  /**
   * Get contract address
   */
  getContractAddress() {
    return this.contractAddress;
  }
}

export const stakingService = new StakingService();
export default stakingService;
