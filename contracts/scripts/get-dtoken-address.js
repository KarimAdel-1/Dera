const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Getting dToken Addresses\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);

  console.log("Pool Address:", deploymentInfo.addresses.POOL);
  console.log("\n============================================================");
  console.log("DTOKEN ADDRESSES");
  console.log("============================================================\n");

  // Get all assets
  const assetsList = await pool.getAssetsList();

  if (assetsList.length === 0) {
    console.log("❌ No assets found in the pool");
    return;
  }

  for (const asset of assetsList) {
    const assetData = await pool.getAssetData(asset);
    const dTokenAddress = assetData.supplyTokenAddress;

    // Convert EVM address to Hedera format (0.0.xxxxx)
    let hederaFormat = "N/A";
    if (dTokenAddress && dTokenAddress !== ethers.ZeroAddress) {
      // Remove 0x prefix and convert hex to decimal
      const hex = dTokenAddress.slice(2);
      const trimmed = hex.replace(/^0+/, '') || '0';
      if (trimmed.length <= 10) {
        const decimal = parseInt(trimmed, 16);
        hederaFormat = `0.0.${decimal}`;
      }
    }

    // Determine asset name
    let assetName;
    if (asset === ethers.ZeroAddress) {
      assetName = "HBAR (Native)";
    } else if (asset.toLowerCase().includes("usdc") || asset === deploymentInfo.addresses.USDC) {
      assetName = "USDC";
    } else if (asset.toLowerCase().includes("whbar") || asset === deploymentInfo.addresses.WHBAR) {
      assetName = "WHBAR";
    } else {
      assetName = "Unknown Asset";
    }

    console.log(`📊 ${assetName}`);
    console.log(`   Asset Address:  ${asset}`);
    console.log(`   dToken Address (EVM):    ${dTokenAddress}`);
    console.log(`   dToken Address (Hedera): ${hederaFormat}`);
    console.log(`   Token Symbol:   d${assetName.split(' ')[0]}`);
    console.log("");
  }

  console.log("============================================================");
  console.log("HOW TO ADD DTOKEN TO HASHPACK");
  console.log("============================================================\n");
  console.log("1. Open HashPack wallet");
  console.log("2. Go to 'Tokens' tab");
  console.log("3. Click 'Add Token' or 'Manage Tokens'");
  console.log("4. Paste the dToken address in Hedera format (0.0.xxxxx)");
  console.log("5. The token should appear with symbol like 'dHBAR' or 'dUSDC'");
  console.log("\n💡 Note: Even without adding the token to HashPack, your balance");
  console.log("   is safe and visible in the Dera Protocol dashboard.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
