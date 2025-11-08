const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 COMPREHENSIVE SUPPLY FAILURE DIAGNOSIS\n");
  console.log("=" .repeat(70));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);
  const configurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const USDC_ADDRESS = "0x0000000000000000000000000000000000068cDa";

  console.log("\n📋 1. POOL CONFIGURATION CHECK");
  console.log("-".repeat(70));

  // Check if assets are registered
  try {
    const assetsList = await pool.getAssetsList();
    console.log("Assets registered:", assetsList.length);

    for (const asset of assetsList) {
      const name = asset === HBAR_ADDRESS ? "HBAR" : "USDC";
      const config = await pool.getConfiguration(asset);
      const IS_ACTIVE_BIT = 56n;
      const BORROWING_ENABLED_BIT = 58n;
      const isActive = (config.data & (1n << IS_ACTIVE_BIT)) !== 0n;
      const borrowingEnabled = (config.data & (1n << BORROWING_ENABLED_BIT)) !== 0n;

      console.log(`  ${name}:`);
      console.log(`    Active: ${isActive ? "✅" : "❌"}`);
      console.log(`    Borrowing: ${borrowingEnabled ? "✅" : "❌"}`);
    }
  } catch (e) {
    console.log("❌ Failed to check assets:", e.message);
  }

  console.log("\n📋 2. ORACLE CONFIGURATION CHECK");
  console.log("-".repeat(70));

  try {
    const fallbackEnabled = await oracle.fallbackEnabled();
    console.log("Fallback mode:", fallbackEnabled ? "✅ Enabled" : "❌ Disabled");

    const maxPriceAge = await oracle.maxPriceAge();
    console.log("Max price age:", maxPriceAge.toString(), "seconds (", Number(maxPriceAge) / 60, "minutes)");

    // Check Pyth price IDs
    const hbarPriceId = await oracle.assetToPriceId(HBAR_ADDRESS);
    const usdcPriceId = await oracle.assetToPriceId(USDC_ADDRESS);

    console.log("\nPyth Price Feed IDs:");
    console.log("  HBAR:", hbarPriceId === ethers.ZeroHash ? "❌ NOT SET (using fallback)" : "✅ " + hbarPriceId);
    console.log("  USDC:", usdcPriceId === ethers.ZeroHash ? "❌ NOT SET (using fallback)" : "✅ " + usdcPriceId);
  } catch (e) {
    console.log("❌ Failed to check oracle config:", e.message);
  }

  console.log("\n📋 3. ORACLE PRICES CHECK");
  console.log("-".repeat(70));

  try {
    const hbarPrice = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("HBAR price: $" + ethers.formatUnits(hbarPrice, 8), "✅");
  } catch (e) {
    console.log("HBAR price: ❌ ERROR -", e.message.split('\n')[0]);
  }

  try {
    const usdcPrice = await oracle.getAssetPrice(USDC_ADDRESS);
    console.log("USDC price: $" + ethers.formatUnits(usdcPrice, 8), "✅");
  } catch (e) {
    console.log("USDC price: ❌ ERROR -", e.message.split('\n')[0]);
  }

  console.log("\n📋 4. ASSET RESERVE DATA CHECK");
  console.log("-".repeat(70));

  try {
    const hbarData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("HBAR Reserve Data:");
    console.log("  Liquidity Index:", hbarData.liquidityIndex.toString());
    console.log("  Current Liquidity Rate:", hbarData.currentLiquidityRate.toString());
    console.log("  Current Borrow Rate:", hbarData.currentVariableBorrowRate.toString());
    console.log("  Last Update:", new Date(Number(hbarData.lastUpdateTimestamp) * 1000).toISOString());

    const currentTime = Math.floor(Date.now() / 1000);
    const timeSinceUpdate = currentTime - Number(hbarData.lastUpdateTimestamp);
    console.log("  Time since last update:", timeSinceUpdate, "seconds (", Math.floor(timeSinceUpdate / 60), "minutes)");

    if (timeSinceUpdate > 3600) {
      console.log("  ⚠️  WARNING: Reserve data is very old (>1 hour)");
    }
  } catch (e) {
    console.log("❌ Failed to get reserve data:", e.message);
  }

  console.log("\n📋 5. SUPPLY CAPS & LIMITS CHECK");
  console.log("-".repeat(70));

  try {
    const hbarConfig = await pool.getConfiguration(HBAR_ADDRESS);
    console.log("HBAR Supply Cap: Checking...");
    // Supply caps are in the configuration bitmap
    console.log("  Config data:", hbarConfig.data.toString());
  } catch (e) {
    console.log("❌ Failed to check supply caps:", e.message);
  }

  console.log("\n📋 6. SIMULATION TEST");
  console.log("-".repeat(70));
  console.log("Attempting to simulate supply transaction...");

  try {
    const [signer] = await ethers.getSigners();
    const amount = ethers.parseUnits("1", 8); // 1 HBAR for testing

    // Try to simulate the supply call
    await pool.supply.staticCall(
      HBAR_ADDRESS,
      amount,
      signer.address,
      0,
      { value: amount }
    );

    console.log("✅ Supply simulation PASSED - should work!");
  } catch (e) {
    console.log("❌ Supply simulation FAILED:");
    console.log("   Error:", e.message.split('\n')[0]);

    // Try to decode the error
    if (e.data) {
      console.log("   Error data:", e.data);
      console.log("   Error selector:", e.data.substring(0, 10));

      // Check if it matches known errors
      const errorSelector = e.data.substring(0, 10);
      if (errorSelector === "0x358d9e8f") {
        console.log("   ⚠️  This matches the error from your transaction!");
        const errorData = e.data.substring(10);
        if (errorData) {
          const timestamp = parseInt(errorData, 16);
          console.log("   Error parameter (decimal):", timestamp);
          console.log("   As timestamp:", new Date(timestamp * 1000).toISOString());
        }
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ DIAGNOSIS COMPLETE");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Diagnostic script failed:");
    console.error(error);
    process.exit(1);
  });
