const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Complete Dera Protocol to Hedera Testnet\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "HBAR\n");

  if (balance < ethers.parseEther("50")) {
    console.warn("⚠️  Low balance. You need at least 50 HBAR for deployment");
  }

  const addresses = {};
  const deploymentLog = [];

  try {
    // 1. Deploy PoolAddressesProvider
    console.log("📍 1/8 Deploying PoolAddressesProvider...");
    const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
    const addressesProvider = await PoolAddressesProvider.deploy("DERA_MARKET", deployer.address);
    await addressesProvider.waitForDeployment();
    addresses.POOL_ADDRESSES_PROVIDER = await addressesProvider.getAddress();
    deploymentLog.push(`PoolAddressesProvider: ${addresses.POOL_ADDRESSES_PROVIDER}`);
    console.log("✅ PoolAddressesProvider:", addresses.POOL_ADDRESSES_PROVIDER);

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
    const oracle = await DeraOracle.deploy();
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
      addresses.POOL_ADDRESSES_PROVIDER,
      ethers.parseUnits("0.8", 27), // 80% optimal utilization
      ethers.parseUnits("0", 27),   // 0% base rate
      ethers.parseUnits("0.04", 27), // 4% slope 1
      ethers.parseUnits("1.0", 27)   // 100% slope 2
    );
    await rateStrategy.waitForDeployment();
    addresses.RATE_STRATEGY = await rateStrategy.getAddress();
    deploymentLog.push(`RateStrategy: ${addresses.RATE_STRATEGY}`);
    console.log("✅ Rate Strategy:", addresses.RATE_STRATEGY);

    // 5. Deploy Pool
    console.log("📍 5/8 Deploying Pool...");
    const Pool = await ethers.getContractFactory("Pool");
    const pool = await Pool.deploy(addresses.POOL_ADDRESSES_PROVIDER);
    await pool.waitForDeployment();
    addresses.POOL = await pool.getAddress();
    deploymentLog.push(`Pool: ${addresses.POOL}`);
    console.log("✅ Pool:", addresses.POOL);

    // Initialize Pool
    await pool.initialize(addresses.POOL_ADDRESSES_PROVIDER);
    await addressesProvider.setPool(addresses.POOL);

    // 6. Deploy PoolConfigurator
    console.log("📍 6/8 Deploying PoolConfigurator...");
    const PoolConfigurator = await ethers.getContractFactory("PoolConfigurator");
    const poolConfigurator = await PoolConfigurator.deploy();
    await poolConfigurator.waitForDeployment();
    addresses.POOL_CONFIGURATOR = await poolConfigurator.getAddress();
    deploymentLog.push(`PoolConfigurator: ${addresses.POOL_CONFIGURATOR}`);
    console.log("✅ PoolConfigurator:", addresses.POOL_CONFIGURATOR);

    await addressesProvider.setPoolConfigurator(addresses.POOL_CONFIGURATOR);

    // 7. Deploy Multi-Asset Staking
    console.log("📍 7/8 Deploying Multi-Asset Staking...");
    const MultiAssetStaking = await ethers.getContractFactory("DeraMultiAssetStaking");
    const staking = await MultiAssetStaking.deploy(
      addresses.POOL,
      deployer.address,
      process.env.REWARD_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000"
    );
    await staking.waitForDeployment();
    addresses.MULTI_ASSET_STAKING = await staking.getAddress();
    deploymentLog.push(`MultiAssetStaking: ${addresses.MULTI_ASSET_STAKING}`);
    console.log("✅ Multi-Asset Staking:", addresses.MULTI_ASSET_STAKING);

    // 8. Deploy Analytics (Optional)
    console.log("📍 8/8 Deploying Analytics...");
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
      deploymentLog
    };

    fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));

    // Update frontend .env.local
    const envPath = path.join(__dirname, "../../frontend/.env.local");
    let envContent = fs.readFileSync(envPath, "utf8");
    
    envContent = envContent.replace(/NEXT_PUBLIC_POOL_ADDRESS=.*/, `NEXT_PUBLIC_POOL_ADDRESS=${addresses.POOL}`);
    envContent = envContent.replace(/NEXT_PUBLIC_ORACLE_ADDRESS=.*/, `NEXT_PUBLIC_ORACLE_ADDRESS=${addresses.ORACLE}`);
    envContent = envContent.replace(/NEXT_PUBLIC_ANALYTICS_ADDRESS=.*/, `NEXT_PUBLIC_ANALYTICS_ADDRESS=${addresses.ANALYTICS}`);
    envContent = envContent.replace(/NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=.*/, `NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=${addresses.MULTI_ASSET_STAKING}`);
    
    fs.writeFileSync(envPath, envContent);

    console.log("\n🎉 Deployment Complete!");
    console.log("\n📋 Contract Addresses:");
    Object.entries(addresses).forEach(([name, address]) => {
      console.log(`   ${name}: ${address}`);
    });

    console.log("\n📄 Files Updated:");
    console.log("   - deployment-info.json");
    console.log("   - frontend/.env.local");

    console.log("\n🔗 View on HashScan:");
    console.log(`   Pool: https://hashscan.io/testnet/contract/${addresses.POOL}`);
    console.log(`   Oracle: https://hashscan.io/testnet/contract/${addresses.ORACLE}`);

    console.log("\n🚀 Next Steps:");
    console.log("   1. cd ../frontend && npm install");
    console.log("   2. npm run dev");
    console.log("   3. Open http://localhost:3000");

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