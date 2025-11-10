const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking Pool Assets List\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const POOL = deploymentInfo.addresses.POOL;
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("📍 Pool Address:", POOL);
  console.log("📍 HBAR Address:", HBAR_ADDRESS, "(0x000...000)");

  const pool = await ethers.getContractAt("DeraPool", POOL);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check Assets List");
  console.log("=".repeat(60) + "\n");

  // Get assets list (call the getter function that returns the array)
  console.log("🔍 Reading assetsList from Pool...");

  try {
    const assetsList = await pool.getAssetsList();
    console.log("\n📊 Assets List:");
    console.log("   Total assets:", assetsList.length);

    if (assetsList.length === 0) {
      console.log("\n❌ Assets list is EMPTY!");
      console.log("   This is why getUserAccountData returns zeros!");
      console.log("   The loop has nothing to iterate over.");
      return;
    }

    console.log("\n📋 Assets in list:");
    let hbarFound = false;
    for (let i = 0; i < assetsList.length; i++) {
      const asset = assetsList[i];
      const isHBAR = asset === HBAR_ADDRESS;
      console.log(`   [${i}] ${asset}`, isHBAR ? "✅ HBAR" : "");
      if (isHBAR) hbarFound = true;
    }

    if (!hbarFound) {
      console.log("\n❌ HBAR is NOT in the assets list!");
      console.log("   This is why getUserAccountData returns zeros!");
      console.log("   GenericLogic only processes assets in the assetsList array.");
    } else {
      console.log("\n✅ HBAR is in the assets list");
    }

  } catch (error) {
    console.error("❌ Failed to read assets list:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Check Asset Data for HBAR");
  console.log("=".repeat(60) + "\n");

  try {
    const assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("📊 HBAR Asset Data:");
    console.log("   Supply Token:", assetData.supplyTokenAddress);
    console.log("   Borrow Token:", assetData.borrowTokenAddress);
    console.log("   Liquidity Index:", assetData.liquidityIndex.toString());
    console.log("   Asset ID:", assetData.id.toString());

    const hasData = assetData.supplyTokenAddress !== ethers.ZeroAddress;
    console.log("\n   Asset registered:", hasData ? "✅" : "❌");

    if (hasData) {
      console.log("\n   ℹ️  Asset data exists in poolAssets mapping");
      console.log("      But if not in assetsList, it won't be processed!");
    }
  } catch (error) {
    console.error("❌ Failed to read asset data:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Check Configuration");
  console.log("=".repeat(60) + "\n");

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const decimals = (BigInt(config.data) >> 48n) & 0xFFn;
  const ltv = Number(config.data & 0xFFFFn);

  console.log("📊 HBAR Configuration:");
  console.log("   Decimals:", Number(decimals), decimals === 8n ? "✅" : "❌");
  console.log("   LTV:", ltv, ltv > 0 ? "✅" : "❌");

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
