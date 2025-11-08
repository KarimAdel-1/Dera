const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing Raw Supply Call\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [signer] = await ethers.getSigners();

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("Signer:", signer.address);
  console.log("Pool:", deploymentInfo.addresses.POOL);

  // Try different amounts to see if amount is the issue
  const testAmounts = [
    ethers.parseUnits("1", 8),    // 1 HBAR
    ethers.parseUnits("10", 8),   // 10 HBAR
    ethers.parseUnits("100", 8),  // 100 HBAR
  ];

  for (const amount of testAmounts) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing ${ethers.formatUnits(amount, 8)} HBAR`);
    console.log("=".repeat(60));

    try {
      // Try staticCall first
      console.log("  📋 Attempting staticCall...");
      await pool.supply.staticCall(
        HBAR_ADDRESS,
        amount,
        signer.address,
        0,
        { value: amount, gasLimit: 500000 }
      );
      console.log("  ✅ StaticCall succeeded!");
    } catch (error) {
      console.log("  ❌ StaticCall failed:", error.message);

      if (error.data) {
        console.log("  Error data:", error.data);

        // Try to decode common errors
        const errorSig = error.data.slice(0, 10);
        const errors = {
          "0x358d9e8f": "AssetNotListed",
          "0x6f7eac26": "AssetInactive",
          "0x2c5211c6": "InvalidAmount",
          "0xd93c0665": "AssetPaused",
          "0x9c52a7f1": "AssetFrozen",
        };

        if (errors[errorSig]) {
          console.log("  Decoded error:", errors[errorSig]);
        }
      }
    }
  }

  // Try to check the actual liquidityIndex from storage
  console.log(`\n${"=".repeat(60)}`);
  console.log("CHECKING RAW STORAGE VALUES");
  console.log("=".repeat(60));

  try {
    const assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("\ngetAssetData() returns:");
    console.log("  liquidityIndex:", assetData.liquidityIndex.toString());
    console.log("  supplyTokenAddress:", assetData.supplyTokenAddress);
    console.log("  id:", assetData.id.toString());

    // Check if ID is correct
    if (assetData.id === 0n && assetData.liquidityIndex > 0n) {
      console.log("\n  ⚠️ WARNING: Asset has liquidityIndex but ID is 0!");
      console.log("  This might cause issues in validation logic.");
    }
  } catch (e) {
    console.log("\n  ❌ Error calling getAssetData():", e.message);
  }

  // Check the first asset in the list
  console.log("\nFirst asset in _assetsList[0]:");
  try {
    const assetsList = await pool.getAssetsList();
    console.log("  _assetsList[0]:", assetsList[0]);
    console.log("  Is HBAR?", assetsList[0] === HBAR_ADDRESS ? "✅" : "❌");
  } catch (e) {
    console.log("  ❌ Error:", e.message);
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
