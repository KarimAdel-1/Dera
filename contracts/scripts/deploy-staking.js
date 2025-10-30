const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying DeraMultiAssetStaking...");

  // Get reward token address
  const REWARD_TOKEN = process.env.REWARD_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const INITIAL_FUNDING = ethers.parseEther("10000"); // 10k HBAR initial funding

  console.log("📋 Deployment Parameters:");
  console.log("- Reward Token:", REWARD_TOKEN);
  console.log("- Initial Funding:", ethers.formatEther(INITIAL_FUNDING), "HBAR");

  // Deploy contract
  const DeraMultiAssetStaking = await ethers.getContractFactory("DeraMultiAssetStaking");
  const staking = await DeraMultiAssetStaking.deploy(REWARD_TOKEN);

  await staking.waitForDeployment();
  const address = await staking.getAddress();

  console.log("✅ Contract deployed to:", address);

  // Fund the reward pool
  console.log("💰 Funding reward pool...");
  const fundTx = await staking.fundRewardPool({ value: INITIAL_FUNDING });
  await fundTx.wait();

  console.log("✅ Reward pool funded with", ethers.formatEther(INITIAL_FUNDING), "HBAR");

  // Display current rates
  console.log("\n📊 Current APR Rates:");
  const lockPeriods = [7, 30, 90, 180, 365];
  for (const period of lockPeriods) {
    const rate = await staking.getEffectiveAPR(period);
    console.log(`- ${period} days: ${rate / 100}% APR`);
  }

  // Display sustainability info
  const poolStatus = await staking.getRewardPoolStatus();
  console.log("\n🛡️ Sustainability Status:");
  console.log("- Total Rewards:", ethers.formatEther(poolStatus.totalRewards), "HBAR");
  console.log("- Available Rewards:", ethers.formatEther(poolStatus.availableRewards), "HBAR");
  console.log("- Utilization Rate:", poolStatus.utilizationRate / 100, "%");

  console.log("\n🎯 Dynamic Rate Info:");
  console.log("- Current TVL:", ethers.formatEther(await staking.totalValueLocked()), "HBAR");
  console.log("- Rate Multiplier:", (await staking.getCurrentRateMultiplier()) / 100, "x");
  console.log("- Low TVL Threshold:", ethers.formatEther(await staking.lowTVLThreshold()), "HBAR");
  console.log("- High TVL Threshold:", ethers.formatEther(await staking.highTVLThreshold()), "HBAR");

  return address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment successful!`);
    console.log(`Add to .env: NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=${address}`);
    console.log(`\n⚠️  Next Steps:`);
    console.log(`1. Set supported assets using setSupportedAsset()`);
    console.log(`2. Monitor reward pool utilization`);
    console.log(`3. Adjust rates based on market conditions`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });