const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Testing User Configuration Bitmap\n");
  console.log("=".repeat(60));

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;

  console.log("Pool Address:", poolAddress);

  const pool = await ethers.getContractAt("DeraPool", poolAddress);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const userAddress = "0x00000000000000000000000000000000006C3cde";

  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Get Asset Configuration");
  console.log("=".repeat(60) + "\n");

  const assetData = await pool.getAssetData(HBAR_ADDRESS);
  console.log("Asset ID:", assetData.id.toString());
  console.log("Supply Token:", assetData.supplyTokenAddress);

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const configData = BigInt(config.data);

  const LTV_MASK = 0xFFFFn;
  const LIQUIDATION_THRESHOLD_START = 16n;
  const DECIMALS_START = 48n;
  const IS_ACTIVE_BIT = 56n;

  const ltv = Number(configData & LTV_MASK);
  const liquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
  const decimals = Number((configData >> DECIMALS_START) & 0xFFn);
  const isActive = (configData & (1n << IS_ACTIVE_BIT)) !== 0n;

  console.log("\nAsset Configuration:");
  console.log("  LTV:", ltv, "basis points");
  console.log("  Liquidation Threshold:", liquidationThreshold, "basis points");
  console.log("  Decimals:", decimals);
  console.log("  Is Active:", isActive);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Get User Configuration");
  console.log("=".repeat(60) + "\n");

  const userConfig = await pool.getUserConfiguration(userAddress);
  const userConfigData = BigInt(userConfig.data);

  console.log("User Config Bitmap (hex):", "0x" + userConfigData.toString(16));
  console.log("User Config Bitmap (bin):", userConfigData.toString(2).padStart(8, '0'));
  console.log("User Config Bitmap (dec):", userConfigData.toString());

  // Check if config is empty
  const isEmpty = userConfigData === 0n;
  console.log("\nIs Config Empty:", isEmpty);

  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Check Specific Bits for HBAR (Asset ID 0)");
  console.log("=".repeat(60) + "\n");

  const assetId = Number(assetData.id);
  console.log("Asset ID:", assetId);

  // Bit positions (each asset has 2 bits)
  const borrowingBit = assetId * 2;
  const collateralBit = assetId * 2 + 1;

  console.log("\nBit Positions:");
  console.log("  Borrowing bit position:", borrowingBit);
  console.log("  Collateral bit position:", collateralBit);

  // Extract bits
  const isBorrowing = (userConfigData >> BigInt(borrowingBit)) & 1n;
  const isUsingAsCollateral = (userConfigData >> BigInt(collateralBit)) & 1n;

  console.log("\nBit Values:");
  console.log("  Borrowing bit (position", borrowingBit + "):", isBorrowing === 1n ? "1 (SET)" : "0 (NOT SET)");
  console.log("  Collateral bit (position", collateralBit + "):", isUsingAsCollateral === 1n ? "1 (SET)" : "0 (NOT SET)");

  console.log("\nInterpretation:");
  console.log("  Is Borrowing:", isBorrowing === 1n ? "✅ YES" : "❌ NO");
  console.log("  Is Using As Collateral:", isUsingAsCollateral === 1n ? "✅ YES" : "❌ NO");

  // Check if using as collateral OR borrowing
  const isUsingAsCollateralOrBorrowing = (isBorrowing === 1n || isUsingAsCollateral === 1n);
  console.log("  Is Using As Collateral OR Borrowing:", isUsingAsCollateralOrBorrowing ? "✅ YES" : "❌ NO");

  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Simulate Contract Logic");
  console.log("=".repeat(60) + "\n");

  console.log("Contract checks these conditions:");
  console.log("  1. !userConfig.isEmpty():", !isEmpty ? "✅ PASS" : "❌ FAIL");
  console.log("  2. userConfig.isUsingAsCollateralOrBorrowing(", assetId + "):", isUsingAsCollateralOrBorrowing ? "✅ PASS" : "❌ FAIL");
  console.log("  3. liquidationThreshold != 0:", liquidationThreshold !== 0 ? "✅ PASS" : "❌ FAIL");
  console.log("  4. userConfig.isUsingAsCollateral(", assetId + "):", isUsingAsCollateral === 1n ? "✅ PASS" : "❌ FAIL");

  const shouldCalculateCollateral =
    !isEmpty &&
    isUsingAsCollateralOrBorrowing &&
    liquidationThreshold !== 0 &&
    isUsingAsCollateral === 1n;

  console.log("\n" + "=".repeat(60));
  if (shouldCalculateCollateral) {
    console.log("✅ ALL CONDITIONS PASS - Collateral SHOULD be calculated");
    console.log("=".repeat(60));
    console.log("\n❌ BUT getUserAccountData returned 0!");
    console.log("This means there's a different issue in the contract logic.");
    console.log("\nPossible causes:");
    console.log("  1. normalizedIncome is 0 or very small");
    console.log("  2. Integer overflow/underflow in calculation");
    console.log("  3. Division by assetUnit is eliminating the value");
  } else {
    console.log("❌ CONDITION CHECK FAILED - Collateral will NOT be calculated");
    console.log("=".repeat(60));
    console.log("\nThis explains why getUserAccountData returns 0!");
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: Check Liquidity Index (Normalized Income)");
  console.log("=".repeat(60) + "\n");

  try {
    const liquidityIndex = await pool.getAssetNormalizedIncome(HBAR_ADDRESS);
    console.log("Liquidity Index (raw):", liquidityIndex.toString());
    console.log("Liquidity Index (formatted):", ethers.formatUnits(liquidityIndex, 27), "RAY");

    if (liquidityIndex === 0n) {
      console.log("\n❌ CRITICAL: Liquidity Index is ZERO!");
      console.log("This will cause all collateral calculations to return 0!");
      console.log("\nThis is the root cause!");
    } else {
      console.log("\n✅ Liquidity Index is non-zero");
    }
  } catch (error) {
    console.error("❌ Failed to get liquidity index:", error.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: Manual Calculation");
  console.log("=".repeat(60) + "\n");

  try {
    const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    const liquidityIndex = await pool.getAssetNormalizedIncome(HBAR_ADDRESS);

    const dTokenABI = ["function balanceOf(address) view returns (uint256)"];
    const dToken = await ethers.getContractAt(dTokenABI, assetData.supplyTokenAddress);
    const balance = await dToken.balanceOf(userAddress);

    console.log("Input values:");
    console.log("  dToken balance:", balance.toString(), `(${ethers.formatUnits(balance, decimals)} HBAR)`);
    console.log("  Liquidity index:", liquidityIndex.toString(), `(${ethers.formatUnits(liquidityIndex, 27)} RAY)`);
    console.log("  Price:", price.toString(), `($${ethers.formatUnits(price, 8)})`);
    console.log("  Asset unit (10^decimals):", (10n ** BigInt(decimals)).toString());

    console.log("\nStep-by-step calculation:");

    // Step 1: rayMul
    const RAY = 10n ** 27n;
    const balanceNormalized = (balance * liquidityIndex) / RAY;
    console.log("  1. balance.rayMul(liquidityIndex):", balanceNormalized.toString());

    // Step 2: multiply by price
    const balanceTimesPrice = balanceNormalized * price;
    console.log("  2. (balance * index) * price:", balanceTimesPrice.toString());

    // Step 3: divide by asset unit
    const assetUnit = 10n ** BigInt(decimals);
    const finalValue = balanceTimesPrice / assetUnit;
    console.log("  3. (balance * index * price) / assetUnit:", finalValue.toString());

    console.log("\nExpected collateral in base currency:", finalValue.toString());
    console.log("Expected collateral in USD:", ethers.formatUnits(finalValue, 8));

    if (finalValue === 0n) {
      console.log("\n❌ RESULT IS ZERO!");
      console.log("One of the intermediate values must be too small.");
    } else {
      console.log("\n✅ Expected result is non-zero");
      console.log("But contract returned 0 - there's a bug in the contract!");
    }

  } catch (error) {
    console.error("❌ Manual calculation failed:", error.message);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
