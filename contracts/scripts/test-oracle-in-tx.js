const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Testing Oracle in Transaction Context\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("Oracle:", deploymentInfo.addresses.ORACLE);
  console.log("Deployer:", deployer.address);

  console.log("\n============================================================");
  console.log("TEST 1: STATIC CALL (VIEW)");
  console.log("============================================================\n");

  try {
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("✅ Static call works!");
    console.log("   HBAR price:", "$" + ethers.formatUnits(price, 8));
    console.log("   Raw value:", price.toString());
  } catch (error) {
    console.log("❌ Static call failed:", error.message);
  }

  console.log("\n============================================================");
  console.log("TEST 2: CALL FROM WITHIN TRANSACTION");
  console.log("============================================================\n");

  // Deploy a simple contract that calls the oracle
  console.log("Deploying test contract that will call oracle...");

  const TestOracleCall = await ethers.getContractFactory("TestOracleCall");
  const testContract = await TestOracleCall.deploy(deploymentInfo.addresses.ORACLE);
  await testContract.waitForDeployment();

  const testContractAddress = await testContract.getAddress();
  console.log("✅ Test contract deployed at:", testContractAddress);

  console.log("\nAttempting to call oracle from within a transaction...");

  try {
    const tx = await testContract.testGetPrice(HBAR_ADDRESS, { gasLimit: 500000 });
    const receipt = await tx.wait();
    console.log("✅ Transaction succeeded!");
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log("   Transaction hash:", tx.hash);

    // Get the price from the contract
    const price = await testContract.lastPrice();
    console.log("   HBAR price from transaction:", "$" + ethers.formatUnits(price, 8));
  } catch (error) {
    console.log("❌ Transaction FAILED!");
    console.log("\nError:", error.message.split('\n')[0]);

    if (error.data) {
      console.log("\nError data:", error.data);
      const errorSelector = error.data.slice(0, 10);

      if (errorSelector === "0x358d9e8f") {
        console.log("\n🎯 StalePriceData error!");
        console.log("   The oracle fails when called from within a transaction!");
        console.log("   But it works in static calls!");
        console.log("\n   This means there's something about the transaction context");
        console.log("   (gas, state, timing, etc.) that breaks the oracle.");
      }
    }
  }

  console.log("\n============================================================");
  console.log("DIAGNOSIS");
  console.log("============================================================\n");

  console.log("If TEST 1 passes but TEST 2 fails:");
  console.log("  → The oracle has a bug that only appears in transactions");
  console.log("  → Possible causes:");
  console.log("    - Gas limit issues");
  console.log("    - State-changing code in a view function");
  console.log("    - Timing/timestamp dependencies");
  console.log("\nIf both tests pass:");
  console.log("  → The oracle is fine");
  console.log("  → The issue is elsewhere in the Pool/supply logic");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
