const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking Oracle Prices\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);

  const HBAR_ADDRESS = ethers.ZeroAddress;
  const USDC_ADDRESS = "0x0000000000000000000000000000000000068cDa";

  try {
    const fallbackEnabled = await oracle.fallbackEnabled();
    console.log("Fallback mode:", fallbackEnabled ? "✅ Enabled" : "❌ Disabled");

    console.log("\nChecking prices:");

    try {
      const hbarPrice = await oracle.getAssetPrice(HBAR_ADDRESS);
      console.log("  HBAR: $" + ethers.formatUnits(hbarPrice, 8), "✅");
    } catch (e) {
      console.log("  HBAR: ❌ NOT SET -", e.message.split('\n')[0]);
    }

    try {
      const usdcPrice = await oracle.getAssetPrice(USDC_ADDRESS);
      console.log("  USDC: $" + ethers.formatUnits(usdcPrice, 8), "✅");
    } catch (e) {
      console.log("  USDC: ❌ NOT SET -", e.message.split('\n')[0]);
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
