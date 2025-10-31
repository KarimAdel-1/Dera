const hre = require("hardhat");

async function main() {
  console.log("📦 Deploying WHBAR Wrapper\n");

  const WHBARWrapper = await hre.ethers.getContractFactory("WHBARWrapper");
  const wrapper = await WHBARWrapper.deploy();
  await wrapper.waitForDeployment();
  const wrapperAddress = await wrapper.getAddress();

  console.log("✅ WHBAR Wrapper deployed:", wrapperAddress);
  console.log("\n📋 Use this address instead of 0x0000000000000000000000000000000000163a9a");
  console.log("   Wrapper provides ERC20 metadata that JSON-RPC can access");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
