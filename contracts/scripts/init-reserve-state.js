const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Initializing Reserve State\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Pool:", deploymentInfo.addresses.POOL);

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const USDC_ADDRESS = "0x0000000000000000000000000000000000068cDa";

  console.log("\n============================================================");
  console.log("TRIGGERING RESERVE STATE UPDATES");
  console.log("============================================================\n");

  // The simplest way to trigger a reserve update is to do a tiny supply
  // This will update the reserve's lastUpdateTimestamp and initialize indices
  // Hedera requires minimum 10_000_000_000 wei (0.1 HBAR) for HBAR transfers

  console.log("1️⃣  Updating HBAR reserve state...");
  console.log("   Method: Supply 0.1 HBAR (minimum amount) to trigger state update\n");

  const minHbarAmount = ethers.parseUnits("0.1", 8); // 0.1 HBAR in 8 decimals
  console.log("   Amount:", ethers.formatUnits(minHbarAmount, 8), "HBAR");
  console.log("   Wei value:", minHbarAmount.toString());

  try {
    const tx = await pool.supply(
      HBAR_ADDRESS,
      minHbarAmount,
      deployer.address,
      0,
      { value: minHbarAmount, gasLimit: 500000 }
    );

    console.log("   📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("   ✅ HBAR reserve state updated!");
    console.log("   Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.log("   ❌ Failed to update HBAR reserve:");
    console.log("   Error:", error.message);

    if (error.data) {
      console.log("   Error data:", error.data);

      // Try to decode the error
      const errorSelector = error.data.slice(0, 10);
      if (errorSelector === "0x358d9e8f") {
        console.log("   → StalePriceData error detected");
        console.log("   → This means the oracle price is returning 0 during the transaction");
        console.log("   → Even though it returns non-zero in static calls");
        console.log("   → This could be a gas issue or state access issue");
      }
    }
  }

  console.log("\n2️⃣  Updating USDC reserve state...");
  console.log("   Skipping USDC for now - requires USDC tokens\n");

  console.log("\n============================================================");
  console.log("VERIFICATION");
  console.log("============================================================\n");

  try {
    // Try to get reserve data using Pool interface
    console.log("Checking if reserves can be accessed...");

    // Get the reserve configuration (assets list is stored separately)
    // We'll get the DToken from the asset data
    const assetsList = await pool.getAssetsList();
    console.log("Assets registered:", assetsList.length);

    // Find HBAR asset
    const hbarAssetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("✅ HBAR Asset Data:");
    console.log("   DToken:", hbarAssetData.supplyTokenAddress);

    // Get detailed reserve data
    const hbarReserveData = hbarAssetData;
    console.log("✅ HBAR Reserve Data:");
    console.log("   DToken:", hbarReserveData.supplyTokenAddress);
    console.log("   Liquidity Index:", ethers.formatUnits(hbarReserveData.liquidityIndex, 27));
    console.log("   Last Update:", new Date(Number(hbarReserveData.lastUpdateTimestamp) * 1000).toISOString());

    // Try to call balanceOf on the DToken
    const dToken = await ethers.getContractAt("IDeraSupplyToken", hbarReserveData.supplyTokenAddress);
    const balance = await dToken.balanceOf(deployer.address);
    console.log("   Your balance:", ethers.formatUnits(balance, 8), "dHBAR");
  } catch (error) {
    console.log("❌ Could not verify reserve data:");
    console.log("   ", error.message);
  }

  console.log("\n💡 If the supply transaction failed with StalePriceData,");
  console.log("   this means there's a deeper issue with oracle access during transactions.");
  console.log("   The oracle works in static/view calls but fails in state-changing transactions.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
