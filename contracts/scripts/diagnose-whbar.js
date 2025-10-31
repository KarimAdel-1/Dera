const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Diagnosing WHBAR initialization issue\n");

  const info = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Pool Configurator:", info.addresses.POOL_CONFIGURATOR);

  // 1️⃣ Check Pool Admin
  console.log("\n1️⃣ Checking Pool Admin...");
  try {
    const provider = await hre.ethers.getContractAt("PoolAddressesProvider", info.addresses.POOL_ADDRESSES_PROVIDER);
    const poolAdmin = await provider.getPoolAdmin();
    console.log("   Pool Admin:", poolAdmin.toLowerCase());
    console.log("   Deployer:", deployer.address.toLowerCase());
    console.log("   Match:", poolAdmin.toLowerCase() === deployer.address.toLowerCase() ? "✅ YES" : "❌ NO");
  } catch (e) {
    console.log("   ❌ Error:", e.message);
  }

  // 2️⃣ Check Rate Strategy
  console.log("\n2️⃣ Checking Rate Strategy...");
  console.log("   Rate Strategy:", info.addresses.RATE_STRATEGY);
  try {
    const code = await hre.ethers.provider.getCode(info.addresses.RATE_STRATEGY);
    console.log("   Deployed:", code !== "0x" ? "✅ YES" : "❌ NO");
  } catch (e) {
    console.log("   ❌ Error:", e.message);
  }

  // 3️⃣ Test WHBAR ERC20 compatibility
  console.log("\n3️⃣ Testing WHBAR ERC20 compatibility...");
  const WHBAR_ADDRESS = "0x0000000000000000000000000000000000163a9a";
  try {
    const ERC20 = await hre.ethers.getContractAt("IERC20", WHBAR_ADDRESS);
    const decimals = await ERC20.decimals();
    console.log("   Decimals:", decimals.toString(), "✅");
    
    const name = await ERC20.name();
    console.log("   Name:", name, "✅");
    
    const symbol = await ERC20.symbol();
    console.log("   Symbol:", symbol, "✅");
  } catch (e) {
    console.log("   ❌ WHBAR not ERC20 compatible via JSON-RPC");
    console.log("   Error:", e.message);
  }

  // 4️⃣ Check ACL permissions
  console.log("\n4️⃣ Checking ACL permissions...");
  try {
    const aclManager = await hre.ethers.getContractAt("ACLManager", info.addresses.ACL_MANAGER);
    const isPoolAdmin = await aclManager.isPoolAdmin(deployer.address);
    const isAssetListingAdmin = await aclManager.isAssetListingAdmin(deployer.address);
    console.log("   Is Pool Admin:", isPoolAdmin ? "✅ YES" : "❌ NO");
    console.log("   Is Asset Listing Admin:", isAssetListingAdmin ? "✅ YES" : "❌ NO");
  } catch (e) {
    console.log("   ❌ Error:", e.message);
  }

  // 5️⃣ Check PoolConfigurator struct
  console.log("\n5️⃣ Checking PoolConfigurator ABI...");
  try {
    const PoolConfigurator = await hre.ethers.getContractAt("DeraPoolConfigurator", info.addresses.POOL_CONFIGURATOR);
    const iface = PoolConfigurator.interface;
    const initAssetsFunc = iface.getFunction("initAssets");
    console.log("   Function signature:", initAssetsFunc.format());
  } catch (e) {
    console.log("   ❌ Error:", e.message);
  }

  console.log("\n✅ Diagnosis complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
