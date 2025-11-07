const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying Assets in Pool\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);

  // Get assets list
  const assetsList = await pool.getAssetsList();
  console.log("📊 Assets in pool:", assetsList.length);
  console.log("\n📋 Registered assets:");

  for (let i = 0; i < assetsList.length; i++) {
    const asset = assetsList[i];
    console.log(`\n${i + 1}. Asset: ${asset}`);

    try {
      const assetData = await pool.getAssetData(asset);
      console.log("   Supply Token:", assetData.supplyTokenAddress);
      console.log("   Borrow Token:", assetData.borrowTokenAddress);
      console.log("   Liquidity Index:", assetData.liquidityIndex.toString());
      console.log("   ID:", assetData.id.toString());

      const config = await pool.getConfiguration(asset);
      console.log("   Active:", config.data & 1n ? "Yes" : "No");
      console.log("   Borrowing Enabled:", config.data & (1n << 1n) ? "Yes" : "No");
    } catch (e) {
      console.log("   ❌ Error getting asset data:", e.message);
    }
  }

  // Check expected addresses
  console.log("\n🔍 Checking expected addresses:");
  console.log("   HBAR (0x0):", ethers.ZeroAddress);
  console.log("   Is in list?", assetsList.includes(ethers.ZeroAddress));

  const USDC_TOKEN_ID = "0.0.429274";
  const usdcHex = parseInt("429274").toString(16).padStart(40, '0');
  const USDC_ADDRESS = "0x" + usdcHex;
  console.log("   USDC (0.0.429274):", USDC_ADDRESS);
  console.log("   Is in list?", assetsList.includes(USDC_ADDRESS));

  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
