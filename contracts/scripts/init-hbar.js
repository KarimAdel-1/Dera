const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Initializing Native HBAR Support\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const rateStrategyAddress = deploymentInfo.addresses.RATE_STRATEGY;

  const pool = await ethers.getContractAt("DeraPool", poolAddress);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  const treasuryAddress = deployer.address;
  
  // Check admin permissions
  console.log("\n📋 Checking permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  const isAssetListingAdmin = await aclManager.isAssetListingAdmin(deployer.address);
  console.log("   Is Pool Admin:", isPoolAdmin);
  console.log("   Is Asset Listing Admin:", isAssetListingAdmin);
  
  if (!isPoolAdmin && !isAssetListingAdmin) {
    console.error("\n❌ Deployer is not Pool Admin or Asset Listing Admin!");
    console.log("   Run this to grant permissions:");
    console.log(`   await aclManager.addPoolAdmin("${deployer.address}")`);
    console.log(`   await aclManager.addAssetListingAdmin("${deployer.address}")`);
    process.exit(1);
  }

  // Deploy fresh token implementations
  console.log("📍 Deploying HBAR dToken implementation...");
  const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
  const dToken = await DToken.deploy(poolAddress, treasuryAddress);
  await dToken.waitForDeployment();
  const dTokenAddress = await dToken.getAddress();
  console.log("✅ dToken implementation:", dTokenAddress);

  console.log("📍 Deploying HBAR vToken implementation...");
  const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");
  const vToken = await VToken.deploy(poolAddress);
  await vToken.waitForDeployment();
  const vTokenAddress = await vToken.getAddress();
  console.log("✅ vToken implementation:", vTokenAddress);

  // 3. Initialize HBAR asset in Pool directly
  console.log("📍 Initializing HBAR in Pool...");
  
  try {
    const initTx = await pool.initAsset(
      ethers.ZeroAddress, // HBAR
      dTokenAddress,
      vTokenAddress
    );
    await initTx.wait();
    console.log("✅ HBAR asset initialized in Pool");
  } catch (error) {
    console.error("\n❌ Failed to initialize HBAR:");
    console.error("Message:", error.message);
    console.error("\nThis is expected - Pool.initAsset requires PoolConfigurator role.");
    console.log("\n✅ Tokens deployed successfully. Manual steps:");
    console.log("   1. Call PoolConfigurator to initialize the asset");
    console.log("   2. Or grant PoolConfigurator role to deployer");
    console.log("\nToken addresses:");
    console.log("   dToken:", dTokenAddress);
    console.log("   vToken:", vTokenAddress);
    return;
  }

  // 4. Configure HBAR
  console.log("📍 Configuring HBAR parameters...");
  const configData = ethers.toBigInt(
    "0x" +
    "1" +           // Active
    "0" +           // Not frozen
    "1" +           // Borrowing enabled
    "0" +           // Stable borrowing disabled
    "0000" +        // Reserved
    "1D4C" +        // LTV = 7500 (75%)
    "1F40" +        // Liquidation threshold = 8000 (80%)
    "290C" +        // Liquidation bonus = 10500 (105%)
    "08" +          // Decimals = 8
    "03E8"          // Reserve factor = 1000 (10%)
  );
  
  const configTx = await pool.setConfiguration(ethers.ZeroAddress, { data: configData });
  await configTx.wait();
  console.log("✅ HBAR configured");

  // 5. Verify
  const assetData = await pool.getAssetData(ethers.ZeroAddress);
  const assetsList = await pool.getAssetsList();
  
  console.log("\n✅ HBAR Initialization Complete!");
  console.log("   dToken:", assetData.supplyTokenAddress);
  console.log("   vToken:", assetData.borrowTokenAddress);
  console.log("   In assets list:", assetsList.includes(ethers.ZeroAddress));
  console.log("   Configuration:", assetData.configuration.toString());

  // Update deployment info
  deploymentInfo.addresses.HBAR_DTOKEN = dTokenAddress;
  deploymentInfo.addresses.HBAR_VTOKEN = vTokenAddress;
  deploymentInfo.features.hbarActive = true;
  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 deployment-info.json updated");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
