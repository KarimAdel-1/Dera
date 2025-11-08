const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Oracle Configuration Diagnostic\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);
  const addressesProvider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const USDC_ADDRESS = "0x0000000000000000000000000000000000068cDa";

  console.log("============================================================");
  console.log("1️⃣  ORACLE ADDRESS CONFIGURATION");
  console.log("============================================================\n");

  const oracleFromProvider = await addressesProvider.getPriceOracle();
  console.log("Oracle in deployment-info.json:", deploymentInfo.addresses.ORACLE);
  console.log("Oracle from AddressesProvider:  ", oracleFromProvider);
  console.log("Match:", oracleFromProvider.toLowerCase() === deploymentInfo.addresses.ORACLE.toLowerCase() ? "✅" : "❌");

  console.log("\n============================================================");
  console.log("2️⃣  ORACLE CONFIGURATION");
  console.log("============================================================\n");

  const fallbackEnabled = await oracle.fallbackEnabled();
  console.log("Fallback mode:", fallbackEnabled ? "✅ Enabled" : "❌ Disabled");

  const maxPriceAge = await oracle.maxPriceAge();
  console.log("Max price age:", maxPriceAge.toString(), "seconds (", (Number(maxPriceAge) / 60).toFixed(0), "minutes)");

  console.log("\n============================================================");
  console.log("3️⃣  DIRECT ORACLE PRICE QUERIES");
  console.log("============================================================\n");

  try {
    const hbarPrice = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("✅ HBAR price: $" + ethers.formatUnits(hbarPrice, 8));
    console.log("   Raw value:", hbarPrice.toString());
  } catch (e) {
    console.log("❌ HBAR price ERROR:", e.message.split('\n')[0]);
    console.log("   Error details:", e.data || e.reason || "No details");
  }

  try {
    const usdcPrice = await oracle.getAssetPrice(USDC_ADDRESS);
    console.log("✅ USDC price: $" + ethers.formatUnits(usdcPrice, 8));
    console.log("   Raw value:", usdcPrice.toString());
  } catch (e) {
    console.log("❌ USDC price ERROR:", e.message.split('\n')[0]);
    console.log("   Error details:", e.data || e.reason || "No details");
  }

  console.log("\n============================================================");
  console.log("4️⃣  POOL'S ORACLE ACCESS TEST");
  console.log("============================================================\n");

  // Try to get user account data (this internally calls oracle)
  const testUserAddress = "0x0000000000000000000000000000000000000001"; // Dummy address

  try {
    console.log("Testing Pool's ability to query oracle via getUserAccountData...");
    const accountData = await pool.getUserAccountData(testUserAddress);
    console.log("✅ Pool can access oracle successfully");
    console.log("   Account data:", {
      totalCollateral: ethers.formatUnits(accountData[0], 8),
      totalDebt: ethers.formatUnits(accountData[1], 8),
      availableToBorrow: ethers.formatUnits(accountData[2], 8),
      currentLiquidationThreshold: accountData[3].toString(),
      ltv: accountData[4].toString(),
      healthFactor: ethers.formatUnits(accountData[5], 18)
    });
  } catch (e) {
    console.log("❌ Pool CANNOT access oracle");
    console.log("   Error:", e.message.split('\n')[0]);
    if (e.data) {
      console.log("   Error data:", e.data);

      // Try to decode the error
      const errorSelector = e.data.slice(0, 10);
      console.log("   Error selector:", errorSelector);

      if (errorSelector === "0x358d9e8f") {
        console.log("   → This is StalePriceData error!");
        const errorData = e.data.slice(10);
        console.log("   Error params:", errorData);

        // Decode the error parameters
        try {
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ['address', 'uint256'],
            '0x' + errorData
          );
          console.log("   → Asset:", decoded[0]);
          console.log("   → Age/Timestamp:", decoded[1].toString());
        } catch (decodeErr) {
          console.log("   Could not decode error params");
        }
      }
    }
  }

  console.log("\n============================================================");
  console.log("5️⃣  RESERVE DATA CHECK");
  console.log("============================================================\n");

  try {
    const hbarReserveData = await pool.getReserveData(HBAR_ADDRESS);
    console.log("HBAR Reserve:");
    console.log("  Liquidity Index:", hbarReserveData.liquidityIndex.toString());
    console.log("  Variable Borrow Index:", hbarReserveData.variableBorrowIndex.toString());
    console.log("  Current Liquidity Rate:", hbarReserveData.currentLiquidityRate.toString());
    console.log("  Last Update Timestamp:", hbarReserveData.lastUpdateTimestamp.toString());
    console.log("  DToken Address:", hbarReserveData.supplyTokenAddress);
  } catch (e) {
    console.log("❌ Could not get HBAR reserve data:", e.message);
  }

  console.log("\n============================================================");
  console.log("6️⃣  DIAGNOSIS");
  console.log("============================================================\n");

  if (oracleFromProvider.toLowerCase() !== deploymentInfo.addresses.ORACLE.toLowerCase()) {
    console.log("⚠️  CRITICAL: Pool is using DIFFERENT oracle than expected!");
    console.log("   The AddressesProvider needs to be updated with:");
    console.log("   addressesProvider.setPriceOracle('" + deploymentInfo.addresses.ORACLE + "')");
  } else {
    console.log("✅ Pool is using correct oracle address");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
