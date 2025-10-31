const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing HBAR Supply & Borrow\n");

  const [user] = await hre.ethers.getSigners();
  console.log("User:", user.address);
  
  const balance = await hre.ethers.provider.getBalance(user.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "HBAR\n");

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;

  const Pool = await hre.ethers.getContractAt("DeraPool", poolAddress);

  // 1. Supply 10 HBAR
  console.log("📥 Supplying 10 HBAR...");
  const supplyAmount = hre.ethers.parseEther("10");
  
  const supplyTx = await Pool.supply(
    hre.ethers.ZeroAddress, // HBAR
    supplyAmount,
    user.address,
    0,
    { value: supplyAmount }
  );
  await supplyTx.wait();
  console.log("✅ Supplied 10 HBAR");
  console.log("   Tx:", supplyTx.hash);

  // 2. Check user data
  const userData = await Pool.getUserAccountData(user.address);
  console.log("\n📊 User Account Data:");
  console.log("   Total Collateral:", hre.ethers.formatEther(userData.totalCollateralBase), "USD");
  console.log("   Total Debt:", hre.ethers.formatEther(userData.totalDebtBase), "USD");
  console.log("   Available to Borrow:", hre.ethers.formatEther(userData.availableBorrowsBase), "USD");
  console.log("   Health Factor:", userData.healthFactor.toString());

  // 3. Borrow 2 HBAR (20% of collateral)
  console.log("\n💰 Borrowing 2 HBAR...");
  const borrowAmount = hre.ethers.parseEther("2");
  
  const borrowTx = await Pool.borrow(
    hre.ethers.ZeroAddress,
    borrowAmount,
    2, // Variable rate
    0,
    user.address
  );
  await borrowTx.wait();
  console.log("✅ Borrowed 2 HBAR");
  console.log("   Tx:", borrowTx.hash);

  // 4. Check updated user data
  const updatedData = await Pool.getUserAccountData(user.address);
  console.log("\n📊 Updated Account Data:");
  console.log("   Total Debt:", hre.ethers.formatEther(updatedData.totalDebtBase), "USD");
  console.log("   Health Factor:", updatedData.healthFactor.toString());

  console.log("\n🎉 Test Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
