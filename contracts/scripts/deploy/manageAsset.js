/**
 * Asset Management Script
 *
 * Utility for adding or removing individual assets
 *
 * Usage:
 *   # Add a new asset
 *   npx hardhat run scripts/deploy/manageAsset.js --network testnet
 *
 *   # Then follow the prompts or edit the script directly
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const assetsConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/assets.json"),
    "utf8"
  )
);

const DEPLOYMENT_FILE = path.join(__dirname, "../config/deployments.json");

function loadDeployments() {
  if (fs.existsSync(DEPLOYMENT_FILE)) {
    return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  }
  return {};
}

function saveDeployments(deployments) {
  fs.writeFileSync(
    DEPLOYMENT_FILE,
    JSON.stringify(deployments, null, 2),
    "utf8"
  );
}

/**
 * Add a single asset
 */
async function addAsset(symbol, assetConfig, pool, poolConfigurator, oracle, deployer) {
  console.log(`\n--- Adding ${symbol} ---`);

  // Check if already exists
  const assetsList = await pool.getAssetsList();
  if (assetsList.includes(assetConfig.address)) {
    console.log(`⚠️  ${symbol} already exists, skipping...`);
    return null;
  }

  // Configure Oracle
  if (assetConfig.pyth_price_feed) {
    console.log(`Setting Pyth price feed...`);
    const setPriceFeedTx = await oracle.setAssetPriceFeed(
      assetConfig.address,
      assetConfig.pyth_price_feed
    );
    await setPriceFeedTx.wait();
    console.log(`✓ Price feed configured`);
  }

  // Deploy tokens
  console.log(`Deploying dToken...`);
  const DToken = await hre.ethers.getContractFactory("DeraSupplyToken");
  const dToken = await DToken.deploy(
    await pool.getAddress(),
    assetConfig.address,
    assetConfig.decimals,
    `Dera ${assetConfig.name}`,
    `d${symbol}`
  );
  await dToken.waitForDeployment();
  const dTokenAddress = await dToken.getAddress();

  console.log(`Deploying Stable Debt Token...`);
  const StableDebtToken = await hre.ethers.getContractFactory("DeraStableDebtToken");
  const stableDebtToken = await StableDebtToken.deploy(
    await pool.getAddress(),
    assetConfig.address,
    assetConfig.decimals,
    `Dera Stable Debt ${assetConfig.name}`,
    `stableDebt${symbol}`
  );
  await stableDebtToken.waitForDeployment();
  const stableDebtTokenAddress = await stableDebtToken.getAddress();

  console.log(`Deploying Variable Debt Token...`);
  const VariableDebtToken = await hre.ethers.getContractFactory("DeraVariableDebtToken");
  const variableDebtToken = await VariableDebtToken.deploy(
    await pool.getAddress(),
    assetConfig.address,
    assetConfig.decimals,
    `Dera Variable Debt ${assetConfig.name}`,
    `variableDebt${symbol}`
  );
  await variableDebtToken.waitForDeployment();
  const variableDebtTokenAddress = await variableDebtToken.getAddress();

  console.log(`Deploying Interest Rate Strategy...`);
  const InterestRateStrategy = await hre.ethers.getContractFactory("DeraInterestRateModel");
  const optimalUtilizationRate = hre.ethers.parseUnits(assetConfig.optimalUtilizationRate, 27);
  const baseVariableBorrowRate = hre.ethers.parseUnits(assetConfig.baseVariableBorrowRate, 27);
  const variableRateSlope1 = hre.ethers.parseUnits(assetConfig.variableRateSlope1, 27);
  const variableRateSlope2 = hre.ethers.parseUnits(assetConfig.variableRateSlope2, 27);

  const interestRateStrategy = await InterestRateStrategy.deploy(
    await pool.getAddress(),
    optimalUtilizationRate,
    baseVariableBorrowRate,
    variableRateSlope1,
    variableRateSlope2
  );
  await interestRateStrategy.waitForDeployment();
  const interestRateStrategyAddress = await interestRateStrategy.getAddress();

  // Initialize in Pool
  console.log(`Initializing asset in Pool...`);
  const initTx = await poolConfigurator.initAsset(
    assetConfig.address,
    dTokenAddress,
    stableDebtTokenAddress,
    variableDebtTokenAddress,
    interestRateStrategyAddress
  );
  await initTx.wait();

  // Configure parameters
  console.log(`Configuring parameters...`);
  await (await poolConfigurator.setAssetLtv(assetConfig.address, assetConfig.ltv)).wait();
  await (await poolConfigurator.setAssetLiquidationThreshold(
    assetConfig.address,
    assetConfig.liquidationThreshold
  )).wait();
  await (await poolConfigurator.setAssetLiquidationBonus(
    assetConfig.address,
    assetConfig.liquidationBonus
  )).wait();
  await (await poolConfigurator.setAssetReserveFactor(
    assetConfig.address,
    assetConfig.reserveFactor
  )).wait();
  await (await poolConfigurator.setBorrowCap(assetConfig.address, assetConfig.borrowCap)).wait();
  await (await poolConfigurator.setSupplyCap(assetConfig.address, assetConfig.supplyCap)).wait();

  if (assetConfig.borrowEnabled) {
    await (await poolConfigurator.enableBorrowing(assetConfig.address)).wait();
  }

  console.log(`✅ ${symbol} added successfully!`);

  return {
    address: assetConfig.address,
    dToken: dTokenAddress,
    stableDebtToken: stableDebtTokenAddress,
    variableDebtToken: variableDebtTokenAddress,
    interestRateStrategy: interestRateStrategyAddress,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Remove an asset (disable it)
 */
async function removeAsset(symbol, assetAddress, poolConfigurator) {
  console.log(`\n--- Removing ${symbol} ---`);

  // Disable borrowing
  console.log(`Disabling borrowing...`);
  await (await poolConfigurator.disableBorrowing(assetAddress)).wait();

  // Freeze asset (prevents new supply/borrow)
  console.log(`Freezing asset...`);
  await (await poolConfigurator.setAssetFreeze(assetAddress, true)).wait();

  console.log(`✅ ${symbol} disabled successfully!`);
  console.log(`Note: Existing positions remain active. Users can still repay and withdraw.`);
}

/**
 * Main function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("⚙️  Dera Protocol - Asset Management");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}\n`);

  // Load deployments
  const deployments = loadDeployments();
  if (!deployments[network]) {
    throw new Error(`No deployments found for network: ${network}`);
  }

  // Get contracts
  const poolAddress = deployments[network].Pool;
  const poolConfiguratorAddress = deployments[network].PoolConfigurator;
  const oracleAddress = deployments[network].DeraOracle;

  const pool = await hre.ethers.getContractAt("Pool", poolAddress);
  const poolConfigurator = await hre.ethers.getContractAt("PoolConfigurator", poolConfiguratorAddress);
  const oracle = await hre.ethers.getContractAt("DeraOracle", oracleAddress);

  // Get asset configurations
  const assets = assetsConfig[network];
  if (!assets) {
    throw new Error(`No asset configuration found for network: ${network}`);
  }

  // Example: Add a specific asset
  // Change 'USDC' to the symbol you want to add
  const symbolToAdd = "USDC";

  if (assets[symbolToAdd]) {
    const result = await addAsset(
      symbolToAdd,
      assets[symbolToAdd],
      pool,
      poolConfigurator,
      oracle,
      deployer
    );

    if (result) {
      // Save deployment
      if (!deployments[network].assets) {
        deployments[network].assets = {};
      }
      deployments[network].assets[symbolToAdd] = result;
      saveDeployments(deployments);
    }
  } else {
    console.log(`Asset ${symbolToAdd} not found in configuration`);
  }

  // Example: Remove an asset
  // Uncomment to use:
  // await removeAsset("SAUCE", assets.SAUCE.address, poolConfigurator);

  console.log("\n" + "=".repeat(60));
  console.log("✅ Asset management complete!");
  console.log("=".repeat(60));
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
