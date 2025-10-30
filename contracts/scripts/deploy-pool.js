const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Pool Contract...");

  const Pool = await ethers.getContractFactory("Pool");
  const pool = await Pool.deploy();

  await pool.waitForDeployment();
  const address = await pool.getAddress();

  console.log("✅ Pool deployed to:", address);
  console.log(`Add to .env: NEXT_PUBLIC_POOL_ADDRESS=${address}`);

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