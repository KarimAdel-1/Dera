const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Fixing PoolConfigurator Pool Pointer\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const NEW_POOL = deploymentInfo.addresses.POOL;
  const POOL_CONFIGURATOR = deploymentInfo.addresses.POOL_CONFIGURATOR;

  console.log("📍 Contract Addresses:");
  console.log("   Deployer:", deployer.address);
  console.log("   PoolConfigurator:", POOL_CONFIGURATOR);
  console.log("   Expected Pool:", NEW_POOL);

  // Get contracts
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", POOL_CONFIGURATOR);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);

  // Check permissions
  console.log("\n📋 Checking Permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  console.log("   Pool Admin:", isPoolAdmin ? "✅" : "❌\n");

  if (!isPoolAdmin) {
    console.error("❌ ERROR: Deployer is not a Pool Admin!");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check Current Pool Pointer");
  console.log("=".repeat(60) + "\n");

  const currentPool = await poolConfigurator.getPool();
  console.log("📊 Current State:");
  console.log("   PoolConfigurator points to:", currentPool);
  console.log("   Expected Pool address:", NEW_POOL);
  console.log("   Match:", currentPool === NEW_POOL ? "✅" : "❌");

  if (currentPool === NEW_POOL) {
    console.log("\n✅ PoolConfigurator is already pointing to the correct Pool!");
    console.log("   No update needed.");
    return;
  }

  console.log("\n❌ PoolConfigurator is pointing to WRONG Pool!");
  console.log("   This is why finalizeInitAsset was failing.");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Update Pool Pointer");
  console.log("=".repeat(60) + "\n");

  console.log("🔧 Calling setPool() to update Pool address...");
  try {
    const tx = await poolConfigurator.setPool(NEW_POOL, { gasLimit: 300000 });
    await tx.wait();
    console.log("✅ Pool pointer updated");
    console.log("   Transaction:", tx.hash);
  } catch (error) {
    console.error("\n❌ setPool failed:", error.message);
    throw error;
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Verify Update");
  console.log("=".repeat(60) + "\n");

  const updatedPool = await poolConfigurator.getPool();
  console.log("📊 Updated State:");
  console.log("   PoolConfigurator now points to:", updatedPool);
  console.log("   Expected Pool address:", NEW_POOL);
  console.log("   Match:", updatedPool === NEW_POOL ? "✅" : "❌");

  console.log("\n" + "=".repeat(60));
  console.log("✅ SUCCESS! PoolConfigurator Fixed");
  console.log("=".repeat(60) + "\n");

  console.log("🎯 Next Steps:");
  console.log("1. Run: npx hardhat run scripts/reinit-hbar-in-new-pool.js --network testnet");
  console.log("2. This should now work since PoolConfigurator points to correct Pool");
  console.log("3. Then test with: npx hardhat run scripts/test-oracle-direct.js --network testnet\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
