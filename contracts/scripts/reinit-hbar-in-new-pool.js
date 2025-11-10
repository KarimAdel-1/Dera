const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔄 Re-initializing HBAR in new Pool\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));

  const OLD_POOL = "0x794567E3F7B5a2f92C871A7F65e6451dC489372E";
  const NEW_POOL = deploymentInfo.addresses.POOL;
  const DHBAR_TOKEN = "0xac263D2538A40f262DE1ef0820c9D6dC496a6618";
  const HBAR_ADDRESS = ethers.ZeroAddress;

  console.log("📍 Contract Addresses:");
  console.log("   Old Pool:", OLD_POOL);
  console.log("   New Pool:", NEW_POOL);
  console.log("   dHBAR Token:", DHBAR_TOKEN);
  console.log("   Deployer:", deployer.address);

  // Get contracts
  const oldPool = await ethers.getContractAt("DeraPool", OLD_POOL);
  const newPool = await ethers.getContractAt("DeraPool", NEW_POOL);
  const aclManager = await ethers.getContractAt("ACLManager", deploymentInfo.addresses.ACL_MANAGER);

  // Check permissions
  console.log("\n📋 Checking Permissions...");
  const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
  console.log("   Pool Admin:", isPoolAdmin ? "✅" : "❌\n");

  if (!isPoolAdmin) {
    console.error("❌ ERROR: Deployer is not a Pool Admin!");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("STEP 1: Get Asset Data from Old Pool");
  console.log("=".repeat(60) + "\n");

  const oldAssetData = await oldPool.getAssetData(HBAR_ADDRESS);
  console.log("📊 Old Pool HBAR Data:");
  console.log("   Supply Token:", oldAssetData.supplyTokenAddress);
  console.log("   Borrow Token:", oldAssetData.borrowTokenAddress);
  console.log("   Liquidity Index:", oldAssetData.liquidityIndex.toString());
  console.log("   Asset ID:", oldAssetData.id);

  const oldConfig = await oldPool.getConfiguration(HBAR_ADDRESS);
  console.log("\n📊 Old Configuration:");
  console.log("   Config Data:", "0x" + oldConfig.data.toString(16));

  console.log("\n=".repeat(60));
  console.log("STEP 2: Initialize HBAR in New Pool");
  console.log("=".repeat(60) + "\n");

  console.log("🔧 Calling initAsset for HBAR...");
  try {
    const tx = await newPool.initAsset(
      HBAR_ADDRESS,
      oldAssetData.supplyTokenAddress,
      oldAssetData.borrowTokenAddress,
      { gasLimit: 1000000 }
    );
    await tx.wait();
    console.log("✅ HBAR initialized in new Pool");
    console.log("   Transaction:", tx.hash);
  } catch (error) {
    console.error("\n❌ initAsset failed:", error.message);
    if (error.message.includes("Asset already initialized")) {
      console.log("   (Asset was already initialized - continuing)");
    } else {
      throw error;
    }
  }

  console.log("\n=".repeat(60));
  console.log("STEP 3: Set Configuration");
  console.log("=".repeat(60) + "\n");

  console.log("🔧 Setting HBAR configuration...");
  try {
    const tx = await newPool.setConfiguration(
      HBAR_ADDRESS,
      oldConfig,
      { gasLimit: 500000 }
    );
    await tx.wait();
    console.log("✅ Configuration set");
    console.log("   Transaction:", tx.hash);
  } catch (error) {
    console.error("\n❌ setConfiguration failed:", error.message);
    throw error;
  }

  console.log("\n=".repeat(60));
  console.log("STEP 4: Verify New Pool");
  console.log("=".repeat(60) + "\n");

  const newAssetData = await newPool.getAssetData(HBAR_ADDRESS);
  console.log("📊 New Pool HBAR Data:");
  console.log("   Supply Token:", newAssetData.supplyTokenAddress);
  console.log("   Borrow Token:", newAssetData.borrowTokenAddress);
  console.log("   Match:", newAssetData.supplyTokenAddress === oldAssetData.supplyTokenAddress ? "✅" : "❌");

  const newConfig = await newPool.getConfiguration(HBAR_ADDRESS);
  const decimals = (BigInt(newConfig.data) >> 48n) & 0xFFn;
  console.log("\n📊 New Configuration:");
  console.log("   Decimals:", Number(decimals), decimals === 8n ? "✅" : "❌");

  console.log("\n=".repeat(60));
  console.log("✅ SUCCESS! HBAR re-initialized in new Pool");
  console.log("=".repeat(60) + "\n");

  console.log("🎯 Next Steps:");
  console.log("1. Run: npx hardhat run scripts/test-oracle-direct.js --network testnet");
  console.log("2. Should now show $20 collateral!");
  console.log("3. Test frontend to verify everything works\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
