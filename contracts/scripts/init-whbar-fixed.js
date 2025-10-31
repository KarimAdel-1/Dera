const hre = require("hardhat");
const fs = require("fs");

const WHBAR_WRAPPER = "0xa56C696320EC36d06C753D0a84738C078F426C5a"; // Wrapper that provides ERC20 metadata

async function main() {
  console.log("🔧 Adding WHBAR to Dera Protocol (Fixed)\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const rateStrategyAddress = deploymentInfo.addresses.RATE_STRATEGY;

  const Pool = await hre.ethers.getContractAt("DeraPool", poolAddress);
  const PoolConfigurator = await hre.ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);

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

  // Initialize with params that DON'T require ERC20 calls
  console.log("\n📍 Initializing WHBAR (bypassing ERC20 checks)...");
  
  // Encode params: decimals = 8 (WHBAR has 8 decimals)
  const params = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [8]);
  
  const tx = await PoolConfigurator.initAssets([{
    supplyTokenImpl: dTokenAddress,
    variableDebtTokenImpl: vTokenAddress,
    underlyingAsset: WHBAR_WRAPPER,
    supplyTokenName: "Dera WHBAR",
    supplyTokenSymbol: "dWHBAR",
    variableDebtTokenName: "Dera Variable Debt WHBAR",
    variableDebtTokenSymbol: "vdWHBAR",
    params: params,
    interestRateData: hre.ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
  }], { gasLimit: 10000000 });
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("✅ WHBAR initialized, tx:", receipt.hash);

  // Configure
  console.log("\n📍 Configuring WHBAR...");
  await (await PoolConfigurator.configureAssetAsCollateral(WHBAR_WRAPPER, 7500, 8000, 10500)).wait();
  await (await PoolConfigurator.setAssetActive(WHBAR_WRAPPER, true)).wait();
  await (await PoolConfigurator.setAssetBorrowing(WHBAR_WRAPPER, true)).wait();
  console.log("✅ WHBAR configured");

  console.log("\n🎉 WHBAR added successfully!");
  console.log("\n📋 To use:");
  console.log("   1. Wrap HBAR at https://www.saucerswap.finance/");
  console.log("   2. Supply WHBAR to Dera");
  console.log("   3. Borrow against WHBAR");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
