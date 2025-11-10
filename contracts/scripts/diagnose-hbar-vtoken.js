const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Diagnosing HBAR vToken Issue\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const POOL = deploymentInfo.addresses.POOL;
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("📍 Pool Address:", POOL);
  console.log("📍 HBAR Address:", HBAR_ADDRESS);

  const pool = await ethers.getContractAt("DeraPool", POOL);

  console.log("\n" + "=".repeat(60));
  console.log("Checking HBAR Asset Data in Pool");
  console.log("=".repeat(60) + "\n");

  const assetData = await pool.getAssetData(HBAR_ADDRESS);

  console.log("📊 HBAR Asset Data:");
  console.log("   Supply Token (dToken):", assetData.supplyTokenAddress);
  console.log("   Borrow Token (vToken):", assetData.borrowTokenAddress);
  console.log("   Liquidity Index:", assetData.liquidityIndex.toString());
  console.log("   Variable Borrow Index:", assetData.nextVariableBorrowIndex.toString());
  console.log("   Asset ID:", assetData.id.toString());

  console.log("\n" + "=".repeat(60));
  console.log("Analysis");
  console.log("=".repeat(60) + "\n");

  const hasSupplyToken = assetData.supplyTokenAddress !== ethers.ZeroAddress;
  const hasBorrowToken = assetData.borrowTokenAddress !== ethers.ZeroAddress;

  console.log("Supply Token (dToken) set:", hasSupplyToken ? "✅" : "❌");
  console.log("Borrow Token (vToken) set:", hasBorrowToken ? "✅" : "❌");

  if (!hasBorrowToken) {
    console.log("\n❌ ISSUE FOUND: vToken address is zero!");
    console.log("   This is why borrows aren't showing in frontend.");
    console.log("\n💡 Solution: Re-run asset initialization with vToken address");
    console.log("   The vToken was deployed but not registered in Pool.getAssetData()");
  } else {
    console.log("\n✅ Both tokens are properly set!");
    console.log("   dToken:", assetData.supplyTokenAddress);
    console.log("   vToken:", assetData.borrowTokenAddress);
  }

  // Check configuration
  console.log("\n" + "=".repeat(60));
  console.log("Checking HBAR Configuration");
  console.log("=".repeat(60) + "\n");

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const decimals = (BigInt(config.data) >> 48n) & 0xFFn;
  const ltv = Number(config.data & 0xFFFFn);

  console.log("📊 HBAR Configuration:");
  console.log("   Decimals:", Number(decimals), decimals === 8n ? "✅" : "❌");
  console.log("   LTV:", ltv, `(${ltv / 100}%)`);

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
