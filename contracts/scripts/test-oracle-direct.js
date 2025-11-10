const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Testing Oracle Direct Call\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const oracleAddress = deploymentInfo.addresses.ORACLE;
  const poolAddress = deploymentInfo.addresses.POOL;

  console.log("Oracle Address:", oracleAddress);
  console.log("Pool Address:", poolAddress);

  const oracle = await ethers.getContractAt("DeraOracle", oracleAddress);
  const pool = await ethers.getContractAt("DeraPool", poolAddress);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const userAddress = "0x00000000000000000000000000000000006C3cde";

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Direct Oracle Call");
  console.log("=".repeat(60) + "\n");

  try {
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("Raw price value:", price);
    console.log("Price type:", typeof price);
    console.log("Price toString:", price.toString());
    console.log("Price in USD:", ethers.formatUnits(price, 8));

    if (price === null || price === undefined) {
      console.log("❌ PROBLEM: Oracle returned null/undefined!");
    } else if (BigInt(price) === 0n) {
      console.log("❌ PROBLEM: Oracle returned zero!");
    } else {
      console.log("✅ Oracle returned valid price");
    }
  } catch (error) {
    console.error("❌ Oracle call failed:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Direct getUserAccountData Call");
  console.log("=".repeat(60) + "\n");

  try {
    console.log("Calling getUserAccountData for:", userAddress);
    const result = await pool.getUserAccountData(userAddress);

    console.log("\nRaw result:", result);
    console.log("Result length:", result.length);

    for (let i = 0; i < result.length; i++) {
      const value = result[i];
      console.log(`Result[${i}]:`, value, "(type:", typeof value, ")");
      if (value === null || value === undefined) {
        console.log(`   ❌ PROBLEM: Value at index ${i} is null/undefined!`);
      }
    }

    console.log("\nFormatted values:");
    console.log("  totalCollateralBase:", result[0] ? ethers.formatUnits(result[0], 8) : "NULL");
    console.log("  totalDebtBase:", result[1] ? ethers.formatUnits(result[1], 8) : "NULL");
    console.log("  availableBorrowsBase:", result[2] ? ethers.formatUnits(result[2], 8) : "NULL");
    console.log("  currentLiquidationThreshold:", result[3] ? result[3].toString() : "NULL");
    console.log("  ltv:", result[4] ? result[4].toString() : "NULL");
    console.log("  healthFactor:", result[5] ? ethers.formatUnits(result[5], 18) : "NULL");

  } catch (error) {
    console.error("❌ getUserAccountData failed:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Check dToken Balance");
  console.log("=".repeat(60) + "\n");

  try {
    const assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("dToken address:", assetData.supplyTokenAddress);

    const dTokenABI = [
      "function balanceOf(address) view returns (uint256)",
      "function scaledBalanceOf(address) view returns (uint256)"
    ];
    const dToken = await ethers.getContractAt(dTokenABI, assetData.supplyTokenAddress);

    const balance = await dToken.balanceOf(userAddress);
    const scaledBalance = await dToken.scaledBalanceOf(userAddress);

    console.log("Balance:", balance.toString());
    console.log("Scaled Balance:", scaledBalance.toString());
    console.log("Balance formatted:", ethers.formatUnits(balance, 8));

  } catch (error) {
    console.error("❌ dToken balance check failed:", error.message);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
