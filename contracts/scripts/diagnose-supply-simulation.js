const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking Reserve Initialization Requirements\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("Deployer:", deployer.address);

  // Get HBAR reserve data
  const hbarAssetData = await pool.getAssetData(HBAR_ADDRESS);
  const dTokenAddress = hbarAssetData.supplyTokenAddress;

  console.log("\n============================================================");
  console.log("RESERVE STATE");
  console.log("============================================================\n");

  console.log("DToken:", dTokenAddress);
  console.log("Liquidity Index:", ethers.formatUnits(hbarAssetData.liquidityIndex, 27));
  console.log("Variable Borrow Index:", ethers.formatUnits(hbarAssetData.variableBorrowIndex, 27));
  console.log("Current Liquidity Rate:", hbarAssetData.currentLiquidityRate.toString());
  console.log("Last Update Timestamp:", hbarAssetData.lastUpdateTimestamp.toString());

  console.log("\n============================================================");
  console.log("CHECKING IF FIRST SUPPLY NEEDS SPECIAL INITIALIZATION");
  console.log("============================================================\n");

  // Check if liquidityIndex and variableBorrowIndex are initialized
  const liquidityIndex = hbarAssetData.liquidityIndex;
  const variableBorrowIndex = hbarAssetData.variableBorrowIndex;

  if (liquidityIndex === 0n) {
    console.log("❌ Liquidity Index is 0! Reserve not initialized.");
    console.log("   This will cause division by zero or other errors.");
  } else {
    console.log("✅ Liquidity Index initialized:", ethers.formatUnits(liquidityIndex, 27));
  }

  if (variableBorrowIndex === 0n) {
    console.log("❌ Variable Borrow Index is 0! Reserve not initialized.");
  } else {
    console.log("✅ Variable Borrow Index initialized:", ethers.formatUnits(variableBorrowIndex, 27));
  }

  console.log("\n============================================================");
  console.log("SIMULATING SUPPLY TRANSACTION");
  console.log("============================================================\n");

  const amountHbar = ethers.parseUnits("0.1", 8);
  const valueWei = ethers.parseEther("0.1");

  console.log("Attempting to call pool.supply()...");
  console.log("  Asset:", HBAR_ADDRESS);
  console.log("  Amount:", ethers.formatUnits(amountHbar, 8), "HBAR");
  console.log("  Value:", ethers.formatEther(valueWei), "HBAR (wei)");

  try {
    // Use callStatic to simulate without sending transaction
    await pool.supply.staticCall(
      HBAR_ADDRESS,
      amountHbar,
      deployer.address,
      0,
      { value: valueWei }
    );

    console.log("\n✅ Static call succeeded!");
    console.log("   The supply transaction SHOULD work.");
    console.log("   But it might fail when actually sent due to gas or other issues.");
  } catch (error) {
    console.log("\n❌ Static call FAILED!");
    console.log("\nError:", error.message.split('\n')[0]);

    if (error.data) {
      console.log("\nError data:", error.data);
      const errorSelector = error.data.slice(0, 10);
      console.log("Error selector:", errorSelector);

      if (errorSelector === "0x358d9e8f") {
        console.log("\n🎯 StalePriceData error during supply!");
        console.log("   This confirms the oracle issue happens during supply,");
        console.log("   not just during balanceOf calls.");

        // Decode error
        try {
          const errorData = "0x" + error.data.slice(10);
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["address", "uint256"],
            errorData
          );
          console.log("\nError details:");
          console.log("  Asset causing error:", decoded[0]);
          console.log("  Timestamp/Age:", decoded[1].toString());

          if (decoded[1] === ethers.MaxUint256) {
            console.log("\n  💡 Age is MaxUint256 - oracle returned price = 0");
          }
        } catch (e) {
          console.log("Could not decode error parameters");
        }
      }
    }

    console.log("\n============================================================");
    console.log("DEEPER INVESTIGATION NEEDED");
    console.log("============================================================\n");

    console.log("The supply transaction fails even in static call simulation.");
    console.log("This means the issue is in the contract logic, not gas or network.");
    console.log("\nLet's check if the oracle is being called correctly...");
  }

  console.log("\n============================================================");
  console.log("TESTING ORACLE DIRECTLY FROM POOL CONTEXT");
  console.log("============================================================\n");

  // Get oracle from pool
  const addressesProvider = await ethers.getContractAt(
    "PoolAddressesProvider",
    deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER
  );
  const oracleAddress = await addressesProvider.getPriceOracle();
  const oracle = await ethers.getContractAt("DeraOracle", oracleAddress);

  console.log("Oracle address:", oracleAddress);

  try {
    const hbarPrice = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("✅ Oracle returns HBAR price:", "$" + ethers.formatUnits(hbarPrice, 8));
  } catch (error) {
    console.log("❌ Oracle.getAssetPrice(HBAR) failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
