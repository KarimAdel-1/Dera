const { ethers } = require("hardhat");
const fs = require("fs");

// Token IDs (Hedera format)
const HBAR_TOKEN_ID = "0.0.0"; // Native HBAR
const USDC_TOKEN_ID = "0.0.429274"; // USDC on Hedera Testnet

// Convert Hedera Token ID to EVM address
function tokenIdToAddress(tokenId) {
  if (tokenId === "0.0.0") {
    return ethers.ZeroAddress; // Native HBAR
  }
  const parts = tokenId.split('.');
  const num = parseInt(parts[2]);
  return '0x' + num.toString(16).padStart(40, '0');
}

const HBAR_ADDRESS = tokenIdToAddress(HBAR_TOKEN_ID);
const USDC_ADDRESS = tokenIdToAddress(USDC_TOKEN_ID);

async function main() {
  console.log("🔓 Activating Assets in Pool\n");
  console.log("Assets to activate:");
  console.log("  HBAR:", HBAR_TOKEN_ID, "→", HBAR_ADDRESS);
  console.log("  USDC:", USDC_TOKEN_ID, "→", USDC_ADDRESS);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;

  const pool = await ethers.getContractAt("DeraPool", poolAddress);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);

  // Check permissions
  console.log("\n📋 Checking permissions...");
  const isRiskAdmin = await aclManager.isRiskAdmin(deployer.address);
  console.log("  Risk Admin:", isRiskAdmin);

  if (!isRiskAdmin) {
    console.log("\n📍 Granting Risk Admin role...");
    await (await aclManager.addRiskAdmin(deployer.address)).wait();
    console.log("✅ Risk Admin granted");
  }

  // Check current status
  console.log("\n" + "=".repeat(60));
  console.log("CURRENT STATUS");
  console.log("=".repeat(60));

  const assetsList = await pool.getAssetsList();
  console.log("\nAssets in pool:", assetsList.length);

  for (const asset of assetsList) {
    const config = await pool.getConfiguration(asset);
    const data = await pool.getAssetData(asset);
    const tokenName = asset === HBAR_ADDRESS ? 'HBAR' : 'USDC';

    console.log(`\n  ${tokenName}:`);
    console.log(`    Address: ${asset}`);
    console.log(`    Active: ${config.isActive}`);
    console.log(`    Borrowing Enabled: ${config.borrowingEnabled}`);
    console.log(`    dToken: ${data.supplyTokenAddress}`);
    console.log(`    vToken: ${data.borrowTokenAddress}`);
  }

  // ========== ACTIVATE HBAR ==========
  console.log("\n" + "=".repeat(60));
  console.log("ACTIVATING HBAR");
  console.log("=".repeat(60));

  try {
    const hbarConfig = await pool.getConfiguration(HBAR_ADDRESS);

    if (!hbarConfig.isActive) {
      console.log("\n📍 Setting HBAR as active...");
      await (await poolConfigurator.setAssetActive(HBAR_ADDRESS, true)).wait();
      console.log("✅ HBAR activated");
    } else {
      console.log("✅ HBAR already active");
    }

    if (!hbarConfig.borrowingEnabled) {
      console.log("📍 Enabling HBAR borrowing...");
      await (await poolConfigurator.setAssetBorrowing(HBAR_ADDRESS, true)).wait();
      console.log("✅ HBAR borrowing enabled");
    } else {
      console.log("✅ HBAR borrowing already enabled");
    }

    // Configure as collateral if not already done
    console.log("📍 Configuring HBAR collateral parameters...");
    await (await poolConfigurator.configureAssetAsCollateral(
      HBAR_ADDRESS,
      7500,  // 75% LTV
      8000,  // 80% liquidation threshold
      10500  // 105% liquidation bonus
    )).wait();
    console.log("✅ HBAR collateral configured");

  } catch (error) {
    console.error("❌ HBAR activation failed:", error.message);
  }

  // ========== ACTIVATE USDC ==========
  console.log("\n" + "=".repeat(60));
  console.log("ACTIVATING USDC");
  console.log("=".repeat(60));

  try {
    const usdcConfig = await pool.getConfiguration(USDC_ADDRESS);

    if (!usdcConfig.isActive) {
      console.log("\n📍 Setting USDC as active...");
      await (await poolConfigurator.setAssetActive(USDC_ADDRESS, true)).wait();
      console.log("✅ USDC activated");
    } else {
      console.log("✅ USDC already active");
    }

    if (!usdcConfig.borrowingEnabled) {
      console.log("📍 Enabling USDC borrowing...");
      await (await poolConfigurator.setAssetBorrowing(USDC_ADDRESS, true)).wait();
      console.log("✅ USDC borrowing enabled");
    } else {
      console.log("✅ USDC borrowing already enabled");
    }

    // Configure as collateral if not already done
    console.log("📍 Configuring USDC collateral parameters...");
    await (await poolConfigurator.configureAssetAsCollateral(
      USDC_ADDRESS,
      8000,  // 80% LTV
      8500,  // 85% liquidation threshold
      10500  // 105% liquidation bonus
    )).wait();
    console.log("✅ USDC collateral configured");

  } catch (error) {
    console.error("❌ USDC activation failed:", error.message);
  }

  // Verify final status
  console.log("\n" + "=".repeat(60));
  console.log("FINAL STATUS");
  console.log("=".repeat(60));

  for (const asset of assetsList) {
    const config = await pool.getConfiguration(asset);
    const tokenName = asset === HBAR_ADDRESS ? 'HBAR' : 'USDC';

    console.log(`\n  ${tokenName}:`);
    console.log(`    Active: ${config.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`    Borrowing: ${config.borrowingEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`    LTV: ${config.ltv / 100}%`);
    console.log(`    Liquidation Threshold: ${config.liquidationThreshold / 100}%`);
  }

  console.log("\n🎉 Asset activation complete!");
  console.log("\n💡 You can now supply, borrow, withdraw, and repay these assets!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
