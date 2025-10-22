const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting Dera platform deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  console.log();

  // Initial HBAR price (e.g., $0.05 = 5000000 with 8 decimals)
  const INITIAL_HBAR_PRICE = 5000000; // $0.05

  try {
    // 1. Deploy LP Token contracts
    console.log("1. Deploying LP Token contracts...");

    const LPInstant = await hre.ethers.getContractFactory("LPInstant");
    const lpInstant = await LPInstant.deploy();
    await lpInstant.waitForDeployment();
    const lpInstantAddress = await lpInstant.getAddress();
    console.log("   ✓ LPInstant deployed to:", lpInstantAddress);

    const LPWarm = await hre.ethers.getContractFactory("LPWarm");
    const lpWarm = await LPWarm.deploy();
    await lpWarm.waitForDeployment();
    const lpWarmAddress = await lpWarm.getAddress();
    console.log("   ✓ LPWarm deployed to:", lpWarmAddress);

    const LPCold = await hre.ethers.getContractFactory("LPCold");
    const lpCold = await LPCold.deploy();
    await lpCold.waitForDeployment();
    const lpColdAddress = await lpCold.getAddress();
    console.log("   ✓ LPCold deployed to:", lpColdAddress);
    console.log();

    // 2. Deploy PriceOracle
    console.log("2. Deploying PriceOracle...");
    const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy(INITIAL_HBAR_PRICE, deployer.address);
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    console.log("   ✓ PriceOracle deployed to:", priceOracleAddress);
    console.log("   ✓ Initial HBAR price set to: $0.05");
    console.log();

    // 3. Deploy LendingPool
    console.log("3. Deploying LendingPool...");
    const LendingPool = await hre.ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(
      lpInstantAddress,
      lpWarmAddress,
      lpColdAddress
    );
    await lendingPool.waitForDeployment();
    const lendingPoolAddress = await lendingPool.getAddress();
    console.log("   ✓ LendingPool deployed to:", lendingPoolAddress);
    console.log();

    // 4. Deploy BorrowingContract
    console.log("4. Deploying BorrowingContract...");
    const BorrowingContract = await hre.ethers.getContractFactory("BorrowingContract");
    const borrowingContract = await BorrowingContract.deploy(
      priceOracleAddress,
      lendingPoolAddress,
      deployer.address // Temporary iScore provider, update later
    );
    await borrowingContract.waitForDeployment();
    const borrowingContractAddress = await borrowingContract.getAddress();
    console.log("   ✓ BorrowingContract deployed to:", borrowingContractAddress);
    console.log();

    // 5. Set up contract connections
    console.log("5. Setting up contract connections...");

    // Set LendingPool address in LP tokens
    await lpInstant.setLendingPool(lendingPoolAddress);
    console.log("   ✓ Set LendingPool in LPInstant");

    await lpWarm.setLendingPool(lendingPoolAddress);
    console.log("   ✓ Set LendingPool in LPWarm");

    await lpCold.setLendingPool(lendingPoolAddress);
    console.log("   ✓ Set LendingPool in LPCold");

    // Set BorrowingContract in LendingPool
    await lendingPool.setBorrowingContract(borrowingContractAddress);
    console.log("   ✓ Set BorrowingContract in LendingPool");
    console.log();

    // 6. Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        LPInstant: lpInstantAddress,
        LPWarm: lpWarmAddress,
        LPCold: lpColdAddress,
        PriceOracle: priceOracleAddress,
        LendingPool: lendingPoolAddress,
        BorrowingContract: borrowingContractAddress,
      },
      configuration: {
        initialHbarPrice: INITIAL_HBAR_PRICE,
        priceProvider: deployer.address,
        iScoreProvider: deployer.address,
      },
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentsDir,
      `${hre.network.name}-${Date.now()}.json`
    );
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    const latestFile = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("6. Deployment summary saved to:");
    console.log("   ", deploymentFile);
    console.log();

    // 7. Print summary
    console.log("=".repeat(60));
    console.log("DEPLOYMENT SUCCESSFUL");
    console.log("=".repeat(60));
    console.log("\nContract Addresses:");
    console.log("-------------------");
    console.log("LPInstant:        ", lpInstantAddress);
    console.log("LPWarm:           ", lpWarmAddress);
    console.log("LPCold:           ", lpColdAddress);
    console.log("PriceOracle:      ", priceOracleAddress);
    console.log("LendingPool:      ", lendingPoolAddress);
    console.log("BorrowingContract:", borrowingContractAddress);
    console.log("\nNext Steps:");
    console.log("1. Update .env file with contract addresses");
    console.log("2. Configure backend services with these addresses");
    console.log("3. Set up iScore provider address in BorrowingContract");
    console.log("4. Set up price provider service for PriceOracle");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
