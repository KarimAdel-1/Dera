const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Diagnostic: Check getUserAccountData After Supply\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  const POOL = deploymentInfo.addresses.POOL;
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("📍 Addresses:");
  console.log("   Deployer:", deployer.address);
  console.log("   Pool:", POOL);

  const pool = await ethers.getContractAt("DeraPool", POOL);

  console.log("\n" + "=".repeat(60));
  console.log("Calling getUserAccountData...");
  console.log("=".repeat(60) + "\n");

  try {
    const data = await pool.getUserAccountData(deployer.address);

    console.log("📊 Account Data:");
    console.log("   Total Collateral:", ethers.formatUnits(data[0], 8), "USD");
    console.log("   Total Debt:", ethers.formatUnits(data[1], 8), "USD");
    console.log("   Available Borrows:", ethers.formatUnits(data[2], 8), "USD");
    console.log("   Liquidation Threshold:", data[3].toString());
    console.log("   LTV:", data[4].toString());
    console.log("   Health Factor:", ethers.formatUnits(data[5], 18));

    const collateralUSD = Number(ethers.formatUnits(data[0], 8));
    const availableBorrowsUSD = Number(ethers.formatUnits(data[2], 8));

    console.log("\n" + "=".repeat(60));
    console.log("RESULTS");
    console.log("=".repeat(60) + "\n");

    if (collateralUSD > 15) {
      console.log("🎉 SUCCESS!");
      console.log("   Collateral: $" + collateralUSD.toFixed(2));
      console.log("   Available Borrows: $" + availableBorrowsUSD.toFixed(2));
      console.log("\n✅ All fixes are working correctly!");
      console.log("   - GenericLogic fix: Working (doesn't skip HBAR)");
      console.log("   - Decimals = 8: Working");
      console.log("   - HBAR supply: Working");
      console.log("   - getUserAccountData: Working");
    } else {
      console.log("⚠️  Collateral value is lower than expected");
      console.log("   Got: $" + collateralUSD.toFixed(2));
      console.log("   Expected: ~$20.00 (250 HBAR × $0.08)");
    }

  } catch (error) {
    console.error("❌ getUserAccountData failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
