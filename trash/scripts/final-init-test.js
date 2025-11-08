const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Final Initialization Test with Fixed AssetLogic\n");
  
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  
  // Grant role if needed
  const isPoolAdmin = await aclManager.isPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR);
  if (!isPoolAdmin) {
    console.log("📍 Granting PoolConfigurator Pool Admin role...");
    await (await aclManager.addPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR)).wait();
    console.log("✅ Role granted");
  } else {
    console.log("✅ PoolConfigurator already has Pool Admin role");
  }
  
  // Now run direct-init
  console.log("\n📍 Running direct initialization...\n");
  const directInit = require("./direct-init.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
