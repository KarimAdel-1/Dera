import { ethers } from 'ethers';
import DeraMultiAssetStakingABI from '../contracts/abis/DeraMultiAssetStaking.json';

class StakingService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.isInitialized = false;
    this.contractAddress = process.env.NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS;
  }

  async initialize(provider, signer) {
    try {
      if (!this.contractAddress) {
        throw new Error('Staking contract address not configured');
      }

      this.provider = provider;
      this.signer = signer;
      this.contract = new ethers.Contract(
        this.contractAddress,
        DeraMultiAssetStakingABI.abi,
        signer
      );

      this.isInitialized = true;
      console.log('✅ StakingService initialized');
      
      // Display current rates and sustainability info
      await this.logCurrentStatus();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize StakingService:', error);
      return false;
    }
  }

  async logCurrentStatus() {
    try {
      const tvl = await this.contract.totalValueLocked();
      const multiplier = await this.contract.getCurrentRateMultiplier();
      const poolStatus = await this.contract.getRewardPoolStatus();

      console.log('📊 Staking Status:');
      console.log('- TVL:', ethers.formatEther(tvl), 'HBAR');
      console.log('- Rate Multiplier:', multiplier / 100, 'x');
      console.log('- Pool Utilization:', poolStatus.utilizationRate / 100, '%');
    } catch (error) {
      console.error('Failed to log status:', error);
    }
  }

  // Get current effective APR rates
  async getEffectiveRates() {
    if (!this.isInitialized) throw new Error('Service not initialized');

    const lockPeriods = [7, 30, 90, 180, 365];
    const rates = {};

    for (const period of lockPeriods) {
      try {
        const rate = await this.contract.getEffectiveAPR(period);
        rates[period] = {
          apr: Number(rate) / 100, // Convert from basis points
          display: `${(Number(rate) / 100).toFixed(1)}% APR`
        };
      } catch (error) {
        console.error(`Failed to get rate for ${period} days:`, error);
        rates[period] = { apr: 0, display: 'N/A' };
      }
    }

    return rates;
  }

  // Check if a stake can be sustained
  async canSustainStake(amount, lockPeriod) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const amountWei = ethers.parseEther(amount.toString());
      return await this.contract.canSustainStake(amountWei, lockPeriod);
    } catch (error) {
      console.error('Failed to check sustainability:', error);
      return false;
    }
  }

  // Calculate projected rewards
  async calculateRewards(amount, lockPeriod, isNFT = false) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const amountWei = isNFT ? 0 : ethers.parseEther(amount.toString());
      const rewards = await this.contract.calculateRewards(amountWei, lockPeriod);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Failed to calculate rewards:', error);
      return '0';
    }
  }

  // Stake HBAR with sustainability check
  async stakeHBAR(amount, lockPeriod) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      // Check sustainability first
      const canSustain = await this.canSustainStake(amount, lockPeriod);
      if (!canSustain) {
        throw new Error('Insufficient reward pool to sustain this stake. Please try a smaller amount or shorter period.');
      }

      const amountWei = ethers.parseEther(amount.toString());
      const tx = await this.contract.stakeHBAR(lockPeriod, { value: amountWei });
      
      console.log('🔄 Staking transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      console.log('✅ HBAR staked successfully');
      await this.logCurrentStatus(); // Update status after staking
      
      return receipt;
    } catch (error) {
      console.error('❌ Failed to stake HBAR:', error);
      throw error;
    }
  }

  // Get claimable rewards for a stake
  async getClaimableRewards(userAddress, stakeIndex) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const rewards = await this.contract.getClaimableRewards(userAddress, stakeIndex);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Failed to get claimable rewards:', error);
      return '0';
    }
  }

  // Claim rewards
  async claimRewards(stakeIndex) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const tx = await this.contract.claimRewards(stakeIndex);
      console.log('🔄 Claiming rewards:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Rewards claimed successfully');
      
      return receipt;
    } catch (error) {
      console.error('❌ Failed to claim rewards:', error);
      throw error;
    }
  }

  // Unstake with penalty warning
  async unstake(stakeIndex, userStakes) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const stake = userStakes[stakeIndex];
      const lockEndTime = stake.startTime + (stake.lockPeriod * 86400);
      const currentTime = Math.floor(Date.now() / 1000);
      const isEarlyUnstake = currentTime < lockEndTime;

      if (isEarlyUnstake) {
        const penalty = await this.contract.emergencyPenalty();
        const penaltyPercent = Number(penalty) / 100;
        
        const confirmed = confirm(
          `⚠️ Early Unstake Warning\n\n` +
          `You are unstaking before the lock period ends.\n` +
          `Penalty: ${penaltyPercent}% of principal\n\n` +
          `Continue with early unstake?`
        );
        
        if (!confirmed) {
          throw new Error('Unstake cancelled by user');
        }
      }

      const tx = await this.contract.unstake(stakeIndex);
      console.log('🔄 Unstaking transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Unstaked successfully');
      
      await this.logCurrentStatus(); // Update status after unstaking
      
      return receipt;
    } catch (error) {
      console.error('❌ Failed to unstake:', error);
      throw error;
    }
  }

  // Get user stakes with enhanced info
  async getUserStakes(userAddress) {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const stakes = await this.contract.getUserStakes(userAddress);
      const enhancedStakes = [];

      for (let i = 0; i < stakes.length; i++) {
        const stake = stakes[i];
        if (!stake.active) continue;

        const claimableRewards = await this.getClaimableRewards(userAddress, i);
        const lockEndTime = Number(stake.startTime) + (Number(stake.lockPeriod) * 86400);
        const currentTime = Math.floor(Date.now() / 1000);
        const isUnlocked = currentTime >= lockEndTime;
        const timeRemaining = Math.max(0, lockEndTime - currentTime);

        enhancedStakes.push({
          index: i,
          amount: ethers.formatEther(stake.amount),
          lockPeriod: Number(stake.lockPeriod),
          startTime: Number(stake.startTime),
          asset: stake.asset,
          isNFT: stake.isNFT,
          nftSerialNumber: Number(stake.nftSerialNumber),
          claimableRewards,
          isUnlocked,
          timeRemaining,
          timeRemainingDisplay: this.formatTimeRemaining(timeRemaining)
        });
      }

      return enhancedStakes;
    } catch (error) {
      console.error('Failed to get user stakes:', error);
      return [];
    }
  }

  // Get reward pool status
  async getRewardPoolStatus() {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const status = await this.contract.getRewardPoolStatus();
      return {
        totalRewards: ethers.formatEther(status.totalRewards),
        distributedRewards: ethers.formatEther(status.distributedRewards),
        availableRewards: ethers.formatEther(status.availableRewards),
        utilizationRate: Number(status.utilizationRate) / 100
      };
    } catch (error) {
      console.error('Failed to get reward pool status:', error);
      return null;
    }
  }

  // Get TVL and dynamic rate info
  async getTVLInfo() {
    if (!this.isInitialized) throw new Error('Service not initialized');

    try {
      const tvl = await this.contract.totalValueLocked();
      const multiplier = await this.contract.getCurrentRateMultiplier();
      const lowThreshold = await this.contract.lowTVLThreshold();
      const highThreshold = await this.contract.highTVLThreshold();

      return {
        tvl: ethers.formatEther(tvl),
        multiplier: Number(multiplier) / 100,
        lowThreshold: ethers.formatEther(lowThreshold),
        highThreshold: ethers.formatEther(highThreshold)
      };
    } catch (error) {
      console.error('Failed to get TVL info:', error);
      return null;
    }
  }

  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Unlocked';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  getContractAddress() {
    return this.contractAddress;
  }
}

export default new StakingService();