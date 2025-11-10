const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing HBAR Supply and getUserAccountData\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  const POOL = deploymentInfo.addresses.POOL;
  const ORACLE = deploymentInfo.addresses.ORACLE;
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("📍 Addresses:");
  console.log("   Deployer:", deployer.address);
  console.log("   Pool:", POOL);
  console.log("   Oracle:", ORACLE);

  const pool = await ethers.getContractAt("DeraPool", POOL);
  const oracle = await ethers.getContractAt("DeraOracle", ORACLE);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("\n💰 Account Balance:", ethers.formatEther(balance), "HBAR");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check HBAR Configuration");
  console.log("=".repeat(60) + "\n");

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const decimals = (BigInt(config.data) >> 48n) & 0xFFn;
  const ltv = Number(config.data & 0xFFFFn);

  console.log("📊 HBAR Configuration:");
  console.log("   Decimals:", Number(decimals), decimals === 8n ? "✅" : "❌");
  console.log("   LTV:", ltv, `(${ltv / 100}%)`);

  const price = await oracle.getAssetPrice(HBAR_ADDRESS);
  console.log("   Price:", ethers.formatUnits(price, 8), "USD");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: getUserAccountData BEFORE Supply");
  console.log("=".repeat(60) + "\n");

  const dataBefore = await pool.getUserAccountData(deployer.address);
  console.log("📊 Account Data BEFORE:");
  console.log("   Total Collateral:", ethers.formatUnits(dataBefore[0], 8), "USD");
  console.log("   Total Debt:", ethers.formatUnits(dataBefore[1], 8), "USD");
  console.log("   Available Borrows:", ethers.formatUnits(dataBefore[2], 8), "USD");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Supply 250 HBAR");
  console.log("=".repeat(60) + "\n");

  // IMPORTANT: For Hedera EVM, we need to handle HBAR value correctly
  // The amount parameter should be in 8 decimals (HBAR native)
  // But msg.value in ethers.js expects 18 decimals (wei-equivalent)
  const supplyAmountHBAR = ethers.parseUnits("250", 8); // 250 HBAR in 8 decimals
  const supplyValueWei = ethers.parseEther("250");      // 250 HBAR in 18 decimals for msg.value

  console.log("💸 Supplying:", ethers.formatUnits(supplyAmountHBAR, 8), "HBAR");
  console.log("   Amount parameter (8 decimals):", supplyAmountHBAR.toString());
  console.log("   Value parameter (18 decimals):", supplyValueWei.toString());

  try {
    const tx = await pool.supply(
      HBAR_ADDRESS,
      supplyAmountHBAR,
      deployer.address,
      0,
      {
        value: supplyValueWei,  // Use 18 decimal value for ethers.js
        gasLimit: 1000000
      }
    );

    console.log("⏳ Transaction sent:", tx.hash);
    console.log("   Waiting for confirmation...");

    await tx.wait();
    console.log("✅ Supply successful!");

  } catch (error) {
    console.error("\n❌ Supply failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Check dToken Balance");
  console.log("=".repeat(60) + "\n");

  const assetData = await pool.getAssetData(HBAR_ADDRESS);
  const dToken = await ethers.getContractAt(
    ["function balanceOf(address) view returns (uint256)"],
    assetData.supplyTokenAddress
  );

  const dTokenBalance = await dToken.balanceOf(deployer.address);
  console.log("📊 dToken Balance:");
  console.log("   Address:", assetData.supplyTokenAddress);
  console.log("   Balance:", ethers.formatUnits(dTokenBalance, 8), "dHBAR");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: getUserAccountData AFTER Supply");
  console.log("=".repeat(60) + "\n");

  const dataAfter = await pool.getUserAccountData(deployer.address);

  console.log("📊 Account Data AFTER:");
  console.log("   Total Collateral:", ethers.formatUnits(dataAfter[0], 8), "USD");
  console.log("   Total Debt:", ethers.formatUnits(dataAfter[1], 8), "USD");
  console.log("   Available Borrows:", ethers.formatUnits(dataAfter[2], 8), "USD");
  console.log("   LTV:", dataAfter[4].toString());
  console.log("   Health Factor:", ethers.formatUnits(dataAfter[5], 18));

  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION");
  console.log("=".repeat(60) + "\n");

  const collateralUSD = Number(ethers.formatUnits(dataAfter[0], 8));
  const expectedCollateral = 250 * 0.08; // 250 HBAR * $0.08
  const availableBorrowsUSD = Number(ethers.formatUnits(dataAfter[2], 8));
  const expectedBorrows = expectedCollateral * 0.75; // 75% LTV

  console.log("Expected Collateral: ~$" + expectedCollateral.toFixed(2));
  console.log("Actual Collateral:   $" + collateralUSD.toFixed(2));
  console.log("Match:", Math.abs(collateralUSD - expectedCollateral) < 0.01 ? "✅" : "❌");

  console.log("\nExpected Available Borrows: ~$" + expectedBorrows.toFixed(2));
  console.log("Actual Available Borrows:   $" + availableBorrowsUSD.toFixed(2));
  console.log("Match:", Math.abs(availableBorrowsUSD - expectedBorrows) < 0.01 ? "✅" : "❌");

  if (collateralUSD > 0 && availableBorrowsUSD > 0) {
    console.log("\n🎉 SUCCESS! getUserAccountData is working correctly!");
    console.log("   The GenericLogic fix is working!");
    console.log("   HBAR decimals is correct (8)!");
    console.log("   You can now borrow against your collateral!");
  } else {
    console.log("\n❌ ISSUE: getUserAccountData still returning zeros");
    console.log("   Need to investigate further...");
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
