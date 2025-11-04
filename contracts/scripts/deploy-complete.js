const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Retry wrapper for network operations
 * Handles transient RPC errors (502, 503, timeouts, etc.)
 */
async function retryOperation(operation, operationName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isNetworkError =
        error.message.includes("502") ||
        error.message.includes("503") ||
        error.message.includes("504") ||
        error.message.includes("timeout") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNRESET");

      if (isNetworkError && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`⚠️  Network error during ${operationName} (attempt ${attempt}/${maxRetries})`);
        console.log(`   Retrying in ${waitTime/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}

async function main() {
  console.log("🚀 Deploying Complete Dera Protocol to Hedera Testnet\n");
  console.log("⚠️  FRESH DEPLOYMENT - All contracts will be deployed from scratch\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR\n");

  if (balance < ethers.parseEther("50")) {
    console.warn("⚠️  Low balance. You need at least 50 HBAR for deployment");
  }

  // CRITICAL: Always start with empty addresses object - NEVER reuse old deployments
  let addresses = {};
  let deploymentLog = [];

  // Clean up any partial deployment files to ensure fresh start
  console.log("🧹 Cleanup check...");
  const filesToCheck = [
    "./deployment-partial.json",
    "./deployment-info.json",
    "./.openzeppelin"
  ];

  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      if (fs.statSync(file).isDirectory()) {
        fs.rmSync(file, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file);
      }
      console.log(`  - Removed ${file}`);
    }
  });
  console.log("✅ Cleanup complete - Starting fresh deployment\n");

  try {
    // 1. Deploy PoolAddressesProvider
    console.log("📍 1/8 Deploying PoolAddressesProvider...");
    const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
    const addressesProvider = await PoolAddressesProvider.deploy("DERA_MARKET", deployer.address);
    await addressesProvider.waitForDeployment();
    addresses.POOL_ADDRESSES_PROVIDER = await addressesProvider.getAddress();
    deploymentLog.push(`PoolAddressesProvider: ${addresses.POOL_ADDRESSES_PROVIDER}`);
    console.log("✅ PoolAddressesProvider:", addresses.POOL_ADDRESSES_PROVIDER);

    // Set ACL Admin first
    await addressesProvider.setACLAdmin(deployer.address);

    // 2. Deploy ACLManager
    console.log("📍 2/8 Deploying ACLManager...");
    const ACLManager = await ethers.getContractFactory("ACLManager");
    const aclManager = await ACLManager.deploy(addresses.POOL_ADDRESSES_PROVIDER);
    await aclManager.waitForDeployment();
    addresses.ACL_MANAGER = await aclManager.getAddress();
    deploymentLog.push(`ACLManager: ${addresses.ACL_MANAGER}`);
    console.log("✅ ACLManager:", addresses.ACL_MANAGER);

    // Set ACLManager in provider
    await addressesProvider.setACLManager(addresses.ACL_MANAGER);

    // 3. Deploy Oracle
    console.log("📍 3/8 Deploying DeraOracle...");
    const DeraOracle = await ethers.getContractFactory("DeraOracle");
    // Use a placeholder address for Pyth contract (can be updated later)
    const pythAddress = process.env.PYTH_CONTRACT_ADDRESS || "0x0708325268dF9F66270F1401206434524814508b";
    const oracle = await DeraOracle.deploy(pythAddress);
    await oracle.waitForDeployment();
    addresses.ORACLE = await oracle.getAddress();
    deploymentLog.push(`Oracle: ${addresses.ORACLE}`);
    console.log("✅ Oracle:", addresses.ORACLE);

    // Set Oracle in provider
    await addressesProvider.setPriceOracle(addresses.ORACLE);

    // 4. Deploy Interest Rate Strategy
    console.log("📍 4/8 Deploying Interest Rate Strategy...");
    const InterestRateStrategy = await ethers.getContractFactory("DefaultReserveInterestRateStrategy");
    const rateStrategy = await InterestRateStrategy.deploy(
      BigInt("800000000000000000000000000"), // 80% optimal utilization (0.8 * 10^27)
      BigInt("0"),                            // 0% base rate
      BigInt("40000000000000000000000000"),  // 4% slope 1 (0.04 * 10^27)
      BigInt("1000000000000000000000000000") // 100% slope 2 (1.0 * 10^27)
    );
    await rateStrategy.waitForDeployment();
    addresses.RATE_STRATEGY = await rateStrategy.getAddress();
    deploymentLog.push(`RateStrategy: ${addresses.RATE_STRATEGY}`);
    console.log("✅ Rate Strategy:", addresses.RATE_STRATEGY);

    // 5. Deploy Libraries
    console.log("📍 5/8 Deploying Libraries...");
    
    const SupplyLogic = await ethers.getContractFactory("SupplyLogic");
    const supplyLogic = await SupplyLogic.deploy();
    await supplyLogic.waitForDeployment();
    const supplyLogicAddress = await supplyLogic.getAddress();
    
    const BorrowLogic = await ethers.getContractFactory("BorrowLogic");
    const borrowLogic = await BorrowLogic.deploy();
    await borrowLogic.waitForDeployment();
    const borrowLogicAddress = await borrowLogic.getAddress();
    
    const LiquidationLogic = await ethers.getContractFactory("LiquidationLogic");
    const liquidationLogic = await LiquidationLogic.deploy();
    await liquidationLogic.waitForDeployment();
    const liquidationLogicAddress = await liquidationLogic.getAddress();
    
    const PoolLogic = await ethers.getContractFactory("PoolLogic");
    const poolLogic = await PoolLogic.deploy();
    await poolLogic.waitForDeployment();
    const poolLogicAddress = await poolLogic.getAddress();
    
    const ConfiguratorLogic = await ethers.getContractFactory("ConfiguratorLogic");
    const configuratorLogic = await ConfiguratorLogic.deploy();
    await configuratorLogic.waitForDeployment();
    const configuratorLogicAddress = await configuratorLogic.getAddress();
    
    console.log("✅ Libraries deployed");
    
    // 6. Deploy Pool with linked libraries
    console.log("📍 6/8 Deploying Pool...");
    const Pool = await ethers.getContractFactory("DeraPool", {
      libraries: {
        SupplyLogic: supplyLogicAddress,
        BorrowLogic: borrowLogicAddress,
        LiquidationLogic: liquidationLogicAddress,
        PoolLogic: poolLogicAddress
      }
    });
    const pool = await Pool.deploy(addresses.POOL_ADDRESSES_PROVIDER, addresses.RATE_STRATEGY);
    await pool.waitForDeployment();
    addresses.POOL = await pool.getAddress();
    deploymentLog.push(`Pool: ${addresses.POOL}`);
    console.log("✅ Pool:", addresses.POOL);

    // 7. Deploy PoolConfigurator first (before Pool initialization)
    console.log("📍 7/8 Deploying PoolConfigurator...");
    const PoolConfigurator = await ethers.getContractFactory("DeraPoolConfigurator", {
      libraries: {
        ConfiguratorLogic: configuratorLogicAddress
      }
    });
    const poolConfigurator = await PoolConfigurator.deploy();
    await poolConfigurator.waitForDeployment();
    addresses.POOL_CONFIGURATOR = await poolConfigurator.getAddress();
    deploymentLog.push(`PoolConfigurator: ${addresses.POOL_CONFIGURATOR}`);
    console.log("✅ PoolConfigurator:", addresses.POOL_CONFIGURATOR);

    // Grant necessary roles to deployer BEFORE initializing
    await aclManager.addPoolAdmin(deployer.address);
    await aclManager.addAssetListingAdmin(deployer.address);
    await aclManager.addRiskAdmin(deployer.address);
    await aclManager.addEmergencyAdmin(deployer.address);
    console.log("✓ Admin roles granted to deployer");

    // Set PoolConfigurator in provider first
    await addressesProvider.setPoolConfiguratorImpl(addresses.POOL_CONFIGURATOR);

    // Initialize Pool (this is guaranteed fresh since we clean everything)
    // BUT: Hedera might reuse contract addresses, so we need error handling
    try {
      await pool.initialize(addresses.POOL_ADDRESSES_PROVIDER);
      await addressesProvider.setPoolImpl(addresses.POOL);
      console.log("✓ Pool initialized");
    } catch (e) {
      if (e.message.includes("already been initialized")) {
        console.log("⚠️  Pool at this address was already initialized (Hedera address reuse)");
        await addressesProvider.setPoolImpl(addresses.POOL);
        console.log("   Registered Pool in AddressesProvider anyway");
      } else {
        throw e;
      }
    }

    // Initialize PoolConfigurator (CRITICAL - must be done after Pool is registered)
    // Same issue: Hedera might reuse the contract address from previous deployment
    try {
      await poolConfigurator.initialize(addresses.POOL_ADDRESSES_PROVIDER);
      console.log("✓ PoolConfigurator initialized");
    } catch (e) {
      if (e.message.includes("already been initialized")) {
        console.log("⚠️  PoolConfigurator at this address was already initialized (Hedera address reuse)");
        console.log("   This is OK - PoolConfigurator will use its existing initialization");
        console.log("   NOTE: The Pool address it points to might be from a previous deployment!");
        console.log("   If asset initialization fails, you may need to:");
        console.log("   1. Use a different deployer account, OR");
        console.log("   2. Wait a few minutes for Hedera state to settle");
      } else {
        throw e;
      }
    }

    // 8. Deploy Multi-Asset Staking
    console.log("📍 8/8 Deploying Multi-Asset Staking...");
    const MultiAssetStaking = await ethers.getContractFactory("DeraMultiAssetStaking");
    const staking = await MultiAssetStaking.deploy(
      process.env.REWARD_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000"
    );
    await staking.waitForDeployment();
    addresses.MULTI_ASSET_STAKING = await staking.getAddress();
    deploymentLog.push(`MultiAssetStaking: ${addresses.MULTI_ASSET_STAKING}`);
    console.log("✅ Multi-Asset Staking:", addresses.MULTI_ASSET_STAKING);

    // 9. Deploy Analytics (Optional)
    console.log("📍 9/9 Deploying Analytics...");
    const Analytics = await ethers.getContractFactory("DeraMirrorNodeAnalytics");
    const analytics = await Analytics.deploy(addresses.POOL, deployer.address);
    await analytics.waitForDeployment();
    addresses.ANALYTICS = await analytics.getAddress();
    deploymentLog.push(`Analytics: ${addresses.ANALYTICS}`);
    console.log("✅ Analytics:", addresses.ANALYTICS);

    // Save deployment info
    const deploymentInfo = {
      network: "testnet",
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      addresses,
      deploymentLog,
      features: {
        nativeHBARSupport: true,
        hbarDecimals: 8,
        hbarActive: addresses.NATIVE_HBAR_ACTIVE || false,
        multiAssetStaking: true,
        hcsIntegration: true
      }
    };

    fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));

    // Update contracts/.env
    const contractsEnvPath = path.join(__dirname, "../.env");
    let contractsEnvContent = fs.readFileSync(contractsEnvPath, "utf8");
    
    contractsEnvContent = contractsEnvContent.replace(/POOL_ADDRESSES_PROVIDER=.*/, `POOL_ADDRESSES_PROVIDER=${addresses.POOL_ADDRESSES_PROVIDER}`);
    contractsEnvContent = contractsEnvContent.replace(/POOL_ADDRESS=.*/, `POOL_ADDRESS=${addresses.POOL}`);
    contractsEnvContent = contractsEnvContent.replace(/POOL_CONFIGURATOR=.*/, `POOL_CONFIGURATOR=${addresses.POOL_CONFIGURATOR}`);
    contractsEnvContent = contractsEnvContent.replace(/ORACLE_ADDRESS=.*/, `ORACLE_ADDRESS=${addresses.ORACLE}`);
    contractsEnvContent = contractsEnvContent.replace(/NODE_STAKING_CONTRACT_ADDRESS=.*/, `NODE_STAKING_CONTRACT_ADDRESS=${addresses.MULTI_ASSET_STAKING}`);
    
    fs.writeFileSync(contractsEnvPath, contractsEnvContent);

    // Update frontend .env.local
    const envPath = path.join(__dirname, "../../frontend/.env.local");
    const frontendEnv = `# Auto-generated by deployment script
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_POOL_ADDRESS=${addresses.POOL}
NEXT_PUBLIC_ORACLE_ADDRESS=${addresses.ORACLE}
NEXT_PUBLIC_ANALYTICS_ADDRESS=${addresses.ANALYTICS}
NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=${addresses.MULTI_ASSET_STAKING}
NEXT_PUBLIC_NODE_STAKING_ADDRESS=${addresses.MULTI_ASSET_STAKING}
NEXT_PUBLIC_POOL_CONFIGURATOR=${addresses.POOL_CONFIGURATOR}
NEXT_PUBLIC_RATE_STRATEGY=${addresses.RATE_STRATEGY}
NEXT_PUBLIC_ACL_MANAGER=${addresses.ACL_MANAGER}
NEXT_PUBLIC_PROVIDER=${addresses.POOL_ADDRESSES_PROVIDER}
# Native HBAR support
NEXT_PUBLIC_NATIVE_HBAR_ENABLED=true
NEXT_PUBLIC_HBAR_DECIMALS=8
NEXT_PUBLIC_HBAR_ACTIVE=${addresses.NATIVE_HBAR_ACTIVE || false}
`;
    
    fs.writeFileSync(envPath, frontendEnv);

    // Update root .env
    const rootEnvPath = path.join(__dirname, "../../.env");
    let rootEnvContent = fs.readFileSync(rootEnvPath, "utf8");
    
    rootEnvContent = rootEnvContent.replace(/POOL_ADDRESSES_PROVIDER=.*/, `POOL_ADDRESSES_PROVIDER=${addresses.POOL_ADDRESSES_PROVIDER}`);
    rootEnvContent = rootEnvContent.replace(/POOL_ADDRESS=.*/, `POOL_ADDRESS=${addresses.POOL}`);
    rootEnvContent = rootEnvContent.replace(/ORACLE_ADDRESS=.*/, `ORACLE_ADDRESS=${addresses.ORACLE}`);
    rootEnvContent = rootEnvContent.replace(/ANALYTICS_CONTRACT_ADDRESS=.*/, `ANALYTICS_CONTRACT_ADDRESS=${addresses.ANALYTICS}`);
    rootEnvContent = rootEnvContent.replace(/NODE_STAKING_CONTRACT_ADDRESS=.*/, `NODE_STAKING_CONTRACT_ADDRESS=${addresses.MULTI_ASSET_STAKING}`);
    
    fs.writeFileSync(rootEnvPath, rootEnvContent);

    // 10. Activate Native HBAR
    console.log("\n📍 10/10 Activating Native HBAR...");
    try {
      // Check if HBAR asset exists
      const assetData = await pool.getAssetData(ethers.ZeroAddress);
      console.log("HBAR dToken:", assetData.supplyTokenAddress);
      
      if (assetData.supplyTokenAddress !== ethers.ZeroAddress) {
        // Add HBAR to assets list
        const assetsList = await pool.getAssetsList();
        if (!assetsList.includes(ethers.ZeroAddress)) {
          console.log("Adding HBAR to assets list...");
          const initTx = await pool.initAsset(
            ethers.ZeroAddress,
            assetData.supplyTokenAddress,
            assetData.borrowTokenAddress
          );
          await initTx.wait();
          console.log("✅ HBAR added to assets list");
        }

        // Activate HBAR configuration
        if (assetData.configuration.toString() === "0") {
          console.log("Activating HBAR configuration...");
          const config = {
            data: ethers.toBigInt("0x" + 
              "1" +           // Active
              "0" +           // Not frozen
              "1" +           // Borrowing enabled
              "0" +           // Stable borrowing disabled
              "0000" +        // Reserved
              "1D4C" +        // LTV = 7500 (75%)
              "1F40" +        // Liquidation threshold = 8000 (80%)
              "290C" +        // Liquidation bonus = 10500 (105%)
              "08" +          // Decimals = 8
              "03E8"          // Reserve factor = 1000 (10%)
            )
          };
          const configTx = await pool.setConfiguration(ethers.ZeroAddress, config);
          await configTx.wait();
          console.log("✅ HBAR configuration activated");
        }
        
        // Verify HBAR is now active
        const finalAssetData = await pool.getAssetData(ethers.ZeroAddress);
        const finalAssetsList = await pool.getAssetsList();
        
        if (finalAssetData.configuration.toString() !== "0" && finalAssetsList.includes(ethers.ZeroAddress)) {
          console.log("🎉 Native HBAR is now ACTIVE and VISIBLE to users!");
          addresses.NATIVE_HBAR_ACTIVE = true;
        }
      }
    } catch (err) {
      console.log("⚠️ HBAR activation failed:", err.message);
      addresses.NATIVE_HBAR_ACTIVE = false;
    }

    console.log("\n🎉 Deployment Complete!");
    console.log("\n📋 Contract Addresses:");
    Object.entries(addresses).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });

    console.log("\n📄 Files Updated:");
    console.log("   - deployment-info.json");
    console.log("   - contracts/.env");
    console.log("   - frontend/.env.local");
    console.log("   - .env (root)");

    console.log("\n🔗 View on HashScan:");
    console.log(`   Pool: https://hashscan.io/testnet/contract/${addresses.POOL}`);
    console.log(`   Oracle: https://hashscan.io/testnet/contract/${addresses.ORACLE}`);

    console.log("\n🚀 Next Steps:");
    console.log("   1. cd ../frontend && npm install");
    console.log("   2. npm run dev");
    console.log("   3. Open http://localhost:3000");
    console.log("   4. Test HBAR supply: npx hardhat run scripts/test-hbar-deposit.js --network testnet");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    // Save partial deployment info
    if (Object.keys(addresses).length > 0) {
      fs.writeFileSync("./deployment-partial.json", JSON.stringify({
        error: error.message,
        addresses,
        deploymentLog
      }, null, 2));
      console.log("📄 Partial deployment saved to deployment-partial.json");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });