// Run this in your browser console while on the Dera Protocol page
// This will check the HBAR asset configuration

async function checkHBARConfig() {
  console.log('🔍 Checking HBAR Configuration...\n');

  const poolAddress = '0x794567E3F7B5a2f92C871A7F65e6451dC489372E';
  const oracleAddress = '0x8376019E530C899b8ABd4bB8225C3Ad4c862d84C';
  const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

  const poolABI = [
    "function getAssetData(address) view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address supplyTokenAddress, address borrowTokenAddress))",
    "function getConfiguration(address) view returns (tuple(uint256 data))",
    "function getUserAccountData(address) view returns (uint256 totalCollateralUSD, uint256 totalDebtUSD, uint256 availableBorrowsUSD, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
    "function getUserConfiguration(address) view returns (tuple(uint256 data))"
  ];

  const oracleABI = [
    "function getAssetPrice(address) view returns (uint256)"
  ];

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const pool = new ethers.Contract(poolAddress, poolABI, provider);

  try {
    // Get asset data
    console.log('📊 Step 1: Get Asset Data');
    const assetData = await pool.getAssetData(HBAR_ADDRESS);
    console.log('   Asset ID:', assetData.id.toString());
    console.log('   Supply Token:', assetData.supplyTokenAddress);
    console.log('   Borrow Token:', assetData.borrowTokenAddress);
    console.log('   Liquidity Index:', ethers.utils.formatUnits(assetData.liquidityIndex, 27));

    // Get configuration
    console.log('\n📋 Step 2: Check Configuration Bitmap');
    const config = await pool.getConfiguration(HBAR_ADDRESS);
    const configData = BigInt(config.data.toString());

    console.log('   Raw Config:', '0x' + configData.toString(16));

    // Decode configuration
    const LTV_MASK = 0xFFFFn;
    const LIQUIDATION_THRESHOLD_START = 16n;
    const IS_ACTIVE_BIT = 56n;
    const BORROWING_ENABLED_BIT = 58n;

    const ltv = Number(configData & LTV_MASK);
    const liquidationThreshold = Number((configData >> LIQUIDATION_THRESHOLD_START) & LTV_MASK);
    const isActive = (configData & (1n << IS_ACTIVE_BIT)) !== 0n;
    const borrowingEnabled = (configData & (1n << BORROWING_ENABLED_BIT)) !== 0n;

    console.log('\n   📝 Configuration Values:');
    console.log('   LTV:', ltv, `(${ltv / 100}%)`);
    console.log('   Liquidation Threshold:', liquidationThreshold, `(${liquidationThreshold / 100}%)`);
    console.log('   Active:', isActive ? '✅ Yes' : '❌ No');
    console.log('   Borrowing Enabled:', borrowingEnabled ? '✅ Yes' : '❌ No');

    // Check oracle price
    console.log('\n💲 Step 3: Check Oracle Price');
    const oracle = new ethers.Contract(oracleAddress, oracleABI, provider);
    const price = await oracle.getAssetPrice(HBAR_ADDRESS);
    const priceUSD = ethers.utils.formatUnits(price, 8); // Oracle uses 8 decimals

    console.log('   HBAR Price:', priceUSD, 'USD');

    if (price.eq(0)) {
      console.log('   ❌ CRITICAL: Oracle price is ZERO!');
    } else {
      console.log('   ✅ Oracle has valid price');
    }

    // Check user configuration (collateral status)
    console.log('\n⚙️  Step 4: Check Your Collateral Status');
    const userAddress = '0x00000000000000000000000000000000006c3cde'; // Your wallet
    const userConfig = await pool.getUserConfiguration(userAddress);
    const userConfigData = BigInt(userConfig.data.toString());

    const assetId = Number(assetData.id.toString());
    const collateralBitPosition = (assetId * 2) + 1;
    const isUsingAsCollateral = (userConfigData >> BigInt(collateralBitPosition)) & 1n;

    console.log('   Asset ID:', assetId);
    console.log('   Collateral Bit Position:', collateralBitPosition);
    console.log('   Collateral Enabled:', isUsingAsCollateral === 1n ? '✅ Yes' : '❌ No');

    // Check user account data
    console.log('\n💰 Step 5: Check Your Account Data');
    const accountData = await pool.getUserAccountData(userAddress);

    console.log('   Total Collateral USD:', ethers.utils.formatUnits(accountData.totalCollateralUSD, 8));
    console.log('   Total Debt USD:', ethers.utils.formatUnits(accountData.totalDebtUSD, 8));
    console.log('   Available Borrows USD:', ethers.utils.formatUnits(accountData.availableBorrowsUSD, 8));
    console.log('   LTV:', accountData.ltv.toString());
    console.log('   Liquidation Threshold:', accountData.currentLiquidationThreshold.toString());

    // Diagnose issues
    console.log('\n🔧 Diagnosis:');
    const issues = [];
    const solutions = [];

    if (ltv === 0) {
      issues.push('❌ CRITICAL: LTV is ZERO - Cannot use HBAR as collateral!');
      solutions.push('Run: npm run fix:hbar');
    }

    if (liquidationThreshold === 0) {
      issues.push('❌ CRITICAL: Liquidation Threshold is ZERO');
      if (!solutions.includes('Run: npm run fix:hbar')) {
        solutions.push('Run: npm run fix:hbar');
      }
    }

    if (!isActive) {
      issues.push('❌ Asset is NOT ACTIVE');
      if (!solutions.includes('Run: npm run fix:hbar')) {
        solutions.push('Run: npm run fix:hbar');
      }
    }

    if (!borrowingEnabled) {
      issues.push('⚠️  Borrowing is NOT ENABLED');
      if (!solutions.includes('Run: npm run fix:hbar')) {
        solutions.push('Run: npm run fix:hbar');
      }
    }

    if (price.eq(0)) {
      issues.push('❌ CRITICAL: Oracle price is ZERO!');
      issues.push('   This causes getUserAccountData to return all zeros');
      solutions.push('Run: npm run set:oracle');
    }

    if (isUsingAsCollateral === 0n && price.gt(0) && ltv > 0) {
      issues.push('⚠️  You have NOT enabled HBAR as collateral');
      issues.push('   This is why you can\'t borrow and account shows $0');
      solutions.push('Enable collateral in the frontend UI');
    }

    if (issues.length > 0) {
      console.log('   Issues Found:');
      issues.forEach(issue => console.log('   ' + issue));

      console.log('\n💡 Solutions:');
      solutions.forEach(solution => console.log('   ✅ ' + solution));
    } else {
      console.log('   ✅ Everything is configured correctly!');
      console.log('   You should be able to enable collateral and borrow.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
checkHBARConfig();
