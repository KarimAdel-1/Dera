const { ethers } = require("hardhat");
const fs = require("fs");

const HBAR_TOKEN_ID = "0.0.0";
const USDC_TOKEN_ID = "0.0.429274";

function tokenIdToAddress(tokenId) {
  if (tokenId === "0.0.0") return ethers.ZeroAddress;
  const parts = tokenId.split('.');
  return '0x' + parseInt(parts[2]).toString(16).padStart(40, '0');
}

async function createProxy(implementation) {
  const cloneInitCode = "0x3d602d80600a3d3981f3363d3d373d3d3d363d73" + 
                        implementation.slice(2) + 
                        "5af43d82803e903d91602b57fd5bf3";
  const [deployer] = await ethers.getSigners();
  const tx = await deployer.sendTransaction({ data: cloneInitCode });
  const receipt = await tx.wait();
  return receipt.contractAddress;
}

async function main() {
  console.log("🚀 Direct Asset Initialization (Bypassing ConfiguratorLogic)\n");

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
  const addressesProvider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);

  // CRITICAL DIAGNOSTICS: Check if PoolConfigurator is properly registered
  console.log("🔍 Pre-flight checks:");
  const poolFromProvider = await addressesProvider.getPool();
  const configuratorFromProvider = await addressesProvider.getPoolConfigurator();
  console.log("  Pool address (expected):", deploymentInfo.addresses.POOL);
  console.log("  Pool address (from provider):", poolFromProvider);
  console.log("  PoolConfigurator (expected):", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("  PoolConfigurator (from provider):", configuratorFromProvider);

  if (poolFromProvider !== deploymentInfo.addresses.POOL) {
    throw new Error("❌ Pool address mismatch! Provider has old Pool address.");
  }
  if (configuratorFromProvider !== deploymentInfo.addresses.POOL_CONFIGURATOR) {
    throw new Error("❌ PoolConfigurator address mismatch! Provider has old PoolConfigurator address.");
  }
  console.log("  ✓ All addresses match");

  // NEW: Check if Pool's ADDRESSES_PROVIDER matches
  console.log("\n🔍 Checking Pool's immutable ADDRESSES_PROVIDER:");
  const poolAddressesProvider = await pool.ADDRESSES_PROVIDER();
  console.log("  Pool's ADDRESSES_PROVIDER:", poolAddressesProvider);
  console.log("  Expected:                 ", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  if (poolAddressesProvider !== deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER) {
    throw new Error("❌ Pool was deployed with wrong ADDRESSES_PROVIDER!");
  }
  console.log("  ✓ Match");

  // NEW: Simulate the onlyPoolConfigurator check
  console.log("\n🔍 Simulating onlyPoolConfigurator modifier check:");
  console.log("  When PoolConfigurator calls pool.initAsset():");
  console.log("    _msgSender() will be:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("    ADDRESSES_PROVIDER.getPoolConfigurator() returns:", configuratorFromProvider);
  console.log("    Match:", configuratorFromProvider === deploymentInfo.addresses.POOL_CONFIGURATOR ? "✅" : "❌");
  if (configuratorFromProvider !== deploymentInfo.addresses.POOL_CONFIGURATOR) {
    throw new Error("❌ onlyPoolConfigurator check will FAIL!");
  }
  console.log("  ✓ onlyPoolConfigurator should pass\n");

  // Check current Pool state
  console.log("📊 Current Pool state:");
  const assetsCount = await pool.getAssetsCount();
  console.log("  Assets count:", assetsCount.toString());

  if (assetsCount > 0) {
    const assetsList = await pool.getAssetsList();
    console.log("  Assets list:", assetsList);

    // Check if HBAR is already in the list
    if (assetsList.includes(ethers.ZeroAddress)) {
      console.log("  ⚠️  HBAR (0x0) is already in the assets list!");
      console.log("  This will cause 'AssetAlreadyAdded' error");

      // Get HBAR data to see its state
      const hbarData = await pool.getAssetData(ethers.ZeroAddress);
      console.log("  HBAR current state:");
      console.log("    liquidityIndex:", hbarData.liquidityIndex.toString());
      console.log("    supplyTokenAddress:", hbarData.supplyTokenAddress);
      console.log("    borrowTokenAddress:", hbarData.borrowTokenAddress);
      console.log("    id:", hbarData.id.toString());

      if (hbarData.liquidityIndex > 0n) {
        throw new Error("❌ HBAR is already initialized! Cannot reinitialize. Please deploy a fresh Pool.");
      }
    }
  }
  console.log("");

  // HBAR
  console.log("=" .repeat(60));
  console.log("HBAR (Token ID: " + HBAR_TOKEN_ID + ")");
  console.log("=".repeat(60));
  
  const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
  const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");
  
  console.log("Using Pool address:", deploymentInfo.addresses.POOL);
  
  const hbarDTokenImpl = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
  await hbarDTokenImpl.waitForDeployment();
  const hbarDTokenImplAddr = await hbarDTokenImpl.getAddress();
  
  const hbarVTokenImpl = await VToken.deploy(deploymentInfo.addresses.POOL);
  await hbarVTokenImpl.waitForDeployment();
  const hbarVTokenImplAddr = await hbarVTokenImpl.getAddress();
  
  console.log("✅ Implementations deployed");
  
  const hbarDTokenProxy = await createProxy(hbarDTokenImplAddr);
  const hbarVTokenProxy = await createProxy(hbarVTokenImplAddr);
  console.log("✅ Proxies created");
  console.log("  dToken:", hbarDTokenProxy);
  console.log("  vToken:", hbarVTokenProxy);
  
  const hbarDToken = await ethers.getContractAt("ConcreteDeraSupplyToken", hbarDTokenProxy);
  const hbarVToken = await ethers.getContractAt("ConcreteDeraBorrowToken", hbarVTokenProxy);
  
  await (await hbarDToken.initialize(deploymentInfo.addresses.POOL, ethers.ZeroAddress, 8, "Dera HBAR", "dHBAR", "0x")).wait();
  await (await hbarVToken.initialize(deploymentInfo.addresses.POOL, ethers.ZeroAddress, 8, "Dera Variable Debt HBAR", "vdHBAR", "0x")).wait();
  console.log("✅ Proxies initialized");
  
  try {
    // First check access control
    const poolConfigurator_check = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
    const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
    const [caller] = await ethers.getSigners();
    const isPoolAdmin = await aclManager.isPoolAdmin(caller.address);

    if (!isPoolAdmin) {
      throw new Error(`Caller ${caller.address} is not a Pool Admin. Run: npm run grant:configurator`);
    }

    console.log("✓ Access control verified");

    // Static call to check for reverts before executing
    console.log("  Testing transaction with staticCall...");
    await poolConfigurator.finalizeInitAsset.staticCall(ethers.ZeroAddress, hbarDTokenProxy, hbarVTokenProxy, 8);
    console.log("  ✓ StaticCall succeeded");

    // Execute the actual transaction
    console.log("  Executing finalizeInitAsset...");
    const tx = await poolConfigurator.finalizeInitAsset(ethers.ZeroAddress, hbarDTokenProxy, hbarVTokenProxy, 8);
    console.log("  Transaction hash:", tx.hash);

    const receipt = await tx.wait();
    console.log("  ✓ Transaction confirmed");
    console.log("✅ Registered in Pool");
  } catch (e) {
    console.log("❌ Failed to register in Pool:", e.message);
    console.log("\nDetailed error:");
    console.log("  Error code:", e.code);
    console.log("  Error data:", e.data);
    if (e.reason) console.log("  Reason:", e.reason);
    if (e.error && e.error.message) console.log("  Inner error:", e.error.message);

    console.log("\n⚠️  Troubleshooting steps:");
    console.log("  1. Verify deployer has Pool Admin role: npm run grant:configurator");
    console.log("  2. Check Pool uses latest AssetLogic: npm run redeploy-pool-only");
    console.log("  3. Run diagnostics: npx hardhat run scripts/diagnose-asset-init.js --network testnet");
    throw new Error("HBAR initialization failed - see troubleshooting steps above");
  }
  
  await (await poolConfigurator.configureAssetAsCollateral(ethers.ZeroAddress, 7500, 8000, 10500)).wait();
  await (await poolConfigurator.setAssetActive(ethers.ZeroAddress, true)).wait();
  await (await poolConfigurator.setAssetBorrowing(ethers.ZeroAddress, true)).wait();
  console.log("✅ HBAR configured and active");
  
  // USDC
  console.log("\n" + "=".repeat(60));
  console.log("USDC (Token ID: " + USDC_TOKEN_ID + ")");
  console.log("=".repeat(60));
  
  const USDC_ADDRESS = tokenIdToAddress(USDC_TOKEN_ID);
  
  const usdcDTokenImpl = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
  await usdcDTokenImpl.waitForDeployment();
  const usdcDTokenImplAddr = await usdcDTokenImpl.getAddress();
  
  const usdcVTokenImpl = await VToken.deploy(deploymentInfo.addresses.POOL);
  await usdcVTokenImpl.waitForDeployment();
  const usdcVTokenImplAddr = await usdcVTokenImpl.getAddress();
  
  console.log("✅ Implementations deployed");
  
  const usdcDTokenProxy = await createProxy(usdcDTokenImplAddr);
  const usdcVTokenProxy = await createProxy(usdcVTokenImplAddr);
  console.log("✅ Proxies created");
  console.log("  dToken:", usdcDTokenProxy);
  console.log("  vToken:", usdcVTokenProxy);
  
  const usdcDToken = await ethers.getContractAt("ConcreteDeraSupplyToken", usdcDTokenProxy);
  const usdcVToken = await ethers.getContractAt("ConcreteDeraBorrowToken", usdcVTokenProxy);
  
  await (await usdcDToken.initialize(deploymentInfo.addresses.POOL, USDC_ADDRESS, 6, "Dera USDC", "dUSDC", "0x")).wait();
  await (await usdcVToken.initialize(deploymentInfo.addresses.POOL, USDC_ADDRESS, 6, "Dera Variable Debt USDC", "vdUSDC", "0x")).wait();
  console.log("✅ Proxies initialized");
  
  await (await poolConfigurator.finalizeInitAsset(USDC_ADDRESS, usdcDTokenProxy, usdcVTokenProxy, 6)).wait();
  console.log("✅ Registered in Pool");
  
  await (await poolConfigurator.configureAssetAsCollateral(USDC_ADDRESS, 8000, 8500, 10500)).wait();
  await (await poolConfigurator.setAssetActive(USDC_ADDRESS, true)).wait();
  await (await poolConfigurator.setAssetBorrowing(USDC_ADDRESS, true)).wait();
  console.log("✅ USDC configured and active");
  
  // Verify
  const assetsList = await pool.getAssetsList();
  console.log("\n✅ Assets in pool:", assetsList.length);
  console.log("  HBAR:", assetsList.includes(ethers.ZeroAddress));
  console.log("  USDC:", assetsList.includes(USDC_ADDRESS));
  
  console.log("\n🎉 Initialization complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
