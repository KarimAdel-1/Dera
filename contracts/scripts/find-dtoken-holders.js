const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Finding dToken Holders\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;

  console.log("Deployer Address:", deployerAddress);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;

  const pool = await ethers.getContractAt("DeraPool", poolAddress);

  // Get HBAR dToken
  const HBAR_ADDRESS = ethers.ZeroAddress;
  const assetData = await pool.getAssetData(HBAR_ADDRESS);
  const dTokenAddress = assetData.supplyTokenAddress;

  console.log("Pool Address:", poolAddress);
  console.log("dToken Address:", dTokenAddress);

  // Create dToken contract
  const dTokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function scaledBalanceOf(address) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];
  const dToken = new ethers.Contract(dTokenAddress, dTokenABI, deployer);

  const decimals = await dToken.decimals();
  const totalSupply = await dToken.totalSupply();

  console.log("\n============================================================");
  console.log("TOKEN INFO");
  console.log("============================================================");
  console.log("Total Supply:", ethers.formatUnits(totalSupply, decimals), "dHBAR");

  console.log("\n============================================================");
  console.log("CHECKING POTENTIAL HOLDER ADDRESSES");
  console.log("============================================================\n");

  // List of addresses to check
  const addressesToCheck = [
    { name: "Your Wallet (Deployer)", address: deployerAddress },
    { name: "Pool Contract", address: poolAddress },
    { name: "Zero Address", address: ethers.ZeroAddress },
  ];

  // If you have a different wallet address from HashPack, add it here
  // Example: { name: "HashPack Wallet", address: "0x..." }

  let foundHolder = null;
  let maxBalance = 0n;

  for (const addr of addressesToCheck) {
    try {
      const balance = await dToken.balanceOf(addr.address);
      const scaledBalance = await dToken.scaledBalanceOf(addr.address);

      console.log(`📊 ${addr.name}:`);
      console.log(`   Address: ${addr.address}`);
      console.log(`   Balance: ${ethers.formatUnits(balance, decimals)} dHBAR`);
      console.log(`   Scaled Balance: ${ethers.formatUnits(scaledBalance, decimals)}`);

      if (balance > maxBalance) {
        maxBalance = balance;
        foundHolder = addr;
      }
      console.log();
    } catch (error) {
      console.log(`❌ ${addr.name}: Error - ${error.message}\n`);
    }
  }

  console.log("============================================================");
  console.log("ANALYSIS");
  console.log("============================================================\n");

  if (maxBalance > 0n) {
    console.log(`✅ Found dTokens at: ${foundHolder.name}`);
    console.log(`   Balance: ${ethers.formatUnits(maxBalance, decimals)} dHBAR`);

    if (foundHolder.name === "Pool Contract") {
      console.log("\n⚠️  WARNING: dTokens are in the Pool contract!");
      console.log("   This means the supply transaction may not have minted to the user.");
      console.log("   The Pool is holding the HBAR but didn't mint dTokens to you.");
    }
  } else {
    console.log("❌ No holders found in checked addresses!");
    console.log("\n🔍 Next steps:");
    console.log("1. Check the supply transaction on HashScan");
    console.log("2. Look for Transfer events to find where dTokens went");
    console.log("3. Verify which address you used when supplying");
  }

  // Try to get recent Transfer events
  console.log("\n============================================================");
  console.log("SEARCHING FOR TRANSFER EVENTS (Last 1000 blocks)");
  console.log("============================================================\n");

  try {
    const currentBlock = await deployer.provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000);

    console.log(`Searching blocks ${fromBlock} to ${currentBlock}...`);

    const filter = dToken.filters.Transfer();
    const events = await dToken.queryFilter(filter, fromBlock, currentBlock);

    if (events.length > 0) {
      console.log(`\n✅ Found ${events.length} Transfer events:\n`);

      for (const event of events.slice(-5)) { // Show last 5 events
        console.log(`📤 Transfer:`);
        console.log(`   From: ${event.args.from}`);
        console.log(`   To: ${event.args.to}`);
        console.log(`   Amount: ${ethers.formatUnits(event.args.value, decimals)} dHBAR`);
        console.log(`   Block: ${event.blockNumber}`);
        console.log();
      }

      // Check who received the first mint
      const mintEvents = events.filter(e => e.args.from === ethers.ZeroAddress);
      if (mintEvents.length > 0) {
        console.log(`\n🎯 MINT EVENTS (from zero address):\n`);
        for (const event of mintEvents) {
          console.log(`   Minted to: ${event.args.to}`);
          console.log(`   Amount: ${ethers.formatUnits(event.args.value, decimals)} dHBAR`);
          console.log(`   Block: ${event.blockNumber}`);
        }
      }
    } else {
      console.log("❌ No Transfer events found in recent blocks");
      console.log("   The token might be brand new or events aren't indexed yet");
    }
  } catch (error) {
    console.log("⚠️  Could not query events:", error.message);
  }

  console.log("\n============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
