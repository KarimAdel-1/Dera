const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * Comprehensive deployment verification script
 * Checks all deployed contracts and their configurations
 */

function tokenIdToAddress(tokenId) {
  if (tokenId === "0.0.0") return ethers.ZeroAddress;
  const parts = tokenId.split('.');
  return '0x' + parseInt(parts[2]).toString(16).padStart(40, '0');
}

async function main() {
  console.log("🔍 Comprehensive Deployment Verification\n");

  // Load deployment info
  const deploymentInfoPath = "./deployment-info.json";
  if (!fs.existsSync(deploymentInfoPath)) {
    console.error("❌ deployment-info.json not found!");
    console.error("   Run deployment first: npm run deploy:hackathon");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
  console.log("📄 Loaded deployment info from:", deploymentInfoPath);
  console.log("");

  // 1. Verify all contracts are deployed
  console.log("=" .repeat(60));
  console.log("1️⃣  CONTRACT DEPLOYMENT STATUS");
  console.log("=" .repeat(60));

  const contracts = [
    { name: "Pool", address: deploymentInfo.addresses.POOL },
    { name: "PoolConfigurator", address: deploymentInfo.addresses.POOL_CONFIGURATOR },
    { name: "PoolAddressesProvider", address: deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER },
    { name: "ACLManager", address: deploymentInfo.addresses.ACL_MANAGER },
    { name: "Oracle", address: deploymentInfo.addresses.ORACLE },
    { name: "RateStrategy", address: deploymentInfo.addresses.RATE_STRATEGY },
    { name: "MultiAssetStaking", address: deploymentInfo.addresses.MULTI_ASSET_STAKING },
    { name: "Analytics", address: deploymentInfo.addresses.ANALYTICS }
  ];

  for (const contract of contracts) {
    try {
      const provider = ethers.provider;
      const code = await provider.getCode(contract.address);
      const isDeployed = code !== "0x";
      console.log(`${isDeployed ? "✅" : "❌"} ${contract.name.padEnd(25)} ${contract.address}`);
    } catch (error) {
      console.log(`❌ ${contract.name.padEnd(25)} ${contract.address} (Error: ${error.message})`);
    }
  }

  // 2. Verify Pool configuration
  console.log("\n" + "=" .repeat(60));
  console.log("2️⃣  POOL CONFIGURATION");
  console.log("=" .repeat(60));

  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const addressesProvider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);

  try {
    // Check Pool's immutable ADDRESSES_PROVIDER
    const poolAddressesProvider = await pool.ADDRESSES_PROVIDER();
    console.log("Pool's ADDRESSES_PROVIDER:   ", poolAddressesProvider);
    console.log("Expected:                    ", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
    console.log("Match:", poolAddressesProvider === deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER ? "✅" : "❌");

    // Check AddressesProvider's Pool
    const poolFromProvider = await addressesProvider.getPool();
    console.log("\nAddressesProvider's Pool:    ", poolFromProvider);
    console.log("Expected:                    ", deploymentInfo.addresses.POOL);
    console.log("Match:", poolFromProvider === deploymentInfo.addresses.POOL ? "✅" : "❌");

    // Check PoolConfigurator
    const configuratorFromProvider = await addressesProvider.getPoolConfigurator();
    console.log("\nAddressesProvider's Configurator:", configuratorFromProvider);
    console.log("Expected:                        ", deploymentInfo.addresses.POOL_CONFIGURATOR);
    console.log("Match:", configuratorFromProvider === deploymentInfo.addresses.POOL_CONFIGURATOR ? "✅" : "❌");
  } catch (error) {
    console.error("❌ Error checking Pool configuration:", error.message);
  }

  // 3. Verify registered assets
  console.log("\n" + "=" .repeat(60));
  console.log("3️⃣  REGISTERED ASSETS");
  console.log("=" .repeat(60));

  try {
    const assetsList = await pool.getAssetsList();
    console.log(`Total assets registered: ${assetsList.length}\n`);

    if (assetsList.length === 0) {
      console.log("⚠️  No assets registered yet!");
      console.log("   Run: npm run init:assets");
    } else {
      for (let i = 0; i < assetsList.length; i++) {
        const asset = assetsList[i];
        console.log(`Asset ${i + 1}: ${asset}`);

        try {
          const assetData = await pool.getAssetData(asset);
          console.log("  Supply Token:     ", assetData.supplyTokenAddress);
          console.log("  Borrow Token:     ", assetData.borrowTokenAddress);
          console.log("  Liquidity Index:  ", assetData.liquidityIndex.toString());
          console.log("  ID:               ", assetData.id.toString());

          const config = await pool.getConfiguration(asset);
          const isActive = (config.data & 1n) !== 0n;
          const borrowingEnabled = (config.data & (1n << 1n)) !== 0n;

          console.log("  Active:           ", isActive ? "✅ Yes" : "❌ No");
          console.log("  Borrowing:        ", borrowingEnabled ? "✅ Enabled" : "❌ Disabled");

          // Identify asset
          if (asset === ethers.ZeroAddress) {
            console.log("  Type:             ", "🟣 HBAR (Native)");
          } else {
            const USDC_ADDRESS = tokenIdToAddress("0.0.429274");
            if (asset.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
              console.log("  Type:             ", "💵 USDC");
            } else {
              console.log("  Type:             ", "Unknown");
            }
          }
        } catch (error) {
          console.log("  ❌ Error getting asset data:", error.message);
        }
        console.log("");
      }

      // Check specific expected assets
      console.log("Expected Assets Check:");
      const HBAR_ADDRESS = ethers.ZeroAddress;
      const USDC_ADDRESS = tokenIdToAddress("0.0.429274");

      const hbarInList = assetsList.some(a => a.toLowerCase() === HBAR_ADDRESS.toLowerCase());
      const usdcInList = assetsList.some(a => a.toLowerCase() === USDC_ADDRESS.toLowerCase());

      console.log(`  HBAR (${HBAR_ADDRESS}): ${hbarInList ? "✅ Registered" : "❌ Not found"}`);
      console.log(`  USDC (${USDC_ADDRESS}): ${usdcInList ? "✅ Registered" : "❌ Not found"}`);
    }
  } catch (error) {
    console.error("❌ Error checking assets:", error.message);
  }

  // 4. Verify HCS Topics
  console.log("\n" + "=" .repeat(60));
  console.log("4️⃣  HCS TOPICS");
  console.log("=" .repeat(60));

  const topicsPath = "./hcs-topics.json";
  if (fs.existsSync(topicsPath)) {
    const topicsInfo = JSON.parse(fs.readFileSync(topicsPath, "utf8"));
    console.log("Network:", topicsInfo.network);
    console.log("Created:", topicsInfo.created);
    console.log("\nTopics:");
    Object.entries(topicsInfo.topics).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(15)} ${value}`);
      console.log(`    View: https://hashscan.io/testnet/topic/${value}`);
    });
  } else {
    console.log("⚠️  HCS topics not created yet!");
    console.log("   They should be created during deployment");
  }

  // 5. Summary and recommendations
  console.log("\n" + "=" .repeat(60));
  console.log("5️⃣  SUMMARY & RECOMMENDATIONS");
  console.log("=" .repeat(60));

  const assetsCount = await pool.getAssetsList().then(list => list.length);

  console.log("\n✨ Deployment Status:");
  console.log(`   Contracts deployed: ${contracts.length}/8`);
  console.log(`   Assets registered: ${assetsCount}`);

  if (assetsCount === 0) {
    console.log("\n⚠️  Action Required:");
    console.log("   Run asset initialization: npm run init:assets");
  } else if (assetsCount === 1) {
    console.log("\n⚠️  Potential Issue:");
    console.log("   Only 1 asset registered (expected 2: HBAR + USDC)");
    console.log("   Check the asset initialization logs above");
  } else if (assetsCount >= 2) {
    console.log("\n✅ All expected assets are registered!");
  }

  console.log("\n📱 Frontend Setup:");
  console.log("   Make sure frontend/.env.local contains:");
  console.log(`   NEXT_PUBLIC_POOL_ADDRESS=${deploymentInfo.addresses.POOL}`);
  console.log(`   NEXT_PUBLIC_ORACLE_ADDRESS=${deploymentInfo.addresses.ORACLE}`);
  console.log(`   NEXT_PUBLIC_ANALYTICS_ADDRESS=${deploymentInfo.addresses.ANALYTICS}`);

  console.log("\n🚀 Ready to test:");
  console.log("   cd ../frontend && npm run dev");
  console.log("   Open: http://localhost:3000");

  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  });
