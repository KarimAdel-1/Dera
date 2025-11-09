const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking Oracle Pyth Configuration\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const USDC_ADDRESS = "0x0000000000000000000000000000000000068cDa";

  console.log("============================================================");
  console.log("ORACLE CONFIGURATION DEEP DIVE");
  console.log("============================================================\n");

  console.log("Oracle Address:", deploymentInfo.addresses.ORACLE);

  // Check Pyth contract address
  const pythAddress = await oracle.pyth();
  console.log("\nPyth Contract Address:", pythAddress);

  // Check if assets have Pyth price feed IDs configured
  const hbarPriceId = await oracle.assetToPriceId(HBAR_ADDRESS);
  const usdcPriceId = await oracle.assetToPriceId(USDC_ADDRESS);

  console.log("\n============================================================");
  console.log("PYTH PRICE FEED IDS");
  console.log("============================================================\n");

  console.log("HBAR price feed ID:", hbarPriceId);
  console.log("  Is configured:", hbarPriceId !== ethers.ZeroHash ? "✅ YES" : "❌ NO (will use fallback)");

  console.log("\nUSDC price feed ID:", usdcPriceId);
  console.log("  Is configured:", usdcPriceId !== ethers.ZeroHash ? "✅ YES" : "❌ NO (will use fallback)");

  // Check fallback configuration
  console.log("\n============================================================");
  console.log("FALLBACK CONFIGURATION");
  console.log("============================================================\n");

  const fallbackEnabled = await oracle.fallbackEnabled();
  console.log("Fallback enabled:", fallbackEnabled ? "✅ YES" : "❌ NO");

  // Try to access fallback prices directly (they're private, but we can try getAssetPrice)
  console.log("\nFallback prices (via getAssetPrice):");

  try {
    const hbarPrice = await oracle.getAssetPrice(HBAR_ADDRESS);
    console.log("  HBAR:", "$" + ethers.formatUnits(hbarPrice, 8));
  } catch (e) {
    console.log("  HBAR: ❌ Error -", e.message.split('\n')[0]);
  }

  try {
    const usdcPrice = await oracle.getAssetPrice(USDC_ADDRESS);
    console.log("  USDC:", "$" + ethers.formatUnits(usdcPrice, 8));
  } catch (e) {
    console.log("  USDC: ❌ Error -", e.message.split('\n')[0]);
  }

  console.log("\n============================================================");
  console.log("DIAGNOSIS");
  console.log("============================================================\n");

  if (hbarPriceId !== ethers.ZeroHash) {
    console.log("⚠️  WARNING: HBAR has a Pyth price feed ID configured!");
    console.log("   The oracle will try to query Pyth first before using fallback.");
    console.log("   If Pyth contract at", pythAddress, "is not working or not deployed,");
    console.log("   the oracle will fail during transactions even with fallback enabled.");
    console.log("\n   SOLUTION: Clear the Pyth price feed ID by calling:");
    console.log("   oracle.setAssetPriceFeed(HBAR_ADDRESS, bytes32(0))");
    console.log("\n   Or ensure Pyth is working properly.");
  } else {
    console.log("✅ HBAR is configured to use fallback prices only.");
    console.log("   This should work as long as fallback is enabled and prices are set.");
  }

  if (pythAddress === ethers.ZeroAddress) {
    console.log("\n✅ Pyth contract address is 0x0, oracle will use fallback only.");
  } else {
    console.log("\n⚠️  Pyth contract is configured at:", pythAddress);
    console.log("   Checking if this contract exists...");

    const code = await ethers.provider.getCode(pythAddress);
    if (code === '0x') {
      console.log("   ❌ NO CONTRACT at this address!");
      console.log("   This will cause all oracle queries to fail during transactions!");
      console.log("\n   SOLUTION: The Pyth contract doesn't exist. Either:");
      console.log("   1. Deploy a mock Pyth contract");
      console.log("   2. Redeploy oracle with address(0) for Pyth");
      console.log("   3. Clear all assetToPriceId mappings to force fallback mode");
    } else {
      console.log("   ✅ Contract exists at this address");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
