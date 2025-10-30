const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DeraMultiAssetStaking", function () {
  let staking;
  let owner;
  let user1;
  let user2;
  
  const INITIAL_FUNDING = ethers.parseEther("1000"); // 1000 HBAR
  const STAKE_AMOUNT = ethers.parseEther("100"); // 100 HBAR

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const DeraMultiAssetStaking = await ethers.getContractFactory("DeraMultiAssetStaking");
    staking = await DeraMultiAssetStaking.deploy(ethers.ZeroAddress);
    
    // Fund the reward pool
    await staking.fundRewardPool({ value: INITIAL_FUNDING });
  });

  describe("Deployment", function () {
    it("Should set correct initial APR rates", async function () {
      expect(await staking.baseAPRRates(7)).to.equal(200);   // 2%
      expect(await staking.baseAPRRates(30)).to.equal(400);  // 4%
      expect(await staking.baseAPRRates(90)).to.equal(700);  // 7%
      expect(await staking.baseAPRRates(180)).to.equal(1000); // 10%
      expect(await staking.baseAPRRates(365)).to.equal(1200); // 12%
    });

    it("Should initialize reward pool correctly", async function () {
      const poolStatus = await staking.getRewardPoolStatus();
      expect(poolStatus.totalRewards).to.equal(INITIAL_FUNDING);
      expect(poolStatus.distributedRewards).to.equal(0);
      expect(poolStatus.availableRewards).to.equal(INITIAL_FUNDING);
    });
  });

  describe("Dynamic Rate Calculation", function () {
    it("Should return max multiplier for low TVL", async function () {
      const multiplier = await staking.getCurrentRateMultiplier();
      expect(multiplier).to.equal(150); // 1.5x for low TVL
    });

    it("Should calculate effective APR with multiplier", async function () {
      const baseRate = await staking.baseAPRRates(30); // 4% = 400 basis points
      const effectiveRate = await staking.getEffectiveAPR(30);
      const expectedRate = (baseRate * 150) / 100; // 400 * 1.5 = 600 basis points = 6%
      expect(effectiveRate).to.equal(expectedRate);
    });
  });

  describe("Sustainability Checks", function () {
    it("Should allow sustainable stakes", async function () {
      const canSustain = await staking.canSustainStake(STAKE_AMOUNT, 30);
      expect(canSustain).to.be.true;
    });

    it("Should reject unsustainable stakes", async function () {
      // Try to stake more than the reward pool can handle
      const largeStake = ethers.parseEther("10000"); // 10k HBAR
      const canSustain = await staking.canSustainStake(largeStake, 365);
      expect(canSustain).to.be.false;
    });

    it("Should prevent staking when reward pool is insufficient", async function () {
      // Drain most of the reward pool by setting high distributed rewards
      const largeStake = ethers.parseEther("5000");
      
      await expect(
        staking.connect(user1).stakeHBAR(365, { value: largeStake })
      ).to.be.revertedWith("Insufficient reward pool");
    });
  });

  describe("HBAR Staking", function () {
    it("Should stake HBAR successfully", async function () {
      await expect(
        staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT })
      ).to.emit(staking, "Staked")
       .withArgs(user1.address, ethers.ZeroAddress, STAKE_AMOUNT, 30);

      const stakes = await staking.getUserStakes(user1.address);
      expect(stakes.length).to.equal(1);
      expect(stakes[0].amount).to.equal(STAKE_AMOUNT);
      expect(stakes[0].lockPeriod).to.equal(30);
      expect(stakes[0].active).to.be.true;
    });

    it("Should update TVL after staking", async function () {
      await staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT });
      
      const tvl = await staking.totalValueLocked();
      expect(tvl).to.equal(STAKE_AMOUNT);
    });

    it("Should reserve rewards in pool", async function () {
      const poolStatusBefore = await staking.getRewardPoolStatus();
      
      await staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT });
      
      const poolStatusAfter = await staking.getRewardPoolStatus();
      expect(poolStatusAfter.distributedRewards).to.be.gt(poolStatusBefore.distributedRewards);
    });
  });

  describe("Reward Calculation", function () {
    it("Should calculate rewards correctly for HBAR", async function () {
      const lockPeriod = 30;
      const expectedRewards = await staking.calculateRewards(STAKE_AMOUNT, lockPeriod);
      
      // Manual calculation: (100 HBAR * 6% APR * 30 days) / 365 days
      const effectiveAPR = await staking.getEffectiveAPR(lockPeriod); // 600 basis points = 6%
      const manualRewards = (STAKE_AMOUNT * BigInt(effectiveAPR) * BigInt(lockPeriod)) / (BigInt(365) * BigInt(10000));
      
      expect(expectedRewards).to.equal(manualRewards);
    });

    it("Should calculate NFT rewards correctly", async function () {
      const lockPeriod = 7;
      const nftRewards = await staking.calculateRewards(0, lockPeriod); // 0 amount for NFT
      
      const dailyReward = await staking.nftDailyReward();
      const expectedRewards = dailyReward * BigInt(lockPeriod);
      
      expect(nftRewards).to.equal(expectedRewards);
    });
  });

  describe("Rewards Claiming", function () {
    beforeEach(async function () {
      await staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT });
    });

    it("Should allow claiming rewards", async function () {
      // Fast forward time by 1 day
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      const claimableRewards = await staking.getClaimableRewards(user1.address, 0);
      expect(claimableRewards).to.be.gt(0);

      await expect(
        staking.connect(user1).claimRewards(0)
      ).to.emit(staking, "RewardsClaimed");
    });

    it("Should update last claim time after claiming", async function () {
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine");

      const stakesBefore = await staking.getUserStakes(user1.address);
      const lastClaimBefore = stakesBefore[0].lastClaimTime;

      await staking.connect(user1).claimRewards(0);

      const stakesAfter = await staking.getUserStakes(user1.address);
      const lastClaimAfter = stakesAfter[0].lastClaimTime;

      expect(lastClaimAfter).to.be.gt(lastClaimBefore);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await staking.connect(user1).stakeHBAR(7, { value: STAKE_AMOUNT }); // 7-day lock
    });

    it("Should allow unstaking after lock period", async function () {
      // Fast forward past lock period (7 days)
      await ethers.provider.send("evm_increaseTime", [7 * 86400 + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        staking.connect(user1).unstake(0)
      ).to.emit(staking, "Unstaked");

      const stakes = await staking.getUserStakes(user1.address);
      expect(stakes[0].active).to.be.false;
    });

    it("Should apply penalty for early unstaking", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Unstake immediately (early)
      const tx = await staking.connect(user1).unstake(0);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);
      const netReceived = balanceAfter - balanceBefore + gasUsed;

      // Should receive less than full amount due to 20% penalty
      const expectedAmount = (STAKE_AMOUNT * BigInt(8000)) / BigInt(10000); // 80% of principal
      expect(netReceived).to.be.closeTo(expectedAmount, ethers.parseEther("0.1"));
    });

    it("Should update TVL after unstaking", async function () {
      await staking.connect(user1).unstake(0);
      
      const tvl = await staking.totalValueLocked();
      expect(tvl).to.equal(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update APR rates", async function () {
      await staking.updateAPRRates(30, 500); // 5% APR
      expect(await staking.baseAPRRates(30)).to.equal(500);
    });

    it("Should prevent setting rates too high", async function () {
      await expect(
        staking.updateAPRRates(30, 2100) // 21% APR (too high)
      ).to.be.revertedWith("Rate too high");
    });

    it("Should allow updating TVL thresholds", async function () {
      const newLow = ethers.parseEther("50000");
      const newHigh = ethers.parseEther("500000");
      
      await staking.updateTVLThresholds(newLow, newHigh);
      
      expect(await staking.lowTVLThreshold()).to.equal(newLow);
      expect(await staking.highTVLThreshold()).to.equal(newHigh);
    });

    it("Should allow pausing and unpausing", async function () {
      await staking.pause();
      
      await expect(
        staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT })
      ).to.be.revertedWith("Pausable: paused");

      await staking.unpause();
      
      await expect(
        staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT })
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero rewards gracefully", async function () {
      await staking.connect(user1).stakeHBAR(30, { value: STAKE_AMOUNT });
      
      // Immediately check claimable rewards (should be 0)
      const rewards = await staking.getClaimableRewards(user1.address, 0);
      expect(rewards).to.equal(0);
    });

    it("Should reject invalid lock periods", async function () {
      await expect(
        staking.connect(user1).stakeHBAR(15, { value: STAKE_AMOUNT }) // 15 days not supported
      ).to.be.revertedWith("Invalid lock period");
    });

    it("Should reject zero amount stakes", async function () {
      await expect(
        staking.connect(user1).stakeHBAR(30, { value: 0 })
      ).to.be.revertedWith("Amount must be greater than 0");
    });
  });
});