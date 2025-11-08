const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking PoolConfigurator State\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  console.log("Expected addresses:");
  console.log("  Pool:", deploymentInfo.addresses.POOL);
  console.log("  PoolConfigurator:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("");

  // Check what the PoolConfigurator thinks the Pool address is
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);

  try {
    // Try to read the internal _pool variable via a view function
    // Since _pool is internal, we need to check via provider
    const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);

    const poolFromProvider = await provider.getPool();
    const configuratorFromProvider = await provider.getPoolConfigurator();

    console.log("AddressesProvider state:");
    console.log("  Pool from provider:", poolFromProvider);
    console.log("  Configurator from provider:", configuratorFromProvider);
    console.log("");

    console.log("Verification:");
    console.log("  ✓ Pool matches:", poolFromProvider === deploymentInfo.addresses.POOL);
    console.log("  ✓ Configurator matches:", configuratorFromProvider === deploymentInfo.addresses.POOL_CONFIGURATOR);

    if (poolFromProvider !== deploymentInfo.addresses.POOL) {
      console.log("\n❌ MISMATCH DETECTED!");
      console.log("   Provider has wrong Pool address");
      console.log("   Run: await addressesProvider.setPoolImpl(correctPoolAddress)");
    }

    if (configuratorFromProvider !== deploymentInfo.addresses.POOL_CONFIGURATOR) {
      console.log("\n❌ MISMATCH DETECTED!");
      console.log("   Provider has wrong PoolConfigurator address");
      console.log("   Run: await addressesProvider.setPoolConfiguratorImpl(correctConfiguratorAddress)");
    }

    // Try to call a Pool function via PoolConfigurator to see if it works
    console.log("\n🧪 Testing PoolConfigurator -> Pool connection...");

    const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
    const assetsCount = await pool.getAssetsCount();
    console.log("  Current assets count:", assetsCount.toString());

    // Check if the deployer is a Pool Admin
    const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);
    const [deployer] = await ethers.getSigners();
    const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
    const isConfiguratorPoolAdmin = await aclManager.isPoolAdmin(deploymentInfo.addresses.POOL_CONFIGURATOR);

    console.log("\n🔐 Access Control:");
    console.log("  Deployer is Pool Admin:", isPoolAdmin);
    console.log("  PoolConfigurator is Pool Admin:", isConfiguratorPoolAdmin);

  } catch (e) {
    console.log("❌ Error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
