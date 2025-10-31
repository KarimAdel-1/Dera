const hre = require("hardhat");
const fs = require("fs");

const WHBAR_ADDRESS = "0x0000000000000000000000000000000000163a9a";

async function main() {
  console.log("🔧 Adding WHBAR to Dera Protocol\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const rateStrategyAddress = deploymentInfo.addresses.RATE_STRATEGY;

  const Pool = await hre.ethers.getContractAt("DeraPool", poolAddress);
  const PoolConfigurator = await hre.ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);

  // Check if WHBAR already initialized
  try {
    const assetData = await Pool.getAssetData(WHBAR_ADDRESS);
    if (assetData.supplyTokenAddress !== hre.ethers.ZeroAddress) {
      console.log("✅ WHBAR already initialized!");
      console.log("   dToken:", assetData.supplyTokenAddress);
      console.log("   vToken:", assetData.borrowTokenAddress);
      return;
    }
  } catch (e) {
    console.log("WHBAR not yet initialized, proceeding...");
  }

  // Deploy tokens
  console.log("\n📍 Deploying WHBAR dToken...");
  const DToken = await hre.ethers.getContractFactory("ConcreteDeraSupplyToken");
  const dToken = await DToken.deploy(poolAddress, deployer.address);
  await dToken.waitForDeployment();
  const dTokenAddress = await dToken.getAddress();
  console.log("✅ dToken:", dTokenAddress);

  console.log("📍 Deploying WHBAR vToken...");
  const VToken = await hre.ethers.getContractFactory("ConcreteDeraBorrowToken");
  const vToken = await VToken.deploy(poolAddress);
  await vToken.waitForDeployment();
  const vTokenAddress = await vToken.getAddress();
  console.log("✅ vToken:", vTokenAddress);

  // Try to initialize
  console.log("\n📍 Initializing WHBAR...");
  try {
    const tx = await PoolConfigurator.initAssets([{
      supplyTokenImpl: dTokenAddress,
      variableDebtTokenImpl: vTokenAddress,
      underlyingAsset: WHBAR_ADDRESS,
      supplyTokenName: "Dera WHBAR",
      supplyTokenSymbol: "dWHBAR",
      variableDebtTokenName: "Dera Variable Debt WHBAR",
      variableDebtTokenSymbol: "vdWHBAR",
      params: "0x10",
      interestRateData: hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
    }], { gasLimit: 5000000 });
    
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("✅ WHBAR initialized");

    // Configure
    console.log("\n📍 Configuring WHBAR...");
    await (await PoolConfigurator.configureAssetAsCollateral(WHBAR_ADDRESS, 7500, 8000, 10500)).wait();
    await (await PoolConfigurator.setAssetActive(WHBAR_ADDRESS, true)).wait();
    await (await PoolConfigurator.setAssetBorrowing(WHBAR_ADDRESS, true)).wait();
    console.log("✅ WHBAR configured");

    console.log("\n🎉 WHBAR added successfully!");
  } catch (error) {
    console.error("\n❌ Failed:", error.message);
    console.log("\n📝 Manual steps:");
    console.log("   dToken:", dTokenAddress);
    console.log("   vToken:", vTokenAddress);
    console.log("   WHBAR:", WHBAR_ADDRESS);
    console.log("\n   Call PoolConfigurator.initAssets() with above addresses");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
