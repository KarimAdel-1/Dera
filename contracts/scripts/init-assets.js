const { ethers } = require("hardhat");
const fs = require("fs");

// Token IDs (Hedera format)
const HBAR_TOKEN_ID = "0.0.0"; // Native HBAR
const USDC_TOKEN_ID = "0.0.429274"; // USDC on Hedera Testnet

// Convert Hedera Token ID to EVM address
function tokenIdToAddress(tokenId) {
  if (tokenId === "0.0.0") {
    return ethers.ZeroAddress; // Native HBAR
  }
  const parts = tokenId.split('.');
  const num = parseInt(parts[2]);
  return '0x' + num.toString(16).padStart(40, '0');
}

const HBAR_ADDRESS = tokenIdToAddress(HBAR_TOKEN_ID);
const USDC_ADDRESS = tokenIdToAddress(USDC_TOKEN_ID);

async function main() {
  console.log("🚀 Initializing Assets (HBAR + USDC)\n");
  console.log("Token IDs:");
  console.log("  HBAR:", HBAR_TOKEN_ID, "→", HBAR_ADDRESS);
  console.log("  USDC:", USDC_TOKEN_ID, "→", USDC_ADDRESS);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;
  const poolConfiguratorAddress = deploymentInfo.addresses.POOL_CONFIGURATOR;
  const rateStrategyAddress = deploymentInfo.addresses.RATE_STRATEGY;

  const pool = await ethers.getContractAt("DeraPool", poolAddress);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", poolConfiguratorAddress);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
  
  // Check and grant permissions if needed
  console.log("\n📋 Checking permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  const isAssetListingAdmin = await aclManager.isAssetListingAdmin(deployer.address);
  const isRiskAdmin = await aclManager.isRiskAdmin(deployer.address);
  console.log("  Pool Admin:", isPoolAdmin);
  console.log("  Asset Listing Admin:", isAssetListingAdmin);
  console.log("  Risk Admin:", isRiskAdmin);
  
  // Grant missing permissions
  if (!isAssetListingAdmin) {
    console.log("\n📍 Granting Asset Listing Admin role...");
    await (await aclManager.addAssetListingAdmin(deployer.address)).wait();
    console.log("✅ Asset Listing Admin granted");
  }
  
  if (!isRiskAdmin) {
    console.log("📍 Granting Risk Admin role...");
    await (await aclManager.addRiskAdmin(deployer.address)).wait();
    console.log("✅ Risk Admin granted");
  }
  
  // Initialize PoolConfigurator if needed
  console.log("\n📍 Checking PoolConfigurator initialization...");
  try {
    const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
    const configFromProvider = await provider.getPoolConfigurator();
    if (configFromProvider === ethers.ZeroAddress) {
      console.log("Initializing PoolConfigurator...");
      await (await poolConfigurator.initialize(deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER)).wait();
      console.log("✅ PoolConfigurator initialized");
    } else {
      console.log("✅ PoolConfigurator already initialized");
    }
  } catch (e) {
    console.log("⚠️  Could not check PoolConfigurator initialization:", e.message);
  }

  // ========== INITIALIZE HBAR ==========
  console.log("\n" + "=".repeat(60));
  console.log("INITIALIZING HBAR (Token ID: " + HBAR_TOKEN_ID + ")");
  console.log("=".repeat(60));

  try {
    // Check if already initialized
    const hbarData = await pool.getAssetData(HBAR_ADDRESS);
    if (hbarData.supplyTokenAddress !== ethers.ZeroAddress) {
      console.log("✅ HBAR already initialized");
      console.log("  dToken:", hbarData.supplyTokenAddress);
      console.log("  vToken:", hbarData.borrowTokenAddress);
    } else {
      // Deploy HBAR tokens
      console.log("\n📍 Deploying HBAR dToken...");
      const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
      const hbarDToken = await DToken.deploy(poolAddress, deployer.address);
      await hbarDToken.waitForDeployment();
      const hbarDTokenAddress = await hbarDToken.getAddress();
      console.log("✅ dToken:", hbarDTokenAddress);

      console.log("📍 Deploying HBAR vToken...");
      const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");
      const hbarVToken = await VToken.deploy(poolAddress);
      await hbarVToken.waitForDeployment();
      const hbarVTokenAddress = await hbarVToken.getAddress();
      console.log("✅ vToken:", hbarVTokenAddress);

      // Step 1: Create token proxies via PoolConfigurator
      console.log("\n📍 Creating HBAR token proxies...");
      const hbarParams = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [8]);
      
      // Use callStatic first to check for errors
      try {
        await poolConfigurator.initAssets.staticCall([{
          underlyingAsset: HBAR_ADDRESS,
          supplyTokenImpl: hbarDTokenAddress,
          variableDebtTokenImpl: hbarVTokenAddress,
          supplyTokenName: "Dera HBAR",
          supplyTokenSymbol: "dHBAR",
          variableDebtTokenName: "Dera Variable Debt HBAR",
          variableDebtTokenSymbol: "vdHBAR",
          params: hbarParams,
          interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
        }], { gasLimit: 15000000 });
      } catch (staticError) {
        console.error("❌ Static call failed:", staticError.message);
        throw staticError;
      }
      
      const hbarInitTx = await poolConfigurator.initAssets([{
        underlyingAsset: HBAR_ADDRESS,
        supplyTokenImpl: hbarDTokenAddress,
        variableDebtTokenImpl: hbarVTokenAddress,
        supplyTokenName: "Dera HBAR",
        supplyTokenSymbol: "dHBAR",
        variableDebtTokenName: "Dera Variable Debt HBAR",
        variableDebtTokenSymbol: "vdHBAR",
        params: hbarParams,
        interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
      }], { gasLimit: 15000000 });
      
      const hbarReceipt = await hbarInitTx.wait();
      console.log("✅ HBAR token proxies created");
      
      // Extract proxy addresses from events
      const hbarProxiesEvent = hbarReceipt.logs.find(log => {
        try {
          const parsed = poolConfigurator.interface.parseLog(log);
          return parsed && parsed.name === "ProxiesInitialized";
        } catch { return false; }
      });
      
      let hbarDTokenProxy, hbarVTokenProxy;
      if (hbarProxiesEvent) {
        const parsed = poolConfigurator.interface.parseLog(hbarProxiesEvent);
        hbarDTokenProxy = parsed.args.dToken;
        hbarVTokenProxy = parsed.args.variableDebtToken;
        console.log("  dToken Proxy:", hbarDTokenProxy);
        console.log("  vToken Proxy:", hbarVTokenProxy);
      }
      
      // Step 2: Finalize by registering in Pool
      if (hbarDTokenProxy && hbarVTokenProxy) {
        console.log("\n📍 Finalizing HBAR registration in Pool...");
        await (await poolConfigurator.finalizeInitAsset(HBAR_ADDRESS, hbarDTokenProxy, hbarVTokenProxy, 8)).wait();
        console.log("✅ HBAR registered in Pool");
      }

      // Configure HBAR
      console.log("\n📍 Configuring HBAR...");
      await (await poolConfigurator.configureAssetAsCollateral(
        HBAR_ADDRESS, 
        7500,  // 75% LTV
        8000,  // 80% liquidation threshold
        10500  // 105% liquidation bonus
      )).wait();
      await (await poolConfigurator.setAssetActive(HBAR_ADDRESS, true)).wait();
      await (await poolConfigurator.setAssetBorrowing(HBAR_ADDRESS, true)).wait();
      console.log("✅ HBAR configured");

      // Save to deployment info
      deploymentInfo.addresses.HBAR_DTOKEN = hbarDTokenAddress;
      deploymentInfo.addresses.HBAR_VTOKEN = hbarVTokenAddress;
      deploymentInfo.features.hbarActive = true;
    }
  } catch (error) {
    console.error("\n❌ HBAR initialization failed:", error.message);
  }

  // ========== INITIALIZE USDC ==========
  console.log("\n" + "=".repeat(60));
  console.log("INITIALIZING USDC (Token ID: " + USDC_TOKEN_ID + ")");
  console.log("=".repeat(60));

  try {
    // Check if already initialized
    const usdcData = await pool.getAssetData(USDC_ADDRESS);
    if (usdcData.supplyTokenAddress !== ethers.ZeroAddress) {
      console.log("✅ USDC already initialized");
      console.log("  dToken:", usdcData.supplyTokenAddress);
      console.log("  vToken:", usdcData.borrowTokenAddress);
    } else {
      // Deploy USDC tokens
      console.log("\n📍 Deploying USDC dToken...");
      const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
      const usdcDToken = await DToken.deploy(poolAddress, deployer.address);
      await usdcDToken.waitForDeployment();
      const usdcDTokenAddress = await usdcDToken.getAddress();
      console.log("✅ dToken:", usdcDTokenAddress);

      console.log("📍 Deploying USDC vToken...");
      const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");
      const usdcVToken = await VToken.deploy(poolAddress);
      await usdcVToken.waitForDeployment();
      const usdcVTokenAddress = await usdcVToken.getAddress();
      console.log("✅ vToken:", usdcVTokenAddress);

      // Step 1: Create token proxies via PoolConfigurator
      console.log("\n📍 Creating USDC token proxies...");
      const usdcParams = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [6]);
      
      // Use callStatic first to check for errors
      try {
        await poolConfigurator.initAssets.staticCall([{
          underlyingAsset: USDC_ADDRESS,
          supplyTokenImpl: usdcDTokenAddress,
          variableDebtTokenImpl: usdcVTokenAddress,
          supplyTokenName: "Dera USDC",
          supplyTokenSymbol: "dUSDC",
          variableDebtTokenName: "Dera Variable Debt USDC",
          variableDebtTokenSymbol: "vdUSDC",
          params: usdcParams,
          interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
        }], { gasLimit: 15000000 });
      } catch (staticError) {
        console.error("❌ Static call failed:", staticError.message);
        throw staticError;
      }
      
      const usdcInitTx = await poolConfigurator.initAssets([{
        underlyingAsset: USDC_ADDRESS,
        supplyTokenImpl: usdcDTokenAddress,
        variableDebtTokenImpl: usdcVTokenAddress,
        supplyTokenName: "Dera USDC",
        supplyTokenSymbol: "dUSDC",
        variableDebtTokenName: "Dera Variable Debt USDC",
        variableDebtTokenSymbol: "vdUSDC",
        params: usdcParams,
        interestRateData: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [rateStrategyAddress])
      }], { gasLimit: 15000000 });
      
      const usdcReceipt = await usdcInitTx.wait();
      console.log("✅ USDC token proxies created");
      
      // Extract proxy addresses from events
      const usdcProxiesEvent = usdcReceipt.logs.find(log => {
        try {
          const parsed = poolConfigurator.interface.parseLog(log);
          return parsed && parsed.name === "ProxiesInitialized";
        } catch { return false; }
      });
      
      let usdcDTokenProxy, usdcVTokenProxy;
      if (usdcProxiesEvent) {
        const parsed = poolConfigurator.interface.parseLog(usdcProxiesEvent);
        usdcDTokenProxy = parsed.args.dToken;
        usdcVTokenProxy = parsed.args.variableDebtToken;
        console.log("  dToken Proxy:", usdcDTokenProxy);
        console.log("  vToken Proxy:", usdcVTokenProxy);
      }
      
      // Step 2: Finalize by registering in Pool
      if (usdcDTokenProxy && usdcVTokenProxy) {
        console.log("\n📍 Finalizing USDC registration in Pool...");
        await (await poolConfigurator.finalizeInitAsset(USDC_ADDRESS, usdcDTokenProxy, usdcVTokenProxy, 6)).wait();
        console.log("✅ USDC registered in Pool");
      }

      // Configure USDC
      console.log("\n📍 Configuring USDC...");
      await (await poolConfigurator.configureAssetAsCollateral(
        USDC_ADDRESS,
        8000,  // 80% LTV
        8500,  // 85% liquidation threshold
        10500  // 105% liquidation bonus
      )).wait();
      await (await poolConfigurator.setAssetActive(USDC_ADDRESS, true)).wait();
      await (await poolConfigurator.setAssetBorrowing(USDC_ADDRESS, true)).wait();
      console.log("✅ USDC configured");

      // Save to deployment info
      deploymentInfo.addresses.USDC_DTOKEN = usdcDTokenAddress;
      deploymentInfo.addresses.USDC_VTOKEN = usdcVTokenAddress;
      deploymentInfo.features.usdcActive = true;
    }
  } catch (error) {
    console.error("\n❌ USDC initialization failed:", error.message);
  }

  // Save deployment info
  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 deployment-info.json updated");

  // Verify assets
  console.log("\n" + "=".repeat(60));
  console.log("VERIFICATION");
  console.log("=".repeat(60));
  
  const assetsList = await pool.getAssetsList();
  console.log("\nAssets in pool:", assetsList.length);
  for (const asset of assetsList) {
    const data = await pool.getAssetData(asset);
    const tokenId = asset === ethers.ZeroAddress ? HBAR_TOKEN_ID : USDC_TOKEN_ID;
    console.log(`\n  ${asset === ethers.ZeroAddress ? 'HBAR' : 'USDC'} (${tokenId}):`);
    console.log(`    Address: ${asset}`);
    console.log(`    dToken: ${data.supplyTokenAddress}`);
    console.log(`    vToken: ${data.borrowTokenAddress}`);
  }

  console.log("\n🎉 Asset initialization complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
