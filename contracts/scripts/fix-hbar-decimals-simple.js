const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Fixing HBAR Decimals Configuration\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const aclManagerAddress = deploymentInfo.addresses.ACL_MANAGER;

  console.log("📍 Contract Addresses:");
  console.log("   Pool:", poolAddress);
  console.log("   Pool Configurator:", poolConfiguratorAddress);
  console.log("   Deployer:", deployer.address);

  const pool = await ethers.getContractAt("DeraPool", poolAddress);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);
  const aclManager = await ethers.getContractAt("ACLManager", aclManagerAddress);

  // Check permissions
  console.log("\n📋 Checking Permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  console.log("   Pool Admin:", isPoolAdmin ? "✅" : "❌");

  if (!isPoolAdmin) {
    console.error("\n❌ ERROR: Deployer is not a Pool Admin!");
    console.log("   You need Pool Admin role to configure assets");
    process.exit(1);
  }

  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check Current Configuration");
  console.log("=".repeat(60) + "\n");

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const configData = BigInt(config.data);

  const LTV_MASK = 0xFFFFn;
  const LIQUIDATION_THRESHOLD_START = 16n;
  const LIQUIDATION_BONUS_START = 32n;
  const DECIMALS_START = 48n;

  const currentLtv = Number(configData & LTV_MASK);
  const currentLiquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
  const currentLiquidationBonus = Number((configData >> LIQUIDATION_BONUS_START) & LTV_MASK);
  const currentDecimals = Number((configData >> DECIMALS_START) & 0xFFn);

  console.log("📊 Current Configuration:");
  console.log("   LTV:", currentLtv, "basis points", `(${currentLtv / 100}%)`);
  console.log("   Liquidation Threshold:", currentLiquidationThreshold, "basis points", `(${currentLiquidationThreshold / 100}%)`);
  console.log("   Liquidation Bonus:", currentLiquidationBonus, "basis points", `(${currentLiquidationBonus / 100}%)`);
  console.log("   Decimals:", currentDecimals, currentDecimals === 0 ? "❌ WRONG!" : "✅");

  if (currentDecimals === 8) {
    console.log("\n✅ Decimals is already set to 8 - no fix needed!");
    process.exit(0);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Fix Decimals Configuration");
  console.log("=".repeat(60) + "\n");

  console.log("🔧 Setting decimals to 8 using setAssetDecimals()...\n");

  const TARGET_DECIMALS = 8;

  try {
    // Use the new setAssetDecimals function
    const tx = await poolConfigurator.setAssetDecimals(
      HBAR_ADDRESS,
      TARGET_DECIMALS,
      { gasLimit: 500000 }
    );

    console.log("⏳ Waiting for transaction confirmation...");
    await tx.wait();

    console.log("✅ Configuration updated");
    console.log("   Transaction:", tx.hash);

  } catch (error) {
    console.error("\n❌ Configuration update failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Verify New Configuration");
  console.log("=".repeat(60) + "\n");

  const newConfigResult = await pool.getConfiguration(HBAR_ADDRESS);
  const newConfigData = BigInt(newConfigResult.data);

  const newDecimals = Number((newConfigData >> DECIMALS_START) & 0xFFn);
  const newLtv = Number(newConfigData & LTV_MASK);
  const newLiquidationThreshold = Number((newConfigData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);

  console.log("📊 New Configuration:");
  console.log("   LTV:", newLtv, "basis points", `(${newLtv / 100}%)`);
  console.log("   Liquidation Threshold:", newLiquidationThreshold, "basis points", `(${newLiquidationThreshold / 100}%)`);
  console.log("   Decimals:", newDecimals, newDecimals === 8 ? "✅" : "❌");

  if (newDecimals === 8) {
    console.log("\n✅ SUCCESS! Decimals is now set to 8");
    console.log("\n🎉 getUserAccountData should now return correct values!");
    console.log("\nNext steps:");
    console.log("1. Refresh your frontend");
    console.log("2. Your collateral should now show as ~$20 USD");
    console.log("3. Available to borrow should show as ~$15 USD");
  } else {
    console.log("\n⚠️  Configuration updated but decimals doesn't match expected value");
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
