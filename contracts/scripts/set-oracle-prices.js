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
  console.log("💰 Setting Oracle Prices (Fallback Mode)\n");
  console.log("Assets to configure:");
  console.log("  HBAR:", HBAR_TOKEN_ID, "→", HBAR_ADDRESS);
  console.log("  USDC:", USDC_TOKEN_ID, "→", USDC_ADDRESS);
  console.log("");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const oracleAddress = deploymentInfo.addresses.ORACLE;

  console.log("Oracle address:", oracleAddress);

  const oracle = await ethers.getContractAt("DeraOracle", oracleAddress);

  // Check current fallback status
  const fallbackEnabled = await oracle.fallbackEnabled();
  console.log("\n📋 Current fallback mode:", fallbackEnabled ? "✅ Enabled" : "❌ Disabled");

  // ========== SET PRICES ==========
  console.log("\n" + "=".repeat(60));
  console.log("SETTING FALLBACK PRICES");
  console.log("=".repeat(60));

  // HBAR price: $0.08 = 8000000 (8 decimals)
  const hbarPrice = ethers.parseUnits("0.08", 8);
  console.log("\n📍 Setting HBAR price to $0.08...");
  await (await oracle.setFallbackPrice(HBAR_ADDRESS, hbarPrice)).wait();
  console.log("✅ HBAR price set");

  // USDC price: $1.00 = 100000000 (8 decimals)
  const usdcPrice = ethers.parseUnits("1.00", 8);
  console.log("\n📍 Setting USDC price to $1.00...");
  await (await oracle.setFallbackPrice(USDC_ADDRESS, usdcPrice)).wait();
  console.log("✅ USDC price set");

  // Enable fallback mode if not already enabled
  if (!fallbackEnabled) {
    console.log("\n📍 Enabling fallback mode...");
    await (await oracle.setFallbackEnabled(true)).wait();
    console.log("✅ Fallback mode enabled");
  } else {
    console.log("\n✅ Fallback mode already enabled");
  }

  // ========== VERIFY PRICES ==========
  console.log("\n" + "=".repeat(60));
  console.log("VERIFYING PRICES");
  console.log("=".repeat(60));

  try {
    const hbarPriceResult = await oracle.getAssetPrice(HBAR_ADDRESS);
    const hbarPriceFormatted = ethers.formatUnits(hbarPriceResult, 8);
    console.log("\n  HBAR price: $" + hbarPriceFormatted);
  } catch (error) {
    console.error("❌ Failed to get HBAR price:", error.message);
  }

  try {
    const usdcPriceResult = await oracle.getAssetPrice(USDC_ADDRESS);
    const usdcPriceFormatted = ethers.formatUnits(usdcPriceResult, 8);
    console.log("  USDC price: $" + usdcPriceFormatted);
  } catch (error) {
    console.error("❌ Failed to get USDC price:", error.message);
  }

  console.log("\n🎉 Oracle prices configured!");
  console.log("\n💡 Notes:");
  console.log("  - These are fallback prices for testing");
  console.log("  - In production, configure Pyth Network price feeds");
  console.log("  - Use setAssetPriceFeed() to set Pyth price IDs");
  console.log("  - Prices are in 8 decimals ($1.00 = 100000000)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
