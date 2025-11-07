const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Deploy only PoolConfigurator - use when other contracts are already deployed
 * Reads from deployment-partial.json
 */

async function main() {
  console.log("🔄 Deploying PoolConfigurator Only\n");

  // Check for partial deployment
  if (!fs.existsSync("./deployment-partial.json")) {
    console.error("❌ No deployment-partial.json found!");
    console.error("   This script requires a partial deployment with Pool already deployed.");
    process.exit(1);
  }

  const partial = JSON.parse(fs.readFileSync("./deployment-partial.json", "utf8"));
  console.log("📂 Loaded partial deployment:");
  console.log("   Pool:", partial.addresses.POOL);
  console.log("   ACLManager:", partial.addresses.ACL_MANAGER);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("");

  try {
    // Deploy ConfiguratorLogic
    console.log("📍 1/2 Deploying ConfiguratorLogic...");
    const ConfiguratorLogic = await ethers.getContractFactory("ConfiguratorLogic");
    const configuratorLogic = await ConfiguratorLogic.deploy();
    await configuratorLogic.waitForDeployment();
    const configuratorLogicAddress = await configuratorLogic.getAddress();
    console.log("✅ ConfiguratorLogic:", configuratorLogicAddress);

    // Add 30 second delay to let Hedera process
    console.log("⏱️  Waiting 30 seconds for Hedera to process library...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Deploy PoolConfigurator
    console.log("📍 2/2 Deploying PoolConfigurator...");
    const PoolConfigurator = await ethers.getContractFactory("DeraPoolConfigurator", {
      libraries: {
        ConfiguratorLogic: configuratorLogicAddress
      }
    });

    console.log("   Creating deployment transaction...");
    const poolConfigurator = await PoolConfigurator.deploy();

    console.log("   Waiting for deployment confirmation...");
    await poolConfigurator.waitForDeployment();

    const poolConfiguratorAddress = await poolConfigurator.getAddress();
    console.log("✅ PoolConfigurator:", poolConfiguratorAddress);

    // Update addresses provider
    console.log("\n📍 Updating AddressesProvider...");
    const addressesProvider = await ethers.getContractAt(
      "PoolAddressesProvider",
      partial.addresses.POOL_ADDRESSES_PROVIDER
    );
    await (await addressesProvider.setPoolConfiguratorImpl(poolConfiguratorAddress)).wait();
    console.log("✅ AddressesProvider updated");

    // Initialize PoolConfigurator
    console.log("\n📍 Initializing PoolConfigurator...");
    try {
      await (await poolConfigurator.initialize(partial.addresses.POOL_ADDRESSES_PROVIDER)).wait();
      console.log("✅ PoolConfigurator initialized");
    } catch (e) {
      if (e.message.includes("already been initialized")) {
        console.log("⚠️  Already initialized (OK)");
      } else {
        throw e;
      }
    }

    // Update deployment info
    const deploymentInfo = {
      ...partial,
      addresses: {
        ...partial.addresses,
        POOL_CONFIGURATOR: poolConfiguratorAddress
      },
      deploymentLog: [
        ...partial.deploymentLog,
        `PoolConfigurator: ${poolConfiguratorAddress}`
      ],
      completedAt: new Date().toISOString()
    };

    fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
    console.log("\n✅ deployment-info.json updated");
    console.log("\n🎉 PoolConfigurator deployed successfully!");
    console.log("   Address:", poolConfiguratorAddress);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
