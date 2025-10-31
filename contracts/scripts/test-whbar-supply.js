const hre = require("hardhat");
const fs = require("fs");

const WHBAR_ADDRESS = "0x0000000000000000000000000000000000163a9a";

async function main() {
  console.log("🧪 Testing WHBAR Supply & Borrow\n");

  const [user] = await hre.ethers.getSigners();
  console.log("User:", user.address);

  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const Pool = await hre.ethers.getContractAt("DeraPool", deploymentInfo.addresses.POOL);
  const WHBAR = await hre.ethers.getContractAt("IERC20", WHBAR_ADDRESS);

  // 1. Wrap HBAR to WHBAR
  console.log("📦 Wrapping 10 HBAR to WHBAR...");
  const wrapAmount = hre.ethers.parseUnits("10", 8);
  const wrapTx = await WHBAR.deposit({ value: wrapAmount });
  await wrapTx.wait();
  console.log("✅ Wrapped 10 HBAR");

  // 2. Approve Pool
  console.log("\n🔓 Approving Pool...");
  const approveTx = await WHBAR.approve(deploymentInfo.addresses.POOL, wrapAmount);
  await approveTx.wait();
  console.log("✅ Approved");

  // 3. Supply WHBAR
  console.log("\n📥 Supplying 10 WHBAR...");
  const supplyTx = await Pool.supply(WHBAR_ADDRESS, wrapAmount, user.address, 0);
  await supplyTx.wait();
  console.log("✅ Supplied");

  // 4. Check user data
  const userData = await Pool.getUserAccountData(user.address);
  console.log("\n📊 Account Data:");
  console.log("   Collateral:", hre.ethers.formatUnits(userData.totalCollateralBase, 8), "USD");
  console.log("   Available to Borrow:", hre.ethers.formatUnits(userData.availableBorrowsBase, 8), "USD");

  // 5. Borrow 2 WHBAR
  console.log("\n💰 Borrowing 2 WHBAR...");
  const borrowAmount = hre.ethers.parseUnits("2", 8);
  const borrowTx = await Pool.borrow(WHBAR_ADDRESS, borrowAmount, 2, 0, user.address);
  await borrowTx.wait();
  console.log("✅ Borrowed 2 WHBAR");

  console.log("\n🎉 Test Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
