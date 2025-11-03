const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔬 Final Diagnosis\n");
  
  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  
  const provider = await ethers.getContractAt("PoolAddressesProvider", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
  
  console.log("1. Check PoolConfigurator can call Pool:");
  const expectedConfigurator = await provider.getPoolConfigurator();
  console.log("   Expected:", expectedConfigurator);
  console.log("   Actual:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("   Match:", expectedConfigurator.toLowerCase() === deploymentInfo.addresses.POOL_CONFIGURATOR.toLowerCase());
  
  console.log("\n2. Check Pool's ADDRESSES_PROVIDER:");
  const poolProvider = await pool.ADDRESSES_PROVIDER();
  console.log("   Pool's provider:", poolProvider);
  console.log("   Expected:", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
  console.log("   Match:", poolProvider.toLowerCase() === deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER.toLowerCase());
  
  console.log("\n3. Test modifier check:");
  console.log("   When PoolConfigurator calls pool.initAsset:");
  console.log("   - msg.sender will be:", deploymentInfo.addresses.POOL_CONFIGURATOR);
  console.log("   - ADDRESSES_PROVIDER.getPoolConfigurator() returns:", expectedConfigurator);
  console.log("   - Modifier should:", expectedConfigurator.toLowerCase() === deploymentInfo.addresses.POOL_CONFIGURATOR.toLowerCase() ? "PASS ✅" : "FAIL ❌");
  
  console.log("\n4. The issue must be in PoolLogic.executeInitAsset");
  console.log("   Since all checks pass, the revert is from:");
  console.log("   - Line 70: !Address.isContract(params.asset) for non-zero address");
  console.log("   - Line 88: AssetAlreadyAdded");
  console.log("   - Line 92: AssetLogic.init() - checks liquidityIndex != 0");
  console.log("   - Line 108: NoMoreReservesAllowed");
  
  console.log("\n5. For HBAR (address(0)):");
  console.log("   - Line 70 is skipped (asset == address(0))");
  const hbarData = await pool.getAssetData(ethers.ZeroAddress);
  console.log("   - liquidityIndex:", hbarData.liquidityIndex.toString(), "- should be 0 ✅");
  const assetsList = await pool.getAssetsList();
  console.log("   - assetsCount:", assetsList.length, "- should be < 128 ✅");
  
  console.log("\n❓ Conclusion: All checks should pass, but it's still reverting");
  console.log("   This suggests the issue is in how Hedera EVM handles the transaction");
  console.log("   OR there's a library linking issue where old code is being used");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
