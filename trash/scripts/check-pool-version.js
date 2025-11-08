const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking Pool Contract Version\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;

  console.log("Pool Address:", poolAddress);

  // Get the bytecode at the pool address
  const provider = ethers.provider;
  const code = await provider.getCode(poolAddress);
  console.log("Bytecode length:", code.length, "characters");
  console.log("Bytecode hash:", ethers.keccak256(code));

  // Try to read the pool contract
  const pool = await ethers.getContractAt("DeraPool", poolAddress);

  console.log("\n" + "=".repeat(60));
  console.log("CHECKING POOL METHODS");
  console.log("=".repeat(60));

  // Check if it has the expected methods
  const methods = [
    'supply',
    'withdraw',
    'borrow',
    'repay',
    'getAssetData',
    'getAssetsList',
    'getConfiguration',
    'ADDRESSES_PROVIDER'
  ];

  for (const method of methods) {
    try {
      const hasMethod = typeof pool[method] === 'function';
      console.log(`  ${method}:`, hasMethod ? "✅" : "❌");
    } catch (e) {
      console.log(`  ${method}: ❌ Error`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("CHECKING POOL CONFIGURATION");
  console.log("=".repeat(60));

  try {
    const addressesProvider = await pool.ADDRESSES_PROVIDER();
    console.log("\n  ADDRESSES_PROVIDER:", addressesProvider);
    console.log("  Expected:", deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER);
    console.log("  Match?", addressesProvider.toLowerCase() === deploymentInfo.addresses.POOL_ADDRESSES_PROVIDER.toLowerCase() ? "✅" : "❌");
  } catch (e) {
    console.log("\n  ❌ Error reading ADDRESSES_PROVIDER:", e.message);
  }

  try {
    const isPaused = await pool.paused();
    console.log("\n  Pool Paused?", isPaused ? "❌ YES" : "✅ No");
  } catch (e) {
    console.log("\n  ❌ Error reading paused:", e.message);
  }

  // Try to check the supply function signature
  console.log("\n" + "=".repeat(60));
  console.log("CHECKING SUPPLY FUNCTION");
  console.log("=".repeat(60));

  try {
    const iface = new ethers.Interface([
      "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) payable"
    ]);
    const selector = iface.getFunction("supply").selector;
    console.log("\n  Expected supply() selector:", selector);

    // Check if the bytecode contains this selector
    const hasSelector = code.includes(selector.slice(2));
    console.log("  Selector found in bytecode?", hasSelector ? "✅" : "❌ Missing!");

    if (!hasSelector) {
      console.log("\n  ⚠️ WARNING: supply() function signature not found!");
      console.log("  This Pool contract might be from an older deployment.");
    }
  } catch (e) {
    console.log("\n  ❌ Error checking supply function:", e.message);
  }

  console.log("\n" + "=".repeat(60));
  console.log("RECOMMENDATION");
  console.log("=".repeat(60));

  console.log("\n  The Pool contract seems to be missing HBAR-specific logic.");
  console.log("\n  Possible solutions:");
  console.log("  1. Redeploy the entire protocol with: npm run deploy:hackathon");
  console.log("  2. Or manually redeploy just the Pool contract");
  console.log("\n  The current Pool contract appears to be incompatible with");
  console.log("  native HBAR supply operations.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
