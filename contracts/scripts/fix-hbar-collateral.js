const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Fixing HBAR Collateral Configuration\n");
  console.log("============================================================");
  console.log("This script will configure HBAR with proper collateral");
  console.log("parameters to enable borrowing against supplied HBAR");
  console.log("============================================================\n");

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
    console.log("   Run: await aclManager.addPoolAdmin(\"" + deployer.address + "\")");
    process.exit(1);
  }

  const HBAR_ADDRESS = ethers.ZeroAddress;

  // Check current configuration
  console.log("\n============================================================");
  console.log("STEP 1: Check Current Configuration");
  console.log("============================================================\n");

  let assetData;
  try {
    assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("✅ HBAR asset is initialized");
    console.log("   Asset ID:", assetData.id.toString());
  } catch (error) {
    console.error("❌ HBAR asset NOT initialized!");
    console.log("   Run: npm run init:hbar");
    process.exit(1);
  }

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const configData = BigInt(config.data);

  const LTV_MASK = 0xFFFFn;
  const LIQUIDATION_THRESHOLD_START = 16n;
  const IS_ACTIVE_BIT = 56n;
  const BORROWING_ENABLED_BIT = 58n;

  const currentLtv = Number(configData & LTV_MASK);
  const currentLiquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
  const isActive = (configData & (1n << IS_ACTIVE_BIT)) !== 0n;
  const borrowingEnabled = (configData & (1n << BORROWING_ENABLED_BIT)) !== 0n;

  console.log("📊 Current Configuration:");
  console.log("   LTV:", currentLtv, "basis points", `(${currentLtv / 100}%)`);
  console.log("   Liquidation Threshold:", currentLiquidationThreshold, "basis points", `(${currentLiquidationThreshold / 100}%)`);
  console.log("   Active:", isActive ? "✅" : "❌");
  console.log("   Borrowing Enabled:", borrowingEnabled ? "✅" : "❌");

  // Define target configuration
  const TARGET_LTV = 7500; // 75%
  const TARGET_LIQUIDATION_THRESHOLD = 8000; // 80%
  const TARGET_LIQUIDATION_BONUS = 10500; // 105% (5% bonus for liquidators)

  console.log("\n📋 Target Configuration:");
  console.log("   LTV:", TARGET_LTV, "basis points (75%)");
  console.log("   Liquidation Threshold:", TARGET_LIQUIDATION_THRESHOLD, "basis points (80%)");
  console.log("   Liquidation Bonus:", TARGET_LIQUIDATION_BONUS, "basis points (105%)");

  // Apply fixes
  console.log("\n============================================================");
  console.log("STEP 2: Apply Configuration");
  console.log("============================================================\n");

  try {
    // Configure collateral parameters
    if (currentLtv !== TARGET_LTV || currentLiquidationThreshold !== TARGET_LIQUIDATION_THRESHOLD) {
      console.log("🔧 Setting collateral parameters...");
      const tx1 = await poolConfigurator.configureAssetAsCollateral(
        HBAR_ADDRESS,
        TARGET_LTV,
        TARGET_LIQUIDATION_THRESHOLD,
        TARGET_LIQUIDATION_BONUS,
        { gasLimit: 500000 }
      );
      await tx1.wait();
      console.log("✅ Collateral parameters set");
      console.log("   Transaction:", tx1.hash);
    } else {
      console.log("✅ Collateral parameters already correct");
    }

    // Ensure asset is active
    if (!isActive) {
      console.log("\n🔧 Activating asset...");
      const tx2 = await poolConfigurator.setAssetActive(HBAR_ADDRESS, true, { gasLimit: 200000 });
      await tx2.wait();
      console.log("✅ Asset activated");
      console.log("   Transaction:", tx2.hash);
    } else {
      console.log("✅ Asset already active");
    }

    // Ensure borrowing is enabled
    if (!borrowingEnabled) {
      console.log("\n🔧 Enabling borrowing...");
      const tx3 = await poolConfigurator.setAssetBorrowing(HBAR_ADDRESS, true, { gasLimit: 200000 });
      await tx3.wait();
      console.log("✅ Borrowing enabled");
      console.log("   Transaction:", tx3.hash);
    } else {
      console.log("✅ Borrowing already enabled");
    }

  } catch (error) {
    console.error("\n❌ Configuration failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    process.exit(1);
  }

  // Verify final configuration
  console.log("\n============================================================");
  console.log("STEP 3: Verify Configuration");
  console.log("============================================================\n");

  const finalConfig = await pool.getConfiguration(HBAR_ADDRESS);
  const finalConfigData = BigInt(finalConfig.data);

  const finalLtv = Number(finalConfigData & LTV_MASK);
  const finalLiquidationThreshold = Number((finalConfigData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
  const finalIsActive = (finalConfigData & (1n << IS_ACTIVE_BIT)) !== 0n;
  const finalBorrowingEnabled = (finalConfigData & (1n << BORROWING_ENABLED_BIT)) !== 0n;

  console.log("📊 Final Configuration:");
  console.log("   LTV:", finalLtv, "basis points", `(${finalLtv / 100}%)`);
  console.log("   Liquidation Threshold:", finalLiquidationThreshold, "basis points", `(${finalLiquidationThreshold / 100}%)`);
  console.log("   Active:", finalIsActive ? "✅" : "❌");
  console.log("   Borrowing Enabled:", finalBorrowingEnabled ? "✅" : "❌");

  const allGood =
    finalLtv === TARGET_LTV &&
    finalLiquidationThreshold === TARGET_LIQUIDATION_THRESHOLD &&
    finalIsActive &&
    finalBorrowingEnabled;

  if (allGood) {
    console.log("\n✅ SUCCESS! HBAR is properly configured as collateral");
    console.log("\nNext Steps:");
    console.log("1. Ensure oracle price is set: npm run set:oracle");
    console.log("2. In the frontend, toggle collateral ON for your HBAR supply");
    console.log("3. After enabling collateral, you can borrow against your HBAR");
  } else {
    console.log("\n⚠️  Configuration applied but some values don't match target");
    console.log("   Please review the configuration above");
  }

  console.log("\n============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
