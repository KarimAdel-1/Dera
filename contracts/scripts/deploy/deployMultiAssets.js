/**
 * Multi-Asset Deployment Script
 *
 * Deploys and configures multiple assets for Dera Protocol
 * Supports both testnet and mainnet deployments
 *
 * Usage:
 *   npx hardhat run scripts/deploy/deployMultiAssets.js --network testnet
 *   npx hardhat run scripts/deploy/deployMultiAssets.js --network mainnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load asset configurations
const assetsConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/assets.json"),
    "utf8"
  )
);

// Deployment state file
const DEPLOYMENT_FILE = path.join(__dirname, "../config/deployments.json");

/**
 * Load existing deployment state
 */
function loadDeployments() {
  if (fs.existsSync(DEPLOYMENT_FILE)) {
    return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  }
  return {};
}

/**
 * Save deployment state
 */
function saveDeployments(deployments) {
  fs.writeFileSync(
    DEPLOYMENT_FILE,
    JSON.stringify(deployments, null, 2),
    "utf8"
  );
}

/**
 * Main deployment function
 */
async function main() {
  console.log("="

.repeat(60));
  console.log("🚀 Dera Protocol - Multi-Asset Deployment");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} HBAR`);
  console.log("");

  // Load existing deployments
  const deployments = loadDeployments();
  if (!deployments[network]) {
    deployments[network] = {};
  }

  // Get asset configurations for current network
  const assets = assetsConfig[network];
  if (!assets) {
    throw new Error(`No asset configuration found for network: ${network}`);
  }

  console.log(`Found ${Object.keys(assets).length} assets to configure:`);
  Object.keys(assets).forEach(symbol => {
    console.log(`  - ${assets[symbol].name} (${symbol})`);
  });
  console.log("");

  // Get Pool and PoolConfigurator contracts
  const poolAddress = deployments[network].Pool;
  const poolConfiguratorAddress = deployments[network].PoolConfigurator;
  const oracleAddress = deployments[network].DeraOracle;

  if (!poolAddress || !poolConfiguratorAddress || !oracleAddress) {
    throw new Error("Pool, PoolConfigurator, or Oracle not deployed. Please deploy core contracts first.");
  }

  console.log("Core contracts:");
  console.log(`  Pool: ${poolAddress}`);
  console.log(`  PoolConfigurator: ${poolConfiguratorAddress}`);
  console.log(`  Oracle: ${oracleAddress}`);
  console.log("");

  // Get contract instances
  const pool = await hre.ethers.getContractAt("Pool", poolAddress);
  const poolConfigurator = await hre.ethers.getContractAt("PoolConfigurator", poolConfiguratorAddress);
  const oracle = await hre.ethers.getContractAt("DeraOracle", oracleAddress);

  // Initialize assets
  console.log("Initializing assets...");
  console.log("");

  for (const [symbol, assetConfig] of Object.entries(assets)) {
    console.log(`--- ${symbol} ---`);

    try {
      // Check if asset is already initialized
      const assetsList = await pool.getAssetsList();
      const isInitialized = assetsList.includes(assetConfig.address);

      if (isInitialized) {
        console.log(`✓ ${symbol} already initialized, skipping...`);
        console.log("");
        continue;
      }

      // Step 1: Configure Oracle price feed
      if (assetConfig.pyth_price_feed) {
        console.log(`  Setting Pyth price feed...`);
        const setPriceFeedTx = await oracle.setAssetPriceFeed(
          assetConfig.address,
          assetConfig.pyth_price_feed
        );
        await setPriceFeedTx.wait();
        console.log(`  ✓ Price feed configured`);
      }

      // Step 2: Deploy dToken (aToken equivalent)
      console.log(`  Deploying dToken...`);
      const DToken = await hre.ethers.getContractFactory("DeraSupplyToken");
      const dToken = await DToken.deploy(
        poolAddress,
        assetConfig.address,
        assetConfig.decimals,
        `Dera ${assetConfig.name}`,
        `d${symbol}`
      );
      await dToken.waitForDeployment();
      const dTokenAddress = await dToken.getAddress();
      console.log(`  ✓ dToken deployed: ${dTokenAddress}`);

      // Step 3: Deploy Stable Debt Token
      console.log(`  Deploying Stable Debt Token...`);
      const StableDebtToken = await hre.ethers.getContractFactory("DeraStableDebtToken");
      const stableDebtToken = await StableDebtToken.deploy(
        poolAddress,
        assetConfig.address,
        assetConfig.decimals,
        `Dera Stable Debt ${assetConfig.name}`,
        `stableDebt${symbol}`
      );
      await stableDebtToken.waitForDeployment();
      const stableDebtTokenAddress = await stableDebtToken.getAddress();
      console.log(`  ✓ Stable Debt Token deployed: ${stableDebtTokenAddress}`);

      // Step 4: Deploy Variable Debt Token
      console.log(`  Deploying Variable Debt Token...`);
      const VariableDebtToken = await hre.ethers.getContractFactory("DeraVariableDebtToken");
      const variableDebtToken = await VariableDebtToken.deploy(
        poolAddress,
        assetConfig.address,
        assetConfig.decimals,
        `Dera Variable Debt ${assetConfig.name}`,
        `variableDebt${symbol}`
      );
      await variableDebtToken.waitForDeployment();
      const variableDebtTokenAddress = await variableDebtToken.getAddress();
      console.log(`  ✓ Variable Debt Token deployed: ${variableDebtTokenAddress}`);

      // Step 5: Deploy Interest Rate Strategy
      console.log(`  Deploying Interest Rate Strategy...`);
      const InterestRateStrategy = await hre.ethers.getContractFactory("DeraInterestRateModel");

      // Convert rates to ray format (27 decimals)
      const RAY = hre.ethers.parseUnits("1", 27);
      const optimalUtilizationRate = hre.ethers.parseUnits(assetConfig.optimalUtilizationRate, 27);
      const baseVariableBorrowRate = hre.ethers.parseUnits(assetConfig.baseVariableBorrowRate, 27);
      const variableRateSlope1 = hre.ethers.parseUnits(assetConfig.variableRateSlope1, 27);
      const variableRateSlope2 = hre.ethers.parseUnits(assetConfig.variableRateSlope2, 27);

      const interestRateStrategy = await InterestRateStrategy.deploy(
        poolAddress,
        optimalUtilizationRate,
        baseVariableBorrowRate,
        variableRateSlope1,
        variableRateSlope2
      );
      await interestRateStrategy.waitForDeployment();
      const interestRateStrategyAddress = await interestRateStrategy.getAddress();
      console.log(`  ✓ Interest Rate Strategy deployed: ${interestRateStrategyAddress}`);

      // Step 6: Initialize asset in Pool via PoolConfigurator
      console.log(`  Initializing asset in Pool...`);
      const initTx = await poolConfigurator.initAsset(
        assetConfig.address,
        dTokenAddress,
        stableDebtTokenAddress,
        variableDebtTokenAddress,
        interestRateStrategyAddress
      );
      await initTx.wait();
      console.log(`  ✓ Asset initialized in Pool`);

      // Step 7: Configure asset parameters
      console.log(`  Configuring asset parameters...`);

      // Set LTV
      await (await poolConfigurator.setAssetLtv(assetConfig.address, assetConfig.ltv)).wait();
      console.log(`    ✓ LTV: ${assetConfig.ltv / 100}%`);

      // Set Liquidation Threshold
      await (await poolConfigurator.setAssetLiquidationThreshold(
        assetConfig.address,
        assetConfig.liquidationThreshold
      )).wait();
      console.log(`    ✓ Liquidation Threshold: ${assetConfig.liquidationThreshold / 100}%`);

      // Set Liquidation Bonus
      await (await poolConfigurator.setAssetLiquidationBonus(
        assetConfig.address,
        assetConfig.liquidationBonus
      )).wait();
      console.log(`    ✓ Liquidation Bonus: ${assetConfig.liquidationBonus / 100}%`);

      // Set Reserve Factor
      await (await poolConfigurator.setAssetReserveFactor(
        assetConfig.address,
        assetConfig.reserveFactor
      )).wait();
      console.log(`    ✓ Reserve Factor: ${assetConfig.reserveFactor / 100}%`);

      // Set Borrow Cap
      await (await poolConfigurator.setBorrowCap(assetConfig.address, assetConfig.borrowCap)).wait();
      console.log(`    ✓ Borrow Cap: ${assetConfig.borrowCap}`);

      // Set Supply Cap
      await (await poolConfigurator.setSupplyCap(assetConfig.address, assetConfig.supplyCap)).wait();
      console.log(`    ✓ Supply Cap: ${assetConfig.supplyCap}`);

      // Enable/Disable borrowing
      if (assetConfig.borrowEnabled) {
        await (await poolConfigurator.enableBorrowing(assetConfig.address)).wait();
        console.log(`    ✓ Borrowing enabled`);
      }

      // Save deployment info
      if (!deployments[network].assets) {
        deployments[network].assets = {};
      }

      deployments[network].assets[symbol] = {
        address: assetConfig.address,
        dToken: dTokenAddress,
        stableDebtToken: stableDebtTokenAddress,
        variableDebtToken: variableDebtTokenAddress,
        interestRateStrategy: interestRateStrategyAddress,
        timestamp: new Date().toISOString(),
      };

      saveDeployments(deployments);

      console.log(`✅ ${symbol} deployment complete!`);
      console.log("");

    } catch (error) {
      console.error(`❌ Error deploying ${symbol}:`, error.message);
      console.log("");
    }
  }

  console.log("=".repeat(60));
  console.log("✅ Multi-Asset Deployment Complete!");
  console.log("=".repeat(60));
  console.log("");

  // Print summary
  console.log("Deployed Assets:");
  const assetsList = await pool.getAssetsList();
  for (const assetAddress of assetsList) {
    const assetData = await pool.getAssetData(assetAddress);
    const symbol = Object.keys(assets).find(s => assets[s].address === assetAddress);
    console.log(`  ${symbol || 'Unknown'}: ${assetAddress}`);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
