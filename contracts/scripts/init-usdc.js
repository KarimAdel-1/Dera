const hre = require("hardhat");
const fs = require("fs");

const USDC_ADDRESS = "0x000000000000000000000000000000000006f89a"; // 0.0.456858

async function main() {
  console.log("🔧 Adding USDC to Dera Protocol\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const rateStrategyAddress = deploymentInfo.addresses.RATE_STRATEGY;

  const Pool = await hre.ethers.getContractAt("DeraPool", poolAddress);
  const PoolConfigurator = await hre.ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);

  // Check if USDC already initialized
  try {
    const assetData = await Pool.getAssetData(USDC_ADDRESS);
    if (assetData.supplyTokenAddress !== hre.ethers.ZeroAddress) {
      console.log("✅ USDC already initialized!");
      return;
    }
  } catch (e) {}

  // Deploy tokens
  console.log("\n📍 Deploying USDC dToken...");
  const DToken = await hre.ethers.getContractFactory("ConcreteDeraSupplyToken");
  const dToken = await DToken.deploy(poolAddress, deployer.address);
  await dToken.waitForDeployment();
  const dTokenAddress = await dToken.getAddress();
  console.log("✅ dToken:", dTokenAddress);

  console.log("📍 Deploying USDC vToken...");
  const VToken = await hre.ethers.getContractFactory("ConcreteDeraBorrowToken");
  const vToken = await VToken.deploy(poolAddress);
  await vToken.waitForDeployment();
  const vTokenAddress = await vToken.getAddress();
  console.log("✅ vToken:", vTokenAddress);

  // Initialize
  console.log("\n📍 Initializing USDC...");
  const params = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [6]);
  const tx = await PoolConfigurator.initAssets([{
    supplyTokenImpl: dTokenAddress,
    variableDebtTokenImpl: vTokenAddress,
    underlyingAsset: USDC_ADDRESS,
    supplyTokenName: "Dera USDC",
    supplyTokenSymbol: "dUSDC",
    variableDebtTokenName: "Dera Variable Debt USDC",
    variableDebtTokenSymbol: "vdUSDC",
    params: params,
    interestRateData: hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
  }], { gasLimit: 10000000 });
  
  await tx.wait();
  console.log("✅ USDC initialized");

  // Configure
  console.log("\n📍 Configuring USDC...");
  await (await PoolConfigurator.configureAssetAsCollateral(USDC_ADDRESS, 8000, 8500, 10500)).wait();
  await (await PoolConfigurator.setAssetActive(USDC_ADDRESS, true)).wait();
  await (await PoolConfigurator.setAssetBorrowing(USDC_ADDRESS, true)).wait();
  console.log("✅ USDC configured");

  console.log("\n🎉 USDC added successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
