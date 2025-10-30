const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Oracle Contract...");

  const Oracle = await ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy();

  await oracle.waitForDeployment();
  const address = await oracle.getAddress();

  console.log("✅ Oracle deployed to:", address);
  console.log(`Add to .env: NEXT_PUBLIC_ORACLE_ADDRESS=${address}`);

  return address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;