const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking DeraSupplyToken (dHBAR) Status\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);

  const HBAR_ADDRESS = ethers.ZeroAddress;

  // Get asset data
  const assetData = await pool.getAssetData(HBAR_ADDRESS);
  console.log("Supply Token Address:", assetData.supplyTokenAddress);

  const dHBAR = await ethers.getContractAt("ConcreteDeraSupplyToken", assetData.supplyTokenAddress);

  console.log("\n" + "=".repeat(60));
  console.log("CHECKING DHBAR INITIALIZATION");
  console.log("=".repeat(60));

  try {
    const poolAddress = await dHBAR.POOL();
    console.log("\n  POOL address (in dHBAR):", poolAddress);
    console.log("  Expected POOL address:", deploymentInfo.addresses.POOL);
    console.log("  Match?", poolAddress.toLowerCase() === deploymentInfo.addresses.POOL.toLowerCase() ? "✅" : "❌ MISMATCH!");

    if (poolAddress.toLowerCase() !== deploymentInfo.addresses.POOL.toLowerCase()) {
      console.log("\n  ⚠️ CRITICAL: dHBAR is pointing to a different Pool contract!");
      console.log("  This will cause supply transactions to fail.");
      console.log("\n  Resolution: The assets need to be reinitialized with the correct Pool address.");
    }
  } catch (e) {
    console.log("\n  ❌ Error reading POOL from dHBAR:", e.message);
  }

  try {
    const underlyingAsset = await dHBAR.UNDERLYING_ASSET_ADDRESS();
    console.log("\n  Underlying Asset:", underlyingAsset);
    console.log("  Should be HBAR (0x0)?", underlyingAsset === ethers.ZeroAddress ? "✅" : "❌");
  } catch (e) {
    console.log("\n  ❌ Error reading UNDERLYING_ASSET_ADDRESS:", e.message);
  }

  try {
    const name = await dHBAR.name();
    const symbol = await dHBAR.symbol();
    const decimals = await dHBAR.decimals();
    console.log("\n  Token Info:");
    console.log("    Name:", name);
    console.log("    Symbol:", symbol);
    console.log("    Decimals:", decimals);
  } catch (e) {
    console.log("\n  ❌ Error reading token info:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("CHECKING POOL'S VIEW OF HBAR");
  console.log("=".repeat(60));

  try {
    // Try to call the internal mapping directly through a view function
    const assetsList = await pool.getAssetsList();
    console.log("\n  Assets in pool:", assetsList.length);
    console.log("  Assets:", assetsList);

    const hbarInList = assetsList.some(addr => addr.toLowerCase() === HBAR_ADDRESS.toLowerCase());
    console.log("\n  HBAR in assets list?", hbarInList ? "✅" : "❌");

    if (!hbarInList) {
      console.log("\n  ❌ CRITICAL: HBAR (0x0) is not in the Pool's assets list!");
      console.log("  This is why supply fails with 'AssetNotListed'");
      console.log("\n  Resolution: Run 'npm run init:assets' to initialize HBAR in the Pool");
    }
  } catch (e) {
    console.log("\n  ❌ Error checking assets list:", e.message);
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
