const deployPool = require("./deploy-pool");
const deployOracle = require("./deploy-oracle");
const deployStaking = require("./deploy-staking");

async function main() {
  console.log("🚀 Starting Full Dera Protocol Deployment...\n");

  const addresses = {};

  try {
    // Deploy Pool
    console.log("1️⃣ Deploying Pool Contract...");
    addresses.pool = await deployPool();
    console.log("✅ Pool deployed\n");

    // Deploy Oracle
    console.log("2️⃣ Deploying Oracle Contract...");
    addresses.oracle = await deployOracle();
    console.log("✅ Oracle deployed\n");

    // Deploy Staking
    console.log("3️⃣ Deploying Multi-Asset Staking...");
    addresses.staking = await deployStaking();
    console.log("✅ Staking deployed\n");

    console.log("🎉 All contracts deployed successfully!");
    console.log("\n📋 Contract Addresses:");
    console.log(`Pool: ${addresses.pool}`);
    console.log(`Oracle: ${addresses.oracle}`);
    console.log(`Staking: ${addresses.staking}`);

    console.log("\n📝 Add these to your .env.local:");
    console.log(`NEXT_PUBLIC_POOL_ADDRESS=${addresses.pool}`);
    console.log(`NEXT_PUBLIC_ORACLE_ADDRESS=${addresses.oracle}`);
    console.log(`NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS=${addresses.staking}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });