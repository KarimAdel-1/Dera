const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Checking User dToken Balance\n");

  // Get deployer (or specify your address)
  const [deployer] = await ethers.getSigners();
  const userAddress = deployer.address;

  console.log("User Address:", userAddress);

  // Load deployment info
  const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
  const poolAddress = deploymentInfo.addresses.POOL;

  console.log("Pool Address:", poolAddress);
  console.log("\n============================================================");
  console.log("CHECKING HBAR dTOKEN");
  console.log("============================================================\n");

  const pool = await ethers.getContractAt("DeraPool", poolAddress);

  // Get HBAR asset data (address(0) for native HBAR)
  const HBAR_ADDRESS = ethers.ZeroAddress;
  const assetData = await pool.getAssetData(HBAR_ADDRESS);

  const dTokenAddress = assetData.supplyTokenAddress;

  console.log("✅ Found dToken Address:", dTokenAddress);

  // Convert to Hedera format
  const hex = dTokenAddress.slice(2).replace(/^0+/, '') || '0';
  const hederaId = hex.length <= 10 ? `0.0.${parseInt(hex, 16)}` : 'EVM-only address';
  console.log("✅ Hedera Format:", hederaId);

  // Get dToken contract with correct ABI
  const dTokenABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function scaledBalanceOf(address) view returns (uint256)"
  ];
  const dToken = new ethers.Contract(dTokenAddress, dTokenABI, deployer);

  // Get token info
  let name, symbol, decimals, totalSupply;
  try {
    name = await dToken.name();
    symbol = await dToken.symbol();
    decimals = await dToken.decimals();
    totalSupply = await dToken.totalSupply();
  } catch (error) {
    console.log("⚠️  Could not read token metadata:", error.message);
    // Use defaults
    name = "DeraSupplyToken";
    symbol = "dHBAR";
    decimals = 8;
    totalSupply = 0n;
  }

  console.log("\n📊 Token Information:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals.toString());
  console.log("   Total Supply:", ethers.formatUnits(totalSupply, decimals), symbol);

  // Get user balance
  const balance = await dToken.balanceOf(userAddress);
  const scaledBalance = await dToken.scaledBalanceOf(userAddress);

  console.log("\n💰 Your Balance:");
  console.log("   Actual Balance:", ethers.formatUnits(balance, decimals), symbol);
  console.log("   Scaled Balance:", ethers.formatUnits(scaledBalance, decimals), "(internal)");

  // Get liquidity index
  const liquidityIndex = await pool.getAssetNormalizedIncome(HBAR_ADDRESS);
  const indexFormatted = ethers.formatUnits(liquidityIndex, 27); // Ray has 27 decimals

  console.log("\n📈 Pool Metrics:");
  console.log("   Liquidity Index:", indexFormatted);
  console.log("   Calculation: scaledBalance * liquidityIndex / 1e27 = actualBalance");

  // Check if balance is zero
  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Your dToken balance is ZERO!");
    console.log("\nPossible reasons:");
    console.log("1. Wrong dToken address added to HashPack");
    console.log("2. Supply transaction didn't complete successfully");
    console.log("3. You're checking a different wallet address");

    // Check if there was any supply at all
    if (totalSupply === 0n) {
      console.log("\n❌ Total supply is also ZERO - no one has supplied to this pool yet!");
    } else {
      console.log("\n✅ Total supply is", ethers.formatUnits(totalSupply, decimals), "- someone has supplied");
      console.log("   But YOUR balance is zero. Did the supply transaction succeed?");
    }
  } else {
    console.log("\n✅ SUCCESS! You have", ethers.formatUnits(balance, decimals), symbol);
    console.log("\n💡 If HashPack shows zero, try:");
    console.log("   1. Refresh HashPack wallet");
    console.log("   2. Remove and re-add the token");
    console.log("   3. Check you added the correct Hedera ID:", hederaId);
  }

  console.log("\n============================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
