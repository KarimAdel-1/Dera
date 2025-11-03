const { ethers } = require("hardhat");
const fs = require("fs");

const HBAR_TOKEN_ID = "0.0.0";
const USDC_TOKEN_ID = "0.0.429274";

function tokenIdToAddress(tokenId) {
  if (tokenId === "0.0.0") return ethers.ZeroAddress;
  const parts = tokenId.split('.');
  return '0x' + parseInt(parts[2]).toString(16).padStart(40, '0');
}

async function createProxy(implementation) {
  const cloneInitCode = "0x3d602d80600a3d3981f3363d3d373d3d3d363d73" + 
                        implementation.slice(2) + 
                        "5af43d82803e903d91602b57fd5bf3";
  const [deployer] = await ethers.getSigners();
  const tx = await deployer.sendTransaction({ data: cloneInitCode });
  const receipt = await tx.wait();
  return receipt.contractAddress;
}

async function main() {
  console.log("🚀 Direct Asset Initialization (Bypassing ConfiguratorLogic)\n");
  
  const [deployer] = await ethers.getSigners();
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  
  const pool = await ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const poolConfigurator = await ethers.getContractAt("DeraPoolConfigurator", deploymentInfo.addresses.POOL_CONFIGURATOR);
  
  // HBAR
  console.log("=" .repeat(60));
  console.log("HBAR (Token ID: " + HBAR_TOKEN_ID + ")");
  console.log("=".repeat(60));
  
  const DToken = await ethers.getContractFactory("ConcreteDeraSupplyToken");
  const VToken = await ethers.getContractFactory("ConcreteDeraBorrowToken");
  
  console.log("Using Pool address:", deploymentInfo.addresses.POOL);
  
  const hbarDTokenImpl = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
  await hbarDTokenImpl.waitForDeployment();
  const hbarDTokenImplAddr = await hbarDTokenImpl.getAddress();
  
  const hbarVTokenImpl = await VToken.deploy(deploymentInfo.addresses.POOL);
  await hbarVTokenImpl.waitForDeployment();
  const hbarVTokenImplAddr = await hbarVTokenImpl.getAddress();
  
  console.log("✅ Implementations deployed");
  
  const hbarDTokenProxy = await createProxy(hbarDTokenImplAddr);
  const hbarVTokenProxy = await createProxy(hbarVTokenImplAddr);
  console.log("✅ Proxies created");
  console.log("  dToken:", hbarDTokenProxy);
  console.log("  vToken:", hbarVTokenProxy);
  
  const hbarDToken = await ethers.getContractAt("ConcreteDeraSupplyToken", hbarDTokenProxy);
  const hbarVToken = await ethers.getContractAt("ConcreteDeraBorrowToken", hbarVTokenProxy);
  
  await (await hbarDToken.initialize(deploymentInfo.addresses.POOL, ethers.ZeroAddress, 8, "Dera HBAR", "dHBAR", "0x")).wait();
  await (await hbarVToken.initialize(deploymentInfo.addresses.POOL, ethers.ZeroAddress, 8, "Dera Variable Debt HBAR", "vdHBAR", "0x")).wait();
  console.log("✅ Proxies initialized");
  
  try {
    await poolConfigurator.finalizeInitAsset.staticCall(ethers.ZeroAddress, hbarDTokenProxy, hbarVTokenProxy, 8);
    await (await poolConfigurator.finalizeInitAsset(ethers.ZeroAddress, hbarDTokenProxy, hbarVTokenProxy, 8)).wait();
    console.log("✅ Registered in Pool");
  } catch (e) {
    console.log("❌ Failed to register in Pool:", e.message);
    console.log("⚠️  Skipping HBAR - Pool needs redeployment with fixed AssetLogic");
    console.log("   Run: cd contracts && npm run redeploy-pool-only");
    throw new Error("HBAR initialization failed - Pool needs redeployment");
  }
  
  await (await poolConfigurator.configureAssetAsCollateral(ethers.ZeroAddress, 7500, 8000, 10500)).wait();
  await (await poolConfigurator.setAssetActive(ethers.ZeroAddress, true)).wait();
  await (await poolConfigurator.setAssetBorrowing(ethers.ZeroAddress, true)).wait();
  console.log("✅ HBAR configured and active");
  
  // USDC
  console.log("\n" + "=".repeat(60));
  console.log("USDC (Token ID: " + USDC_TOKEN_ID + ")");
  console.log("=".repeat(60));
  
  const USDC_ADDRESS = tokenIdToAddress(USDC_TOKEN_ID);
  
  const usdcDTokenImpl = await DToken.deploy(deploymentInfo.addresses.POOL, deployer.address);
  await usdcDTokenImpl.waitForDeployment();
  const usdcDTokenImplAddr = await usdcDTokenImpl.getAddress();
  
  const usdcVTokenImpl = await VToken.deploy(deploymentInfo.addresses.POOL);
  await usdcVTokenImpl.waitForDeployment();
  const usdcVTokenImplAddr = await usdcVTokenImpl.getAddress();
  
  console.log("✅ Implementations deployed");
  
  const usdcDTokenProxy = await createProxy(usdcDTokenImplAddr);
  const usdcVTokenProxy = await createProxy(usdcVTokenImplAddr);
  console.log("✅ Proxies created");
  console.log("  dToken:", usdcDTokenProxy);
  console.log("  vToken:", usdcVTokenProxy);
  
  const usdcDToken = await ethers.getContractAt("ConcreteDeraSupplyToken", usdcDTokenProxy);
  const usdcVToken = await ethers.getContractAt("ConcreteDeraBorrowToken", usdcVTokenProxy);
  
  await (await usdcDToken.initialize(deploymentInfo.addresses.POOL, USDC_ADDRESS, 6, "Dera USDC", "dUSDC", "0x")).wait();
  await (await usdcVToken.initialize(deploymentInfo.addresses.POOL, USDC_ADDRESS, 6, "Dera Variable Debt USDC", "vdUSDC", "0x")).wait();
  console.log("✅ Proxies initialized");
  
  await (await poolConfigurator.finalizeInitAsset(USDC_ADDRESS, usdcDTokenProxy, usdcVTokenProxy, 6)).wait();
  console.log("✅ Registered in Pool");
  
  await (await poolConfigurator.configureAssetAsCollateral(USDC_ADDRESS, 8000, 8500, 10500)).wait();
  await (await poolConfigurator.setAssetActive(USDC_ADDRESS, true)).wait();
  await (await poolConfigurator.setAssetBorrowing(USDC_ADDRESS, true)).wait();
  console.log("✅ USDC configured and active");
  
  // Verify
  const assetsList = await pool.getAssetsList();
  console.log("\n✅ Assets in pool:", assetsList.length);
  console.log("  HBAR:", assetsList.includes(ethers.ZeroAddress));
  console.log("  USDC:", assetsList.includes(USDC_ADDRESS));
  
  console.log("\n🎉 Initialization complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
