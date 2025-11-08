const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 DEEP DIAGNOSTIC - Investigating CONTRACT_REVERT_EXECUTED Error\n");
  console.log("=".repeat(80));

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  console.log("📍 Deployer:", deployer.address);
  console.log("📍 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "HBAR\n");

  // Load contracts
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
  const addressesProvider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);

  // ============================================================================
  // 1. CHECK ADDRESS CONSISTENCY
  // ============================================================================
  console.log("1️⃣  ADDRESS CONSISTENCY CHECK");
  console.log("-".repeat(80));

  const poolFromProvider = await addressesProvider.getPool();
  const configuratorFromProvider = await addressesProvider.getPoolConfigurator();

  console.log("Expected Pool:           ", deploymentInfo.addresses.POOL);
  console.log("Provider returns:        ", poolFromProvider);
  console.log("Match:                   ", poolFromProvider === deploymentInfo.addresses.POOL ? "✅" : "❌");

  console.log("\nExpected PoolConfigurator:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("Provider returns:        ", configuratorFromProvider);
  console.log("Match:                   ", configuratorFromProvider === deploymentInfo.addresses.POOL_CONFIGURATOR ? "✅" : "❌");

  // ============================================================================
  // 2. CHECK ACCESS CONTROL
  // ============================================================================
  console.log("\n2️⃣  ACCESS CONTROL CHECK");
  console.log("-".repeat(80));

  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  const isAssetListingAdmin = await aclManager.isAssetListingAdmin(deployer.address);
  const isRiskAdmin = await aclManager.isRiskAdmin(deployer.address);

  console.log("Deployer is Pool Admin:        ", isPoolAdmin ? "✅" : "❌");
  console.log("Deployer is Asset Listing Admin:", isAssetListingAdmin ? "✅" : "❌");
  console.log("Deployer is Risk Admin:        ", isRiskAdmin ? "✅" : "❌");

  // ============================================================================
  // 3. CHECK POOL STATE
  // ============================================================================
  console.log("\n3️⃣  POOL STATE CHECK");
  console.log("-".repeat(80));

  const assetsCount = await pool.getAssetsCount();
  console.log("Assets count:", assetsCount.toString());

  if (assetsCount > 0) {
    const assetsList = await pool.getAssetsList();
    console.log("Assets list:", assetsList);

    for (let asset of assetsList) {
      const assetData = await pool.getAssetData(asset);
      console.log(`\nAsset ${asset}:`);
      console.log("  liquidityIndex:", assetData.liquidityIndex.toString());
      console.log("  supplyTokenAddress:", assetData.supplyTokenAddress);
      console.log("  borrowTokenAddress:", assetData.borrowTokenAddress);
      console.log("  id:", assetData.id.toString());
    }
  } else {
    console.log("No assets initialized yet - this is expected for fresh deployment");
  }

  // Check HBAR specifically
  const hbarData = await pool.getAssetData(ethers.ZeroAddress);
  console.log("\nHBAR (address(0)) state:");
  console.log("  liquidityIndex:", hbarData.liquidityIndex.toString());
  console.log("  supplyTokenAddress:", hbarData.supplyTokenAddress);
  console.log("  id:", hbarData.id.toString());
  console.log("  Already initialized:", hbarData.liquidityIndex > 0n ? "YES ❌" : "NO ✅");

  // ============================================================================
  // 4. TEST POOL.INITASSET DIRECTLY (SIMULATED)
  // ============================================================================
  console.log("\n4️⃣  TESTING POOL.INITASSET() ACCESS");
  console.log("-".repeat(80));

  // Create dummy token addresses for testing
  const dummyDToken = "0x1111111111111111111111111111111111111111";
  const dummyVToken = "0x2222222222222222222222222222222222222222";

  try {
    // Try to call pool.initAsset directly from deployer (should fail - not PoolConfigurator)
    console.log("Attempting pool.initAsset() directly from deployer...");
    await pool.initAsset.staticCall(ethers.ZeroAddress, dummyDToken, dummyVToken);
    console.log("❌ UNEXPECTED: Direct call succeeded (should only work from PoolConfigurator)");
  } catch (e) {
    if (e.message.includes("CallerNotPoolConfigurator")) {
      console.log("✅ Correctly rejects direct calls (CallerNotPoolConfigurator)");
    } else {
      console.log("❌ Unexpected error:", e.message.substring(0, 100));
    }
  }

  // ============================================================================
  // 5. TEST POOLCONFIGURATOR.FINALIZEINITASSET (SIMULATED)
  // ============================================================================
  console.log("\n5️⃣  TESTING POOLCONFIGURATOR.FINALIZEINITASSET()");
  console.log("-".repeat(80));

  try {
    // Try staticCall through PoolConfigurator (proper way)
    console.log("Attempting poolConfigurator.finalizeInitAsset() via staticCall...");
    console.log("  Asset: HBAR (address(0))");
    console.log("  dToken:", dummyDToken);
    console.log("  vToken:", dummyVToken);

    await poolConfigurator.finalizeInitAsset.staticCall(
      ethers.ZeroAddress,
      dummyDToken,
      dummyVToken,
      8
    );
    console.log("✅ StaticCall succeeded!");
  } catch (e) {
    console.log("❌ StaticCall FAILED");
    console.log("Error message:", e.message);
    console.log("\nError details:");
    if (e.code) console.log("  Code:", e.code);
    if (e.reason) console.log("  Reason:", e.reason);
    if (e.data) console.log("  Data:", e.data);

    // Try to decode the error
    if (e.data && e.data !== "0x") {
      try {
        const errorInterface = new ethers.Interface([
          "error AssetAlreadyAdded()",
          "error AssetAlreadyInitialized()",
          "error CallerNotPoolConfigurator()",
          "error CallerNotPoolAdmin()",
          "error NotContract()",
          "error NoMoreReservesAllowed()"
        ]);
        const decoded = errorInterface.parseError(e.data);
        console.log("  Decoded error:", decoded?.name || "Unknown");
      } catch (decodeError) {
        console.log("  Could not decode error data");
      }
    }
  }

  // ============================================================================
  // 6. CHECK POOL MAX RESERVES
  // ============================================================================
  console.log("\n6️⃣  POOL CAPACITY CHECK");
  console.log("-".repeat(80));

  const maxReserves = await pool.MAX_NUMBER_RESERVES();
  console.log("Max reserves allowed:", maxReserves.toString());
  console.log("Current reserves:   ", assetsCount.toString());
  console.log("Capacity remaining: ", (maxReserves - assetsCount).toString());

  // ============================================================================
  // 7. CHECK RATE STRATEGY
  // ============================================================================
  console.log("\n7️⃣  INTEREST RATE STRATEGY CHECK");
  console.log("-".repeat(80));

  const rateStrategyAddress = await pool.RESERVE_INTEREST_RATE_STRATEGY();
  console.log("Rate strategy address:", rateStrategyAddress);
  console.log("Expected:            ", deploymentInfo.addresses.RATE_STRATEGY);
  console.log("Match:               ", rateStrategyAddress === deploymentInfo.addresses.RATE_STRATEGY ? "✅" : "❌");

  // Check if rate strategy contract exists
  const rateStrategyCode = await ethers.provider.getCode(rateStrategyAddress);
  console.log("Rate strategy is contract:", rateStrategyCode !== "0x" ? "✅" : "❌");

  // ============================================================================
  // 8. SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(80));
  console.log("📋 DIAGNOSTIC SUMMARY");
  console.log("=".repeat(80));
  console.log("If staticCall in section 5️⃣  failed, the error details above show the root cause.");
  console.log("Common issues:");
  console.log("  - AssetAlreadyAdded: HBAR already in the pool (check section 3️⃣ )");
  console.log("  - AssetAlreadyInitialized: liquidityIndex != 0 (check section 3️⃣ )");
  console.log("  - CallerNotPoolAdmin: Access control issue (check section 2️⃣ )");
  console.log("  - NotContract: dToken/vToken addresses invalid");
  console.log("\nIf error cannot be decoded, it's likely a library-level revert.");
  console.log("Check AssetLogic, PoolLogic for potential issues.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Diagnostic script failed:");
    console.error(error);
    process.exit(1);
  });
