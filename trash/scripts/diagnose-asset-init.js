const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Diagnostic script to check Pool and asset initialization readiness
 */
async function main() {
  console.log("🔍 Diagnosing Asset Initialization Issue\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Check if deployment-info.json exists
  if (!fs.existsSync("./deployment-info.json")) {
    console.log("❌ deployment-info.json not found");
    console.log("   Please run deployment first");
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  console.log("\n📋 Deployed Contracts:");
  console.log("  Pool:", deploymentInfo.addresses.POOL);
  console.log("  PoolConfigurator:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("  ACLManager:", deploymentInfo.addresses.ACL_MANAGER);

  // Check access control
  console.log("\n🔐 Checking Access Control...");
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);

  const deployerIsPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  const configuratorIsPoolAdmin = await aclManager.isPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR);

  console.log("  Deployer is Pool Admin:", deployerIsPoolAdmin);
  console.log("  Configurator is Pool Admin:", configuratorIsPoolAdmin);

  if (!deployerIsPoolAdmin) {
    console.log("\n⚠️  WARNING: Deployer is not a Pool Admin!");
    console.log("   Asset initialization will fail");
    console.log("   Run: npm run grant:configurator");
  }

  // Check Pool state
  console.log("\n📊 Checking Pool State...");
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);

  try {
    const assetsCount = await pool.getAssetsCount();
    console.log("  Assets count:", assetsCount.toString());

    const assetsList = await pool.getAssetsList();
    console.log("  Assets list:", assetsList);

    // Check if HBAR (address(0)) is already initialized
    try {
      const hbarData = await pool.getAssetData(ethers.ZeroAddress);
      console.log("\n  HBAR Asset Data:");
      console.log("    liquidityIndex:", hbarData.liquidityIndex.toString());
      console.log("    variableBorrowIndex:", hbarData.variableBorrowIndex.toString());
      console.log("    supplyTokenAddress:", hbarData.supplyTokenAddress);
      console.log("    borrowTokenAddress:", hbarData.borrowTokenAddress);
      console.log("    id:", hbarData.id.toString());

      if (hbarData.liquidityIndex > 0n) {
        console.log("\n⚠️  HBAR is already initialized!");
        console.log("   liquidityIndex:", hbarData.liquidityIndex.toString());
      }
    } catch (e) {
      console.log("  HBAR not yet initialized (this is expected for fresh deployment)");
    }
  } catch (e) {
    console.log("  Error reading pool state:", e.message.substring(0, 100));
  }

  // Test token deployment
  console.log("\n🧪 Testing Token Deployment...");
  try {
    const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
    const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");

    console.log("  ✅ Token factories loaded successfully");

    // Try deploying test implementations
    console.log("\n  Deploying test implementations...");
    const testDToken = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
    await testDToken.waitForDeployment();
    const testDTokenAddr = await testDToken.getAddress();
    console.log("  ✅ Test dToken implementation:", testDTokenAddr);

    const testVToken = await VToken.deploy(deploymentInfo.addresses.POOL);
    await testVToken.waitForDeployment();
    const testVTokenAddr = await testVToken.getAddress();
    console.log("  ✅ Test vToken implementation:", testVTokenAddr);

  } catch (e) {
    console.log("  ❌ Token deployment failed:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Diagnostic complete");
  console.log("\nIf all checks passed, asset initialization should work.");
  console.log("If not, review the warnings above.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
