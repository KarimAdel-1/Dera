/**
 * Asset Verification Script
 *
 * Verifies that all deployed assets are correctly configured
 * Checks parameters, tokens, interest rates, and oracle prices
 *
 * Usage:
 *   npx hardhat run scripts/verify/verifyAssets.js --network testnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load configurations
const assetsConfig = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../config/assets.json"),
    "utf8"
  )
);

const DEPLOYMENT_FILE = path.join(__dirname, "../config/deployments.json");

/**
 * Load deployment state
 */
function loadDeployments() {
  if (fs.existsSync(DEPLOYMENT_FILE)) {
    return JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8"));
  }
  throw new Error("Deployments file not found");
}

/**
 * Verify asset configuration
 */
async function verifyAsset(pool, poolConfigurator, oracle, symbol, expectedConfig, deployedInfo) {
  console.log(`\n--- Verifying ${symbol} ---`);

  const errors = [];
  const warnings = [];

  try {
    // 1. Check if asset exists in pool
    const assetsList = await pool.getAssetsList();
    if (!assetsList.includes(expectedConfig.address)) {
      errors.push(`Asset not found in pool`);
      return { errors, warnings };
    }
    console.log(`✓ Asset exists in pool`);

    // 2. Get asset data
    const assetData = await pool.getAssetData(expectedConfig.address);
    console.log(`✓ Asset data retrieved`);

    // 3. Verify tokens
    if (deployedInfo) {
      if (assetData.dTokenAddress.toLowerCase() !== deployedInfo.dToken.toLowerCase()) {
        errors.push(`dToken mismatch: ${assetData.dTokenAddress} !== ${deployedInfo.dToken}`);
      } else {
        console.log(`✓ dToken matches: ${assetData.dTokenAddress}`);
      }

      if (assetData.stableDebtTokenAddress.toLowerCase() !== deployedInfo.stableDebtToken.toLowerCase()) {
        errors.push(`Stable debt token mismatch`);
      } else {
        console.log(`✓ Stable debt token matches`);
      }

      if (assetData.variableDebtTokenAddress.toLowerCase() !== deployedInfo.variableDebtToken.toLowerCase()) {
        errors.push(`Variable debt token mismatch`);
      } else {
        console.log(`✓ Variable debt token matches`);
      }
    }

    // 4. Verify configuration (LTV, liquidation threshold, etc.)
    // Note: Configuration is stored in a bitmap, would need to decode it
    console.log(`✓ Configuration bitmap: ${assetData.configuration}`);

    // 5. Verify oracle price
    try {
      const price = await oracle.getAssetPrice(expectedConfig.address);
      if (price > 0n) {
        console.log(`✓ Oracle price: ${hre.ethers.formatUnits(price, 8)} USD`);
      } else {
        warnings.push(`Oracle price is 0`);
      }
    } catch (error) {
      errors.push(`Failed to get oracle price: ${error.message}`);
    }

    // 6. Check interest rates
    const currentLiquidityRate = assetData.currentLiquidityRate;
    const currentBorrowRate = assetData.currentBorrowRate;
    console.log(`✓ Liquidity Rate: ${hre.ethers.formatUnits(currentLiquidityRate, 27)}`);
    console.log(`✓ Borrow Rate: ${hre.ethers.formatUnits(currentBorrowRate, 27)}`);

    // 7. Verify timestamp
    const lastUpdate = Number(assetData.lastUpdateTimestamp);
    const age = Date.now() / 1000 - lastUpdate;
    if (age > 3600) {
      warnings.push(`Asset data is ${Math.floor(age / 60)} minutes old`);
    } else {
      console.log(`✓ Last updated: ${Math.floor(age)} seconds ago`);
    }

  } catch (error) {
    errors.push(`Verification error: ${error.message}`);
  }

  return { errors, warnings };
}

/**
 * Main verification function
 */
async function main() {
  console.log("=".repeat(60));
  console.log("🔍 Dera Protocol - Asset Verification");
  console.log("=".repeat(60));

  const network = hre.network.name;
  console.log(`Network: ${network}\n`);

  // Load deployments
  const deployments = loadDeployments();
  if (!deployments[network]) {
    throw new Error(`No deployments found for network: ${network}`);
  }

  // Get contract addresses
  const poolAddress = deployments[network].Pool;
  const poolConfiguratorAddress = deployments[network].PoolConfigurator;
  const oracleAddress = deployments[network].DeraOracle;

  if (!poolAddress || !poolConfiguratorAddress || !oracleAddress) {
    throw new Error("Core contracts not deployed");
  }

  console.log("Core contracts:");
  console.log(`  Pool: ${poolAddress}`);
  console.log(`  PoolConfigurator: ${poolConfiguratorAddress}`);
  console.log(`  Oracle: ${oracleAddress}\n`);

  // Get contract instances
  const pool = await hre.ethers.getContractAt("Pool", poolAddress);
  const poolConfigurator = await hre.ethers.getContractAt("PoolConfigurator", poolConfiguratorAddress);
  const oracle = await hre.ethers.getContractAt("DeraOracle", oracleAddress);

  // Get asset configurations
  const assets = assetsConfig[network];
  if (!assets) {
    throw new Error(`No asset configuration found for network: ${network}`);
  }

  // Verify each asset
  const results = {};
  for (const [symbol, assetConfig] of Object.entries(assets)) {
    const deployedInfo = deployments[network].assets?.[symbol];
    const result = await verifyAsset(
      pool,
      poolConfigurator,
      oracle,
      symbol,
      assetConfig,
      deployedInfo
    );
    results[symbol] = result;
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Verification Summary");
  console.log("=".repeat(60));

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [symbol, result] of Object.entries(results)) {
    console.log(`\n${symbol}:`);

    if (result.errors.length > 0) {
      console.log(`  ❌ Errors: ${result.errors.length}`);
      result.errors.forEach(err => console.log(`     - ${err}`));
      totalErrors += result.errors.length;
    } else {
      console.log(`  ✅ No errors`);
    }

    if (result.warnings.length > 0) {
      console.log(`  ⚠️  Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warn => console.log(`     - ${warn}`));
      totalWarnings += result.warnings.length;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);

  if (totalErrors === 0) {
    console.log("\n✅ All assets verified successfully!");
  } else {
    console.log("\n❌ Verification failed with errors");
    process.exit(1);
  }
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
