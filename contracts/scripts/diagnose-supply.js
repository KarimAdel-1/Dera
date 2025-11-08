const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Diagnosing Supply Transaction Issue\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [signer] = await ethers.getSigners();

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);

  console.log("=" .repeat(60));
  console.log("POOL CONTRACT STATUS");
  console.log("=".repeat(60));

  // Check if pool is paused
  try {
    const isPaused = await pool.paused();
    console.log("  Pool Paused:", isPaused ? "❌ YES (this would block transactions)" : "✅ No");
  } catch (e) {
    console.log("  Pool Paused: ⚠️ Could not check:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("HBAR ASSET CONFIGURATION");
  console.log("=".repeat(60));

  const HBAR_ADDRESS = ethers.ZeroAddress;

  // Get asset data
  const assetData = await pool.getAssetData(HBAR_ADDRESS);
  console.log("  Supply Token:", assetData.supplyTokenAddress);
  console.log("  Borrow Token:", assetData.borrowTokenAddress);
  console.log("  Liquidity Index:", assetData.liquidityIndex.toString());

  // Get configuration
  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const configData = BigInt(config.data);

  // Decode flags using correct bit positions
  const IS_ACTIVE_BIT = 56n;
  const IS_FROZEN_BIT = 57n;
  const BORROWING_ENABLED_BIT = 58n;
  const IS_PAUSED_BIT = 60n;

  const isActive = (configData & (1n << IS_ACTIVE_BIT)) !== 0n;
  const isFrozen = (configData & (1n << IS_FROZEN_BIT)) !== 0n;
  const borrowingEnabled = (configData & (1n << BORROWING_ENABLED_BIT)) !== 0n;
  const isPaused = (configData & (1n << IS_PAUSED_BIT)) !== 0n;

  console.log("\n  Configuration Flags:");
  console.log("    Active:", isActive ? "✅ Yes" : "❌ No (would cause revert)");
  console.log("    Frozen:", isFrozen ? "❌ Yes (would cause revert)" : "✅ No");
  console.log("    Borrowing:", borrowingEnabled ? "✅ Enabled" : "❌ Disabled");
  console.log("    Paused:", isPaused ? "❌ Yes (would cause revert)" : "✅ No");

  // Get supply cap
  const LTV_MASK = 0xFFFFn;
  const LIQUIDATION_THRESHOLD_START = 16n;
  const LIQUIDATION_THRESHOLD_MASK = 0xFFFFn;
  const SUPPLY_CAP_START = 116n;
  const SUPPLY_CAP_MASK = 0xFFFFFFFFFFFFn; // 48 bits

  const ltv = Number(configData & LTV_MASK);
  const liquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LIQUIDATION_THRESHOLD_MASK);
  const supplyCap = Number((configData >> SUPPLY_CAP_START) & SUPPLY_CAP_MASK);

  console.log("\n  Collateral Parameters:");
  console.log("    LTV:", ltv / 100, "%");
  console.log("    Liquidation Threshold:", liquidationThreshold / 100, "%");
  console.log("    Supply Cap:", supplyCap === 0 ? "Unlimited" : `${supplyCap} HBAR`);

  console.log("\n" + "=".repeat(60));
  console.log("ORACLE PRICE CHECK");
  console.log("=".repeat(60));

  try {
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("  HBAR Price:", ethers.formatUnits(price, 8), "USD");
    console.log("  Status: ✅ Price available");
  } catch (e) {
    console.log("  Status: ❌ Price not available (would cause revert)");
    console.log("  Error:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUPPLY TOKEN STATUS");
  console.log("=".repeat(60));

  try {
    const supplyToken = await ethers.getContractAt("ConcreteDeraSupplyToken", assetData.supplyTokenAddress);
    const totalSupply = await supplyToken.totalSupply();
    const scaledTotalSupply = await supplyToken.scaledTotalSupply();

    console.log("  Total Supply:", ethers.formatUnits(totalSupply, 8), "dHBAR");
    console.log("  Scaled Total Supply:", scaledTotalSupply.toString());

    // Try to check if supply token can receive HBAR
    console.log("\n  Supply Token Configuration:");
    const supplyTokenPool = await supplyToken.POOL();
    console.log("    Connected Pool:", supplyTokenPool);
    console.log("    Matches expected?", supplyTokenPool.toLowerCase() === deploymentInfo.addresses.POOL.toLowerCase() ? "✅" : "❌");
  } catch (e) {
    console.log("  ⚠️ Error checking supply token:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("TEST TRANSACTION (DRY RUN)");
  console.log("=".repeat(60));

  // Try to simulate a supply transaction
  const testAmount = ethers.parseUnits("10", 8); // 10 HBAR
  const userAddress = signer.address;

  console.log(`  Testing supply of 10 HBAR from ${userAddress}...`);

  try {
    // Use staticCall to simulate without executing
    await pool.supply.staticCall(
      HBAR_ADDRESS,
      testAmount,
      userAddress,
      0,
      { value: testAmount }
    );
    console.log("  ✅ Dry run succeeded - transaction should work!");
  } catch (e) {
    console.log("  ❌ Dry run failed - this is why the transaction reverts:");
    console.log("\n  Error details:");
    console.log("    Message:", e.message);
    if (e.data) console.log("    Data:", e.data);
    if (e.reason) console.log("    Reason:", e.reason);

    // Try to decode the error
    if (e.data && e.data.startsWith("0x")) {
      console.log("\n  Error signature:", e.data.slice(0, 10));

      // Common error signatures
      const errors = {
        "0x6f7eac26": "AssetInactive",
        "0x9c52a7f1": "AssetFrozen",
        "0xd93c0665": "AssetPaused",
        "0x2c5211c6": "InvalidAmount",
        "0x9ced1b04": "SupplyCapExceeded",
        "0x358d9e8f": "AssetNotListed"
      };

      const errorSig = e.data.slice(0, 10);
      if (errors[errorSig]) {
        console.log("  Decoded Error:", errors[errorSig]);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("DIAGNOSTIC COMPLETE");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
