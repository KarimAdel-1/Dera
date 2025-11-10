/**
 * Verify New Deployment - Check HBAR Asset Configuration
 *
 * This script verifies the new Pool deployment has HBAR properly initialized
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');

// NEW Pool address from deployment-info.json (Nov 8, 2025)
const NEW_POOL_ADDRESS = '0x2E3d470c81b5C9d3C660eC5A42AdD86FAa828CA8';
const RPC_URL = 'https://testnet.hashio.io/api';
const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

async function verifyNewDeployment() {
  console.log('🔍 Verifying New Deployment\n');
  console.log('=========================================\n');
  console.log(`New Pool Address: ${NEW_POOL_ADDRESS}\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(NEW_POOL_ADDRESS, PoolABI.abi, provider);

  try {
    // 1. Check if HBAR asset is initialized
    console.log('1️⃣ Checking if HBAR is initialized in new Pool...');
    const assetData = await poolContract.getAssetData(HBAR_ADDRESS);

    console.log(`   Supply Token Address: ${assetData.supplyTokenAddress}`);
    console.log(`   Borrow Token Address: ${assetData.borrowTokenAddress}`);
    console.log(`   Liquidity Index: ${assetData.liquidityIndex.toString()}`);
    console.log(`   Variable Borrow Index: ${assetData.variableBorrowIndex.toString()}`);

    // Convert to Hedera IDs
    const dTokenHex = assetData.supplyTokenAddress.slice(2).replace(/^0+/, '') || '0';
    const dTokenHederaId = `0.0.${parseInt(dTokenHex, 16)}`;

    const borrowHex = assetData.borrowTokenAddress.slice(2).replace(/^0+/, '') || '0';
    const borrowHederaId = `0.0.${parseInt(borrowHex, 16)}`;

    console.log(`   dToken Hedera ID: ${dTokenHederaId}`);
    console.log(`   Borrow Token Hedera ID: ${borrowHederaId}\n`);

    if (assetData.liquidityIndex.toString() === '0') {
      console.log('   ❌ HBAR is NOT initialized! Liquidity index is 0.');
      console.log('   Run: cd contracts && npm run init:assets\n');
      return false;
    } else {
      console.log('   ✅ HBAR is initialized!\n');
    }

    // 2. Check asset configuration
    console.log('2️⃣ Checking HBAR asset configuration...');
    const config = await poolContract.getConfiguration(HBAR_ADDRESS);
    const configNum = Number(config.data || config);

    const ltv = (configNum & 0xFFFF) / 100;
    const liquidationThreshold = ((configNum >> 16) & 0xFFFF) / 100;
    const borrowingEnabled = (configNum >> 56) & 1;
    const isActive = (configNum >> 58) & 1;

    console.log(`   LTV: ${ltv}%`);
    console.log(`   Liquidation Threshold: ${liquidationThreshold}%`);
    console.log(`   Borrowing Enabled: ${borrowingEnabled === 1 ? 'YES' : 'NO'}`);
    console.log(`   Is Active: ${isActive === 1 ? 'YES' : 'NO'}\n`);

    if (!isActive) {
      console.log('   ❌ HBAR is NOT active!');
      console.log('   Run: cd contracts && npx hardhat run scripts/activate-assets.js --network testnet\n');
      return false;
    }

    if (!borrowingEnabled) {
      console.log('   ⚠️  Borrowing is DISABLED for HBAR!\n');
    }

    // 3. Check Pool HBAR balance
    console.log('3️⃣ Checking Pool HBAR balance...');
    const poolBalance = await provider.getBalance(NEW_POOL_ADDRESS);
    const poolHbar = ethers.formatUnits(poolBalance, 8);
    console.log(`   Pool Balance: ${poolHbar} HBAR\n`);

    // 4. Check dToken HBAR balance
    console.log('4️⃣ Checking dToken HBAR balance...');
    const dTokenBalance = await provider.getBalance(assetData.supplyTokenAddress);
    const dTokenHbar = ethers.formatUnits(dTokenBalance, 8);
    console.log(`   dToken Balance: ${dTokenHbar} HBAR\n`);

    console.log('=========================================');
    console.log('📋 SUMMARY');
    console.log('=========================================\n');

    if (isActive && borrowingEnabled) {
      console.log('✅ New deployment is READY!');
      console.log('✅ HBAR is initialized and active');
      console.log('✅ Borrowing is enabled\n');

      console.log('📝 NEXT STEPS FOR USER:');
      console.log('1. Associate with dToken in HashPack:');
      console.log(`   Token ID: ${dTokenHederaId}`);
      console.log('2. Associate with Borrow Token in HashPack:');
      console.log(`   Token ID: ${borrowHederaId}`);
      console.log('3. Restart frontend dev server to pick up new addresses');
      console.log('4. Try supplying HBAR again!\n');
      return true;
    } else {
      console.log('⚠️  Deployment needs configuration:');
      if (!isActive) console.log('   - HBAR needs to be activated');
      if (!borrowingEnabled) console.log('   - Borrowing needs to be enabled');
      console.log('');
      return false;
    }

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    return false;
  }
}

verifyNewDeployment()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
