const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 HBAR Asset Configuration Diagnostic\n");
  console.log("============================================================");
  console.log("This script checks why getUserAccountData returns zeros");
  console.log("============================================================\n");

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const poolAddress = deploymentInfo.addresses.POOL;
  const oracleAddress = deploymentInfo.addresses.ORACLE;

  console.log("📍 Contract Addresses:");
  console.log("   Pool:", poolAddress);
  console.log("   Oracle:", oracleAddress);
  console.log("   Deployer:", deployer.address);

  const pool = await ethers.getContractAt("DeraPool", poolAddress);
  const oracle = await ethers.getContractAt("DeraOracle", oracleAddress);

  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("\n============================================================");
  console.log("STEP 1: Check HBAR Asset Initialization");
  console.log("============================================================\n");

  let assetData;
  try {
    assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log("✅ HBAR asset is initialized");
    console.log("   Asset ID:", assetData.id.toString());
    console.log("   Supply Token:", assetData.supplyTokenAddress);
    console.log("   Borrow Token:", assetData.borrowTokenAddress);
    console.log("   Liquidity Index:", ethers.formatUnits(assetData.liquidityIndex, 27));
    console.log("   Last Update:", new Date(Number(assetData.lastUpdateTimestamp) * 1000).toISOString());
  } catch (error) {
    console.log("❌ HBAR asset NOT initialized!");
    console.log("   Error:", error.message);
    console.log("\n🔧 Required Fix: Run asset initialization script");
    process.exit(1);
  }

  console.log("\n============================================================");
  console.log("STEP 2: Check Asset Configuration Bitmap");
  console.log("============================================================\n");

  const config = await pool.getConfiguration(HBAR_ADDRESS);
  const configData = BigInt(config.data);

  console.log("Raw Config Data:", "0x" + configData.toString(16));

  // Decode all relevant configuration parameters
  const LTV_MASK = 0xFFFFn;
  const LIQUIDATION_THRESHOLD_START = 16n;
  const LIQUIDATION_BONUS_START = 32n;
  const DECIMALS_START = 48n;
  const IS_ACTIVE_BIT = 56n;
  const IS_FROZEN_BIT = 57n;
  const BORROWING_ENABLED_BIT = 58n;
  const IS_PAUSED_BIT = 60n;

  const ltv = Number(configData & LTV_MASK);
  const liquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
  const liquidationBonus = Number((configData >> LIQUIDATION_BONUS_START) & LTV_MASK);
  const decimals = Number((configData >> DECIMALS_START) & 0xFFn);
  const isActive = (configData & (1n << IS_ACTIVE_BIT)) !== 0n;
  const isFrozen = (configData & (1n << IS_FROZEN_BIT)) !== 0n;
  const borrowingEnabled = (configData & (1n << BORROWING_ENABLED_BIT)) !== 0n;
  const isPaused = (configData & (1n << IS_PAUSED_BIT)) !== 0n;

  console.log("📊 Configuration Parameters:");
  console.log("   LTV:", ltv, "basis points", `(${ltv / 100}%)`);
  console.log("   Liquidation Threshold:", liquidationThreshold, "basis points", `(${liquidationThreshold / 100}%)`);
  console.log("   Liquidation Bonus:", liquidationBonus, "basis points", `(${liquidationBonus / 100}%)`);
  console.log("   Decimals:", decimals);
  console.log("   Active:", isActive ? "✅ Yes" : "❌ No");
  console.log("   Frozen:", isFrozen ? "⚠️  Yes" : "✅ No");
  console.log("   Borrowing Enabled:", borrowingEnabled ? "✅ Yes" : "❌ No");
  console.log("   Paused:", isPaused ? "⚠️  Yes" : "✅ No");

  // Check for issues
  const configIssues = [];
  if (!isActive) configIssues.push("Asset is NOT ACTIVE");
  if (isFrozen) configIssues.push("Asset is FROZEN");
  if (isPaused) configIssues.push("Asset is PAUSED");
  if (ltv === 0) configIssues.push("LTV is ZERO - cannot use as collateral");
  if (liquidationThreshold === 0) configIssues.push("Liquidation Threshold is ZERO");

  if (configIssues.length > 0) {
    console.log("\n❌ Configuration Issues Found:");
    configIssues.forEach(issue => console.log("   ⚠️ ", issue));
  } else {
    console.log("\n✅ Asset configuration looks good!");
  }

  console.log("\n============================================================");
  console.log("STEP 3: Check Oracle Price");
  console.log("============================================================\n");

  try {
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    const priceInUSD = ethers.formatUnits(price, 8); // Oracle uses 8 decimals
    console.log("✅ Oracle Price for HBAR:", priceInUSD, "USD");

    if (price === 0n) {
      console.log("❌ CRITICAL: Oracle returning ZERO price!");
      console.log("   This will cause getUserAccountData to return all zeros!");
      console.log("\n🔧 Required Fix: Set oracle price using set-oracle-prices.js");
    }
  } catch (error) {
    console.log("❌ Failed to get oracle price:", error.message);
    console.log("   This will cause getUserAccountData to fail!");
  }

  console.log("\n============================================================");
  console.log("STEP 4: Check dToken Balance");
  console.log("============================================================\n");

  const dTokenAddress = assetData.supplyTokenAddress;
  const dTokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function scaledBalanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)"
  ];
  const dToken = new ethers.Contract(dTokenAddress, dTokenABI, deployer);

  const userAddress = "0x00000000000000000000000000000000006C3cde"; // HashPack wallet
  const balance = await dToken.balanceOf(userAddress);
  const scaledBalance = await dToken.scaledBalanceOf(userAddress);
  const totalSupply = await dToken.totalSupply();

  console.log("👛 User dToken Balance (0.0.7093470):");
  console.log("   Balance:", ethers.formatUnits(balance, decimals), "dHBAR");
  console.log("   Scaled Balance:", ethers.formatUnits(scaledBalance, decimals));
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, decimals), "dHBAR");

  if (balance === 0n) {
    console.log("❌ User has ZERO dToken balance!");
    console.log("   getUserAccountData will return zeros because no supply detected");
  } else {
    console.log("✅ User has dToken balance - supply is recorded");
  }

  console.log("\n============================================================");
  console.log("STEP 5: Test getUserAccountData");
  console.log("============================================================\n");

  try {
    const accountData = await pool.getUserAccountData(userAddress);
    console.log("📊 Account Data:");
    console.log("   Total Collateral (USD):", ethers.formatUnits(accountData.totalCollateralUSD, 8));
    console.log("   Total Debt (USD):", ethers.formatUnits(accountData.totalDebtUSD, 8));
    console.log("   Available Borrow (USD):", ethers.formatUnits(accountData.availableBorrowsUSD, 8));
    console.log("   Liquidation Threshold:", accountData.currentLiquidationThreshold.toString());
    console.log("   LTV:", accountData.ltv.toString());
    console.log("   Health Factor:", ethers.formatUnits(accountData.healthFactor, 18));

    if (accountData.totalCollateralUSD === 0n) {
      console.log("\n❌ Total Collateral is ZERO!");
      console.log("   Possible reasons:");
      console.log("   1. User hasn't enabled HBAR as collateral yet");
      console.log("   2. LTV is zero (cannot use as collateral)");
      console.log("   3. Oracle price is zero");
      console.log("   4. dToken balance not recognized");
    } else {
      console.log("\n✅ Account data shows collateral value!");
    }
  } catch (error) {
    console.log("❌ getUserAccountData failed:", error.message);
  }

  console.log("\n============================================================");
  console.log("STEP 6: Check User Configuration (Collateral Status)");
  console.log("============================================================\n");

  try {
    const userConfig = await pool.getUserConfiguration(userAddress);
    const userConfigData = BigInt(userConfig.data);
    console.log("User Config Bitmap:", "0x" + userConfigData.toString(16));

    const assetId = Number(assetData.id);
    const borrowBitPosition = assetId * 2;
    const collateralBitPosition = assetId * 2 + 1;

    const isBorrowing = (userConfigData >> BigInt(borrowBitPosition)) & 1n;
    const isUsingAsCollateral = (userConfigData >> BigInt(collateralBitPosition)) & 1n;

    console.log(`\nHBAR (Asset ID ${assetId}):`);
    console.log("   Borrowing:", isBorrowing === 1n ? "✅ Yes" : "❌ No");
    console.log("   Using as Collateral:", isUsingAsCollateral === 1n ? "✅ Yes" : "❌ No");

    if (isUsingAsCollateral === 0n && balance > 0n) {
      console.log("\n⚠️  User has supplied HBAR but NOT enabled as collateral!");
      console.log("   This is why getUserAccountData shows zero collateral");
      console.log("   User needs to call setUserUseAssetAsCollateral(HBAR, true)");
    }
  } catch (error) {
    console.log("❌ Failed to get user configuration:", error.message);
  }

  console.log("\n============================================================");
  console.log("STEP 7: Check Borrow Token");
  console.log("============================================================\n");

  const borrowTokenAddress = assetData.borrowTokenAddress;
  if (borrowTokenAddress === ethers.ZeroAddress) {
    console.log("❌ Borrow token (variable debt token) NOT initialized");
    console.log("   Users cannot borrow HBAR until borrow token is deployed");
  } else {
    console.log("✅ Borrow token address:", borrowTokenAddress);
  }

  console.log("\n============================================================");
  console.log("DIAGNOSTIC SUMMARY");
  console.log("============================================================\n");

  const allIssues = [];

  if (!isActive) allIssues.push("Asset is not active");
  if (isFrozen) allIssues.push("Asset is frozen");
  if (isPaused) allIssues.push("Asset is paused");
  if (ltv === 0) allIssues.push("LTV is zero - cannot use as collateral");
  if (liquidationThreshold === 0) allIssues.push("Liquidation threshold is zero");

  try {
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    if (price === 0n) allIssues.push("Oracle price is zero");
  } catch (e) {
    allIssues.push("Oracle price unavailable");
  }

  if (balance === 0n) {
    allIssues.push("User has no dToken balance");
  } else {
    try {
      const userConfig = await pool.getUserConfiguration(userAddress);
      const userConfigData = BigInt(userConfig.data);
      const assetId = Number(assetData.id);
      const collateralBitPosition = assetId * 2 + 1;
      const isUsingAsCollateral = (userConfigData >> BigInt(collateralBitPosition)) & 1n;

      if (isUsingAsCollateral === 0n) {
        allIssues.push("User has NOT enabled HBAR as collateral");
      }
    } catch (e) {
      allIssues.push("Could not check user collateral status");
    }
  }

  if (borrowTokenAddress === ethers.ZeroAddress) {
    allIssues.push("Borrow token not initialized (cannot borrow HBAR)");
  }

  if (allIssues.length === 0) {
    console.log("✅ No issues detected! Everything looks configured correctly.");
  } else {
    console.log("❌ Issues Found:\n");
    allIssues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });

    console.log("\n🔧 Recommended Fixes:\n");

    if (ltv === 0 || liquidationThreshold === 0) {
      console.log("   1. Configure collateral parameters:");
      console.log("      - Set LTV (e.g., 7500 = 75%)");
      console.log("      - Set Liquidation Threshold (e.g., 8000 = 80%)");
      console.log("      - Run: npx hardhat run scripts/configure-hbar-collateral.js");
    }

    try {
      const price = await oracle.getAssetPrice(HBAR_ADDRESS);
      if (price === 0n) {
        console.log("   2. Set oracle price:");
        console.log("      - Run: npm run set:oracle");
      }
    } catch (e) {}

    if (balance > 0n) {
      try {
        const userConfig = await pool.getUserConfiguration(userAddress);
        const userConfigData = BigInt(userConfig.data);
        const assetId = Number(assetData.id);
        const collateralBitPosition = assetId * 2 + 1;
        const isUsingAsCollateral = (userConfigData >> BigInt(collateralBitPosition)) & 1n;

        if (isUsingAsCollateral === 0n) {
          console.log("   3. Enable HBAR as collateral:");
          console.log("      - Use the toggle collateral button in the UI");
          console.log("      - Or call: pool.setUserUseAssetAsCollateral(HBAR, true)");
        }
      } catch (e) {}
    }
  }

  console.log("\n============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
