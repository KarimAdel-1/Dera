const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Redeploying PoolConfigurator\n");
  
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  
  // Deploy ConfiguratorLogic
  console.log("📍 Deploying ConfiguratorLogic...");
  const ConfiguratorLogic = await ethers.getContractFactory("ConfiguratorLogic");
  const configuratorLogic = await ConfiguratorLogic.deploy();
  await configuratorLogic.waitForDeployment();
  console.log("✅ ConfiguratorLogic deployed");
  
  // Deploy PoolConfigurator
  console.log("📍 Deploying PoolConfigurator...");
  const PoolConfigurator = await ethers.getContractFactory("DeraPoolConfigurator", {
    libraries: {
      ConfiguratorLogic: await configuratorLogic.getAddress()
    }
  });
  const poolConfigurator = await PoolConfigurator.deploy();
  await poolConfigurator.waitForDeployment();
  const poolConfiguratorAddress = await poolConfigurator.getAddress();
  console.log("✅ PoolConfigurator:", poolConfiguratorAddress);
  
  // Update provider
  console.log("📍 Updating AddressesProvider...");
  const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  await (await provider.setPoolConfiguratorImpl(poolConfiguratorAddress)).wait();
  console.log("✅ Provider updated");
  
  // Initialize PoolConfigurator (skip if already initialized)
  console.log("📍 Initializing PoolConfigurator...");
  console.log("  Calling initialize on:", poolConfiguratorAddress);
  console.log("  With provider:", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  try {
    await (await poolConfigurator.initialize(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER)).wait();
    console.log("✅ PoolConfigurator initialized");
  } catch (e) {
    if (e.message.includes("already been initialized")) {
      console.log("✅ PoolConfigurator already initialized (this is OK for fresh deployment)");
    } else {
      console.log("❌ Initialization error:", e.message.substring(0, 200));
      throw e;
    }
  }
  
  // Grant role
  console.log("📍 Granting Pool Admin role...");
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  await (await aclManager.addPoolAdmin(poolConfiguratorAddress)).wait();
  console.log("✅ Role granted");
  
  // Update deployment info - update both addresses and deploymentLog for consistency
  deploymentInfo.addresses.POOL_CONFIGURATOR = poolConfiguratorAddress;
  // Find and update PoolConfigurator in deploymentLog
  const configuratorLogIndex = deploymentInfo.deploymentLog.findIndex(entry => entry.startsWith("PoolConfigurator: "));
  if (configuratorLogIndex !== -1) {
    deploymentInfo.deploymentLog[configuratorLogIndex] = `PoolConfigurator: ${poolConfiguratorAddress}`;
  } else {
    // If not found, add it
    deploymentInfo.deploymentLog.push(`PoolConfigurator: ${poolConfiguratorAddress}`);
  }
  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ deployment-info.json updated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
