const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Completing Setup and Initializing Assets\n");
  
  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  
  const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  
  // 1. Complete provider setup
  console.log("📍 Setting up AddressesProvider...");
  await (await provider.setPoolConfiguratorImpl(deploymentInfo.addresses.POOL_CONFIGURATOR)).wait();
  await (await provider.setPoolImpl(deploymentInfo.addresses.POOL)).wait();
  console.log("✅ Provider configured");
  
  // 2. Initialize Pool
  console.log("📍 Initializing Pool...");
  await (await pool.initialize(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER)).wait();
  console.log("✅ Pool initialized");
  
  // 3. Initialize PoolConfigurator
  console.log("📍 Initializing PoolConfigurator...");
  await (await poolConfigurator.initialize(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER)).wait();
  console.log("✅ PoolConfigurator initialized");
  
  // 4. Grant PoolConfigurator Pool Admin role
  console.log("📍 Granting PoolConfigurator Pool Admin role...");
  await (await aclManager.addPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR)).wait();
  console.log("✅ Role granted");
  
  // 5. Initialize HBAR
  console.log("\n📍 Initializing HBAR...");
  await (await poolConfigurator.initAssets([{
    underlyingAsset: ethers.ZeroAddress,
    supplyTokenImpl: "0x0000000000000000000000000000000000000000", // Will be created
    variableDebtTokenImpl: "0x0000000000000000000000000000000000000000",
    supplyTokenName: "Dera HBAR",
    supplyTokenSymbol: "dHBAR",
    variableDebtTokenName: "Dera Variable Debt HBAR",
    variableDebtTokenSymbol: "vdHBAR",
    params: ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [8]),
    interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [deploymentInfo.addresses.RATE_STRATEGY])
  }], { gasLimit: 15000000 })).wait();
  console.log("✅ HBAR initialized!");
  
  console.log("\n🎉 Setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
