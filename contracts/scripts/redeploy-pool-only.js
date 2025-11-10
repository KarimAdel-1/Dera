const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Redeploying Pool with Fixed AssetLogic\n");
  
  console.log("📍 Cleaning and recompiling...");
  const { execSync } = require('child_process');
  execSync('npx hardhat clean', { stdio: 'inherit' });
  execSync('npx hardhat compile', { stdio: 'inherit' });
  console.log("✅ Recompiled with fixes\n");
  
  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  
  // Redeploy libraries
  console.log("📍 Deploying libraries...");
  const SupplyLogic = await ethers.getContractFactory("SupplyLogic");
  const supplyLogic = await SupplyLogic.deploy();
  await supplyLogic.waitForDeployment();
  
  const BorrowLogic = await ethers.getContractFactory("BorrowLogic");
  const borrowLogic = await BorrowLogic.deploy();
  await borrowLogic.waitForDeployment();
  
  const LiquidationLogic = await ethers.getContractFactory("LiquidationLogic");
  const liquidationLogic = await LiquidationLogic.deploy();
  await liquidationLogic.waitForDeployment();
  
  const PoolLogic = await ethers.getContractFactory("PoolLogic");
  const poolLogic = await PoolLogic.deploy();
  await poolLogic.waitForDeployment();
  
  console.log("✅ Libraries deployed");
  
  // Redeploy Pool
  console.log("📍 Deploying Pool...");
  const Pool = await ethers.getContractFactory("DeraPool", {
    libraries: {
      SupplyLogic: await supplyLogic.getAddress(),
      BorrowLogic: await borrowLogic.getAddress(),
      LiquidationLogic: await liquidationLogic.getAddress(),
      PoolLogic: await poolLogic.getAddress()
    }
  });
  const pool = await Pool.deploy(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER, deploymentInfo.addresses.RATE_STRATEGY);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("✅ Pool:", poolAddress);
  
  // Update provider
  console.log("📍 Updating AddressesProvider...");
  const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  await (await provider.setPoolImpl(poolAddress)).wait();
  console.log("✅ Provider updated");
  
  // Initialize Pool
  console.log("📍 Initializing Pool...");
  try {
    await (await pool.initialize(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER)).wait();
    console.log("✅ Pool initialized");
  } catch (error) {
    if (error.message.includes("already been initialized")) {
      console.log("⚠️  Pool already initialized (Hedera address reuse) - skipping");
    } else {
      throw error;
    }
  }
  
  // Update deployment info - update both addresses and deploymentLog for consistency
  deploymentInfo.addresses.POOL = poolAddress;
  // Find and update Pool in deploymentLog
  const poolLogIndex = deploymentInfo.deploymentLog.findIndex(entry => entry.startsWith("Pool: "));
  if (poolLogIndex !== -1) {
    deploymentInfo.deploymentLog[poolLogIndex] = `Pool: ${poolAddress}`;
  } else {
    deploymentInfo.deploymentLog.push(`Pool: ${poolAddress}`);
  }
  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ deployment-info.json updated");
  console.log("New Pool address:", poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
