/**
 * Check Pool contract state and liquidity
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');

const POOL_ADDRESS = '0xB22d91dc1fCAE2851C2EF0bFF63277085414af14';
const RPC_URL = 'https://testnet.hashio.io/api';
const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

async function checkPoolState() {
  console.log('🔍 Checking Pool Contract State\n');
  console.log('=========================================\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(POOL_ADDRESS, PoolABI.abi, provider);

  try {
    // 1. Check if pool is paused
    console.log('1️⃣ Checking if pool is paused...');
    try {
      const isPaused = await poolContract.paused();
      console.log(`   Pool paused: ${isPaused}\n`);

      if (isPaused) {
        console.log('❌ ISSUE FOUND: Pool is paused! No borrows can be executed.\n');
      }
    } catch (e) {
      console.log('   (paused() function not available)\n');
    }

    // 2. Get HBAR asset data
    console.log('2️⃣ Getting HBAR asset data...');
    const assetData = await poolContract.getAssetData(HBAR_ADDRESS);
    console.log('   HBAR Asset Data:');
    console.log(`   - Asset ID: ${assetData.id}`);
    console.log(`   - Supply Token: ${assetData.supplyTokenAddress}`);
    console.log(`   - Borrow Token: ${assetData.borrowTokenAddress}`);
    console.log(`   - Liquidity Index: ${assetData.liquidityIndex.toString()}`);
    console.log(`   - Variable Borrow Index: ${assetData.variableBorrowIndex.toString()}`);
    console.log(`   - Current Liquidity Rate: ${assetData.currentLiquidityRate.toString()}`);
    console.log(`   - Current Variable Borrow Rate: ${assetData.currentVariableBorrowRate.toString()}`);
    console.log('');

    // 3. Check supply token balance (pool liquidity)
    console.log('3️⃣ Checking pool liquidity...');
    if (assetData.supplyTokenAddress && assetData.supplyTokenAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        const supplyTokenBalance = await provider.getBalance(assetData.supplyTokenAddress);
        const hbarBalance = ethers.formatUnits(supplyTokenBalance, 8);
        console.log(`   Supply Token Contract Balance: ${hbarBalance} HBAR`);

        if (parseFloat(hbarBalance) < 25) {
          console.log('   ❌ ISSUE FOUND: Not enough HBAR in the supply token contract!\n');
        } else {
          console.log('   ✅ Supply token has sufficient liquidity\n');
        }
      } catch (e) {
        console.log(`   Error checking supply token balance: ${e.message}\n`);
      }
    }

    // 4. Check Pool contract HBAR balance
    console.log('4️⃣ Checking Pool contract native HBAR balance...');
    const poolBalance = await provider.getBalance(POOL_ADDRESS);
    const poolHbar = ethers.formatUnits(poolBalance, 8);
    console.log(`   Pool Contract Balance: ${poolHbar} HBAR`);

    if (parseFloat(poolHbar) < 25) {
      console.log('   ❌ ISSUE FOUND: Pool contract doesn\'t have enough HBAR!\n');
    } else {
      console.log('   ✅ Pool has sufficient HBAR\n');
    }

    // 5. Check asset configuration
    console.log('5️⃣ Checking asset configuration...');
    try {
      const config = await poolContract.getConfiguration(HBAR_ADDRESS);
      console.log(`   Configuration data: ${config.data || config}`);

      const configNum = Number(config.data || config);
      const ltv = (configNum & 0xFFFF) / 100;
      const liquidationThreshold = ((configNum >> 16) & 0xFFFF) / 100;
      const borrowingEnabled = (configNum >> 56) & 1;

      console.log(`   - LTV: ${ltv}%`);
      console.log(`   - Liquidation Threshold: ${liquidationThreshold}%`);
      console.log(`   - Borrowing Enabled: ${borrowingEnabled === 1 ? 'YES' : 'NO'}`);

      if (borrowingEnabled !== 1) {
        console.log('   ❌ ISSUE FOUND: Borrowing is disabled for HBAR!\n');
      } else {
        console.log('   ✅ Borrowing is enabled\n');
      }
    } catch (e) {
      console.log(`   Error checking configuration: ${e.message}\n`);
    }

    // 6. Summary
    console.log('\n=========================================');
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('=========================================\n');

    console.log('The transaction succeeds but no debt tokens are minted.');
    console.log('Gas consumed: 24,959 (very low - indicates early return)');
    console.log('\nPossible causes:');
    console.log('1. Pool contract has no HBAR liquidity for borrows');
    console.log('2. Borrowing is disabled in asset configuration');
    console.log('3. Pool contract is paused');
    console.log('4. Supply token contract has no HBAR to transfer');
    console.log('\nCheck the results above to identify the issue.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkPoolState()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
