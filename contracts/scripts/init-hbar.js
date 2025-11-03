const { ethers } = require("hardhat");
const fs = require("fs");

const HBAR_TOKEN_ID = "0.0.0"; // Native HBAR

async function main() {
  console.log("🚀 Initializing Native HBAR Support\n");
  console.log("HBAR Token ID:", HBAR_TOKEN_ID, "(Native)");
  console.log("HBAR Address:", ethers.ZeroAddress, "(0x0...0)\n");

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

  // 3. Initialize HBAR via PoolConfigurator
  console.log("📍 Initializing HBAR via PoolConfigurator...");
  const params = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [8]); // 8 decimals for HBAR
  
  const initTx = await poolConfigurator.initAssets([{
    supplyTokenImpl: dTokenAddress,
    variableDebtTokenImpl: vTokenAddress,
    underlyingAsset: ethers.ZeroAddress,
    supplyTokenName: "Dera HBAR",
    supplyTokenSymbol: "dHBAR",
    variableDebtTokenName: "Dera Variable Debt HBAR",
    variableDebtTokenSymbol: "vdHBAR",
    params: params,
    interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
  }], { gasLimit: 10000000 });
  
  await initTx.wait();
  console.log("✅ HBAR asset initialized");

  // 4. Configure HBAR
  console.log("📍 Configuring HBAR parameters...");
  await (await poolConfigurator.configureAssetAsCollateral(ethers.ZeroAddress, 7500, 8000, 10500)).wait();
  await (await poolConfigurator.setAssetActive(ethers.ZeroAddress, true)).wait();
  await (await poolConfigurator.setAssetBorrowing(ethers.ZeroAddress, true)).wait();
  console.log("✅ HBAR configured");

  // 5. Verify
  const assetData = await pool.getAssetData(ethers.ZeroAddress);
  const assetsList = await pool.getAssetsList();
  
  console.log("\n✅ HBAR Initialization Complete!");
  console.log("   Token ID:", HBAR_TOKEN_ID);
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
