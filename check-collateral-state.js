// Paste this into your browser console (F12) while on Dera Protocol page
// This will show you the REAL on-chain collateral state vs UI state

async function checkCollateralState() {
  console.log('\n🔍 COLLATERAL STATE DIAGNOSTIC');
  console.log('='.repeat(60));

  const poolAddress = '0x794567E3F7B5a2f92C871A7F65e6451dC489372E';
  const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';
  const userAddress = '0x00000000000000000000000000000000006c3cde'; // Your wallet

  const poolABI = [
    "function getUserConfiguration(address) view returns (tuple(uint256 data))",
    "function getAssetData(address) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address supplyTokenAddress, address borrowTokenAddress))",
    "function getUserAccountData(address) view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD, uint256 availableBorrowsUSD, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
  ];

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const pool = new ethers.Contract(poolAddress, poolABI, provider);

    // Get asset ID
    console.log('\n📊 Step 1: Get HBAR asset ID');
    const assetData = await pool.getAssetData(HBAR_ADDRESS);
    const assetId = Number(assetData.id);
    console.log('   HBAR Asset ID:', assetId);

    // Get user configuration bitmap
    console.log('\n📊 Step 2: Check on-chain collateral status');
    const userConfig = await pool.getUserConfiguration(userAddress);
    const userConfigData = BigInt(userConfig.data.toString());

    console.log('   User Config Bitmap:', '0x' + userConfigData.toString(16));

    // Calculate bit positions
    const borrowBitPosition = assetId * 2;
    const collateralBitPosition = (assetId * 2) + 1;

    // Extract bits
    const isBorrowing = (userConfigData >> BigInt(borrowBitPosition)) & 1n;
    const isCollateralEnabled = (userConfigData >> BigInt(collateralBitPosition)) & 1n;

    console.log('   Borrow Bit (position', borrowBitPosition + '):', isBorrowing === 1n ? '1 (YES)' : '0 (NO)');
    console.log('   Collateral Bit (position', collateralBitPosition + '):', isCollateralEnabled === 1n ? '1 (YES)' : '0 (NO)');

    // Show clear result
    console.log('\n🎯 ON-CHAIN STATE:');
    if (isCollateralEnabled === 1n) {
      console.log('   ✅ HBAR IS ENABLED AS COLLATERAL ON-CHAIN');
    } else {
      console.log('   ❌ HBAR IS NOT ENABLED AS COLLATERAL ON-CHAIN');
      console.log('   ⚠️  THIS IS WHY YOU CANNOT BORROW!');
    }

    // Check account data to confirm
    console.log('\n📊 Step 3: Verify with getUserAccountData');
    const accountData = await pool.getUserAccountData(userAddress);
    const totalCollateralUSD = ethers.utils.formatUnits(accountData.totalCollateralUSD, 8);
    const availableBorrowsUSD = ethers.utils.formatUnits(accountData.availableBorrowsUSD, 8);

    console.log('   Total Collateral:', totalCollateralUSD, 'USD');
    console.log('   Available to Borrow:', availableBorrowsUSD, 'USD');

    if (parseFloat(totalCollateralUSD) === 0) {
      console.log('   ❌ Collateral is $0 - confirms collateral is NOT enabled');
    } else {
      console.log('   ✅ Collateral has value - collateral IS enabled');
    }

    // Check dToken balance
    console.log('\n📊 Step 4: Check your dToken balance');
    const dTokenAddress = assetData.supplyTokenAddress;
    const dTokenABI = ["function balanceOf(address) view returns (uint256)"];
    const dToken = new ethers.Contract(dTokenAddress, dTokenABI, provider);
    const balance = await dToken.balanceOf(userAddress);
    const balanceFormatted = ethers.utils.formatUnits(balance, 8);

    console.log('   dHBAR Balance:', balanceFormatted, 'dHBAR');

    if (parseFloat(balanceFormatted) > 0) {
      console.log('   ✅ You have supply to enable as collateral');
    } else {
      console.log('   ❌ No supply found!');
    }

    // Final diagnosis and instructions
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS:');
    console.log('='.repeat(60));

    if (isCollateralEnabled === 0n && parseFloat(balanceFormatted) > 0) {
      console.log('\n❌ PROBLEM FOUND:');
      console.log('   - You have', balanceFormatted, 'HBAR supplied');
      console.log('   - But collateral is NOT enabled on-chain');
      console.log('   - That\'s why you can\'t borrow and see $0 values');
      console.log('\n✅ SOLUTION:');
      console.log('   1. Look for the collateral toggle in the UI');
      console.log('   2. The toggle should currently show as OFF/DISABLED');
      console.log('   3. Click it to ENABLE collateral');
      console.log('   4. Approve the transaction in HashPack');
      console.log('   5. Watch the console - you should see:');
      console.log('      useAsCollateral: true  ← This means ENABLING');
      console.log('\n⚠️  IMPORTANT:');
      console.log('   - If UI shows toggle as ON but collateral is actually OFF,');
      console.log('     there is a UI bug - refresh the page first');
    } else if (isCollateralEnabled === 1n) {
      console.log('\n✅ COLLATERAL IS ALREADY ENABLED!');
      console.log('   - On-chain state shows collateral bit is SET');
      console.log('   - You should be able to borrow');
      console.log('   - If account data shows $0, there may be another issue');
    } else {
      console.log('\n❌ NO SUPPLY FOUND:');
      console.log('   - You need to supply HBAR first before enabling collateral');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// Run the diagnostic
checkCollateralState();
