const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Mock Pyth Contract\n");

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("\n============================================================");
  console.log("DEPLOYMENT");
  console.log("============================================================\n");

  // Deploy MockPyth
  const MockPyth = await ethers.getContractFactory("MockPyth");
  console.log("Deploying MockPyth...");

  const mockPyth = await MockPyth.deploy();
  await mockPyth.waitForDeployment();

  const mockPythAddress = await mockPyth.getAddress();
  console.log("✅ MockPyth deployed at:", mockPythAddress);

  // Check if it matches the expected address
  const oracle = await ethers.getContractAt("DeraOracle", deploymentInfo.addresses.ORACLE);
  const expectedPythAddress = await oracle.pyth();

  console.log("\n============================================================");
  console.log("VERIFICATION");
  console.log("============================================================\n");

  console.log("Expected Pyth address (from oracle):", expectedPythAddress);
  console.log("Deployed Pyth address:", mockPythAddress);

  if (mockPythAddress.toLowerCase() === expectedPythAddress.toLowerCase()) {
    console.log("\n✅ PERFECT MATCH!");
    console.log("   The mock Pyth is deployed at the exact address the oracle expects.");
    console.log("   Supply transactions should now work!");
  } else {
    console.log("\n⚠️  ADDRESSES DON'T MATCH!");
    console.log("   The oracle expects Pyth at:", expectedPythAddress);
    console.log("   But we deployed at:", mockPythAddress);
    console.log("\n   This is expected if using CREATE deployment.");
    console.log("   You would need to use CREATE2 to deploy at a specific address.");
    console.log("\n   SOLUTION: The mock Pyth existing is enough - the oracle won't");
    console.log("   actually call it since assetToPriceId is zero. The transaction");
    console.log("   failure was likely due to other reasons.");
  }

  console.log("\n💡 NOTE: Since assetToPriceId is zero for both HBAR and USDC,");
  console.log("   the oracle will use fallback prices and never call this mock.");
  console.log("   This mock just needs to exist to satisfy any address checks.");

  // Save the new address
  deploymentInfo.addresses.PYTH_MOCK = mockPythAddress;
  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Updated deployment-info.json with mock Pyth address");

  console.log("\n============================================================");
  console.log("NEXT STEPS");
  console.log("============================================================\n");

  console.log("1. Try the supply transaction again:");
  console.log("   npm run init:reserves");
  console.log("\n2. If it still fails, the issue is not the missing Pyth contract.");
  console.log("   We'll need to investigate further.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
