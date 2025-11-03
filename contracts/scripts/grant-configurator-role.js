const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Granting PoolConfigurator the Pool Admin Role\n");
  
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  
  console.log("Granting Pool Admin role to:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  
  const tx = await aclManager.addPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR);
  await tx.wait();
  
  console.log("✅ Pool Admin role granted!");
  
  // Verify
  const isPoolAdmin = await aclManager.isPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("Verification - Is Pool Admin:", isPoolAdmin);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
