const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Testing DToken.balanceOf() Call\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("Deployer:", deployer.address);
  console.log("Pool:", deploymentInfo.addresses.POOL);

  // Get HBAR reserve data
  const hbarAssetData = await pool.getAssetData(HBAR_ADDRESS);
  const dTokenAddress = hbarAssetData.supplyTokenAddress;

  console.log("\n============================================================");
  console.log("HBAR RESERVE STATE");
  console.log("============================================================\n");

  console.log("DToken Address:", dTokenAddress);
  console.log("Liquidity Index:", ethers.formatUnits(hbarAssetData.liquidityIndex, 27));
  console.log("Last Update Timestamp:", hbarAssetData.lastUpdateTimestamp.toString());

  const lastUpdate = Number(hbarAssetData.lastUpdateTimestamp);
  if (lastUpdate === 0) {
    console.log("⚠️  WARNING: Reserve has NEVER been updated (timestamp = 0)");
    console.log("   This might cause issues with balance calculations");
  } else {
    const updateDate = new Date(lastUpdate * 1000);
    console.log("Last Update Date:", updateDate.toISOString());
    const ageSeconds = Math.floor(Date.now() / 1000) - lastUpdate;
    console.log("Age:", ageSeconds, "seconds (", Math.floor(ageSeconds / 60), "minutes)");
  }

  console.log("\n============================================================");
  console.log("TESTING DTOKEN.BALANCEOF() - STATIC CALL");
  console.log("============================================================\n");

  const dToken = await ethers.getContractAt("IDeraSupplyToken", dTokenAddress);

  try {
    console.log("Calling dToken.balanceOf(", deployer.address, ")...");
    const balance = await dToken.balanceOf(deployer.address);
    console.log("✅ SUCCESS! Balance:", ethers.formatUnits(balance, 8), "dHBAR");
    console.log("   Raw balance:", balance.toString());
  } catch (error) {
    console.log("❌ FAILED!");
    console.log("\nError message:", error.message);

    if (error.data) {
      console.log("\nError data:", error.data);
      const errorSelector = error.data.slice(0, 10);
      console.log("Error selector:", errorSelector);

      if (errorSelector === "0x358d9e8f") {
        console.log("\n🎯 This is StalePriceData(address, uint256) error!");

        // Try to decode the parameters
        try {
          const errorData = "0x" + error.data.slice(10);
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["address", "uint256"],
            errorData
          );
          console.log("\nDecoded error parameters:");
          console.log("  Asset:", decoded[0]);
          console.log("  Age/Timestamp:", decoded[1].toString());

          if (decoded[1] === ethers.MaxUint256) {
            console.log("\n💡 Age is MaxUint256 - this means oracle.getAssetPrice() returned 0");
            console.log("   But we tested the oracle and it returns non-zero in static calls!");
            console.log("   This suggests the DToken is calling the oracle in a way that fails.");
          }
        } catch (e) {
          console.log("Could not decode error parameters");
        }
      }
    }

    console.log("\n============================================================");
    console.log("DIAGNOSIS");
    console.log("============================================================\n");

    console.log("The balanceOf() call is reverting. This is strange because:");
    console.log("1. balanceOf() is a VIEW function - it shouldn't revert");
    console.log("2. It just needs to calculate: scaledBalance × liquidityIndex");
    console.log("3. It shouldn't need the oracle");
    console.log("\nPossible causes:");
    console.log("- Reserve state is uninitialized (lastUpdateTimestamp = 0)");
    console.log("- DToken trying to update index before returning balance");
    console.log("- Some internal calculation overflowing or reverting");
  }

  console.log("\n============================================================");
  console.log("TESTING SCALED BALANCE (SIMPLER CALL)");
  console.log("============================================================\n");

  try {
    const scaledBalance = await dToken.scaledBalanceOf(deployer.address);
    console.log("✅ scaledBalanceOf() works! Balance:", scaledBalance.toString());
  } catch (error) {
    console.log("❌ scaledBalanceOf() also fails:", error.message);
  }

  console.log("\n============================================================");
  console.log("TESTING POOL.GETUSERACCOUNTDATA()");
  console.log("============================================================\n");

  try {
    console.log("Calling pool.getUserAccountData(", deployer.address, ")...");
    const accountData = await pool.getUserAccountData(deployer.address);
    console.log("✅ SUCCESS!");
    console.log("  Total Collateral:", ethers.formatUnits(accountData[0], 8));
    console.log("  Total Debt:", ethers.formatUnits(accountData[1], 8));
  } catch (error) {
    console.log("❌ FAILED:", error.message.split('\n')[0]);

    if (error.data && error.data.startsWith("0x358d9e8f")) {
      console.log("\n🎯 This call also throws StalePriceData!");
      console.log("   getUserAccountData needs the oracle to calculate collateral value.");
      console.log("   So THIS failing makes sense if oracle has issues.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
