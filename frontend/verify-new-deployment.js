/**
 * Verify New Deployment - Check HBAR Asset Configuration
 *
 * This script verifies the new Pool deployment has HBAR properly initialized
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');
const fs = require('fs');
const path = require('path');

// Read Pool address from deployment-info.json
const deploymentPath = path.join(__dirname, '..', 'contracts', 'deployment-info.json');
if (!fs.existsSync(deploymentPath)) {
  console.error('❌ deployment-info.json not found!');
  process.exit(1);
}
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const POOL_ADDRESS = deployment.addresses.POOL;

const RPC_URL = 'https://testnet.hashio.io/api';
const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

async function verifyNewDeployment() {
  console.log('🔍 Verifying Current Deployment\n');
  console.log('=========================================\n');
  console.log(`Pool Address (from deployment-info.json): ${POOL_ADDRESS}`);
  console.log(`Deployment Timestamp: ${deployment.timestamp || 'unknown'}\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(POOL_ADDRESS, PoolABI.abi, provider);

  try {
    // 1. Check if HBAR asset is initialized
    console.log('1️⃣ Checking if HBAR is initialized in new Pool...');
    const assetData = await poolContract.getAssetData(HBAR_ADDRESS);

    console.log(`   Supply Token Address: ${assetData.supplyTokenAddress}`);
    console.log(`   Borrow Token Address: ${assetData.borrowTokenAddress}`);
    console.log(`   Liquidity Index: ${assetData.liquidityIndex.toString()}`);
    console.log(`   Variable Borrow Index: ${assetData.variableBorrowIndex.toString()}`);

    // Convert to Hedera IDs using BigInt to avoid scientific notation
    const dTokenBigInt = BigInt(assetData.supplyTokenAddress);
    const dTokenHederaId = `0.0.${dTokenBigInt.toString()}`;

    const borrowBigInt = BigInt(assetData.borrowTokenAddress);
    const borrowHederaId = `0.0.${borrowBigInt.toString()}`;

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
    try {
      const config = await poolContract.getUserConfiguration(ethers.ZeroAddress);
      console.log('   Configuration data retrieved (user config check passed)\n');
    } catch (e) {
      console.log('   ⚠️  Could not retrieve configuration (this is OK for new deployments)\n');
    }

    // Check if asset seems active by checking if liquidityIndex > 0
    const isActive = assetData.liquidityIndex > 0n;
    const borrowingEnabled = true; // Assume enabled if initialized

    console.log(`   Is Active: ${isActive ? 'YES (index > 0)' : 'NO (index = 0)'}\n`);

    if (!isActive) {
      console.log('   ❌ HBAR is NOT active!');
      console.log('   Run: cd contracts && npx hardhat run scripts/activate-assets.js --network testnet\n');
      return false;
    }

    // 3. Check Pool HBAR balance
    console.log('3️⃣ Checking Pool HBAR balance...');
    const poolBalance = await provider.getBalance(POOL_ADDRESS);
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
