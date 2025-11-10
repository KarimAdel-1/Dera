const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Redeploy PoolConfigurator with setAssetDecimals function
 * This script:
 * 1. Deploys new DeraPoolConfigurator with setAssetDecimals function
 * 2. Updates PoolAddressesProvider to point to new configurator
 * 3. Initializes the new configurator
 */

async function main() {
  console.log("🔄 Upgrading PoolConfigurator\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  console.log("📍 Current Deployment:");
  console.log("   Deployer:", deployer.address);
  console.log("   Old PoolConfigurator:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("   PoolAddressesProvider:", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("   Account balance:", ethers.formatEther(balance), "HBAR\n");

  // Get existing contracts
  const addressesProvider = await ethers.getContractAt(
    "PoolAddressesProvider",
    deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER
  );

  const aclManager = await ethers.getContractAt(
    "ACLManager",
    deploymentInfo.addresses.ACL_MANAGER
  );

  // Check permissions
  console.log("📋 Checking Permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  console.log("   Pool Admin:", isPoolAdmin ? "✅" : "❌\n");

  if (!isPoolAdmin) {
    console.error("❌ ERROR: Deployer is not a Pool Admin!");
    console.log("   You need Pool Admin role to upgrade PoolConfigurator");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("STEP 1: Deploy New PoolConfigurator");
  console.log("=".repeat(60) + "\n");

  // Get ConfiguratorLogic library address
  const configuratorLogicAddress = deploymentInfo.addresses.CONFIGURATOR_LOGIC;
  console.log("📚 Using ConfiguratorLogic library:", configuratorLogicAddress);

  const PoolConfigurator = await ethers.getContractFactory("DeraPoolConfigurator", {
    libraries: {
      ConfiguratorLogic: configuratorLogicAddress
    }
  });

  console.log("🚀 Deploying new PoolConfigurator...");
  const newPoolConfigurator = await PoolConfigurator.deploy();
  await newPoolConfigurator.waitForDeployment();

  const newConfiguratorAddress = await newPoolConfigurator.getAddress();
  console.log("✅ New PoolConfigurator deployed:", newConfiguratorAddress);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Update PoolAddressesProvider");
  console.log("=".repeat(60) + "\n");

  console.log("📝 Updating PoolConfigurator address in AddressesProvider...");
  const tx1 = await addressesProvider.setPoolConfiguratorImpl(newConfiguratorAddress);
  await tx1.wait();
  console.log("✅ AddressesProvider updated");
  console.log("   Transaction:", tx1.hash);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Initialize New PoolConfigurator");
  console.log("=".repeat(60) + "\n");

  const poolConfiguratorInstance = await ethers.getContractAt(
    "DeraPoolConfigurator",
    newConfiguratorAddress
  );

  console.log("🔧 Initializing new PoolConfigurator...");
  try {
    const tx2 = await poolConfiguratorInstance.initialize(
      deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER
    );
    await tx2.wait();
    console.log("✅ New PoolConfigurator initialized");
    console.log("   Transaction:", tx2.hash);
  } catch (error) {
    if (error.message.includes("already been initialized")) {
      console.log("⚠️  PoolConfigurator already initialized (Hedera address reuse)");
      console.log("🔧 Attempting recovery...");

      const tx3 = await poolConfiguratorInstance.recoverFromAddressReuse(
        deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER
      );
      await tx3.wait();
      console.log("✅ PoolConfigurator recovered successfully");
      console.log("   Transaction:", tx3.hash);
    } else {
      throw error;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Verify New PoolConfigurator");
  console.log("=".repeat(60) + "\n");

  // Verify the new configurator is set correctly
  const registeredConfigurator = await addressesProvider.getPoolConfigurator();
  console.log("📊 Verification:");
  console.log("   Registered in AddressesProvider:", registeredConfigurator);
  console.log("   Matches new deployment:", registeredConfigurator === newConfiguratorAddress ? "✅" : "❌");

  // Verify it has the new function
  console.log("\n🔍 Checking for setAssetDecimals function...");
  try {
    const hasFunction = typeof poolConfiguratorInstance.setAssetDecimals === 'function';
    console.log("   setAssetDecimals available:", hasFunction ? "✅" : "❌");
  } catch (error) {
    console.log("   setAssetDecimals available: ❌");
  }

  // Update deployment-info.json
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Update deployment-info.json");
  console.log("=".repeat(60) + "\n");

  deploymentInfo.addresses.POOL_CONFIGURATOR_OLD = deploymentInfo.addresses.POOL_CONFIGURATOR;
  deploymentInfo.addresses.POOL_CONFIGURATOR = newConfiguratorAddress;
  deploymentInfo.upgraded = deploymentInfo.upgraded || {};
  deploymentInfo.upgraded.poolConfiguratorUpgradeDate = new Date().toISOString();
  deploymentInfo.upgraded.reason = "Added setAssetDecimals function to fix HBAR decimals bug";

  fs.writeFileSync(
    "./deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("✅ deployment-info.json updated");
  console.log("   Old PoolConfigurator saved as POOL_CONFIGURATOR_OLD");

  console.log("\n" + "=".repeat(60));
  console.log("✅ UPGRADE COMPLETE!");
  console.log("=".repeat(60) + "\n");

  console.log("📝 Summary:");
  console.log("   Old PoolConfigurator:", deploymentInfo.addresses.POOL_CONFIGURATOR_OLD);
  console.log("   New PoolConfigurator:", newConfiguratorAddress);
  console.log("   Added function: setAssetDecimals(address asset, uint8 decimals)");

  console.log("\n🎯 Next Steps:");
  console.log("1. Run: npx hardhat run scripts/fix-hbar-decimals-simple.js --network testnet");
  console.log("2. This will use the new setAssetDecimals function to fix HBAR decimals");
  console.log("3. Verify getUserAccountData returns correct values");
  console.log("4. Test frontend to confirm collateral displays correctly\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
