/**
 * Diagnostic script to check user borrow positions
 *
 * This script will check:
 * 1. User account data from Pool contract
 * 2. Asset data including borrow token addresses
 * 3. User borrow token balances
 * 4. Any issues with contract calls
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');
const ERC20ABI = require('./contracts/abis/ERC20.json');

// Contract addresses (from your deployment)
const POOL_ADDRESS = '0x0000000000000000000000000000000000487B8a'; // Pool contract
const RPC_URL = 'https://testnet.hashio.io/api';

// User address - REPLACE WITH YOUR ACCOUNT
const USER_HEDERA_ACCOUNT = '0.0.7093470';

// Convert Hedera account ID to EVM address
function convertHederaAccountToEVM(accountId) {
  if (accountId.startsWith('0x')) {
    return accountId;
  }

  const parts = accountId.split('.');
  if (parts.length !== 3) {
    throw new Error(`Invalid Hedera account ID: ${accountId}`);
  }

  const accountNum = parseInt(parts[2]);
  const paddedHex = accountNum.toString(16).padStart(40, '0');
  return `0x${paddedHex}`;
}

async function main() {
  console.log('🔍 Diagnostic Script for Borrow Positions\n');
  console.log('========================================\n');

  // Setup provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(POOL_ADDRESS, PoolABI.abi, provider);

  // Convert user address
  const userEvmAddress = convertHederaAccountToEVM(USER_HEDERA_ACCOUNT);
  console.log(`👤 User Hedera Account: ${USER_HEDERA_ACCOUNT}`);
  console.log(`   User EVM Address: ${userEvmAddress}\n`);

  // 1. Get user account data
  console.log('📊 Step 1: Get User Account Data');
  console.log('----------------------------------');
  try {
    const accountData = await poolContract.getUserAccountData(userEvmAddress);
    console.log('Account Data:');
    console.log(`  - Total Collateral (USD): ${ethers.formatUnits(accountData.totalCollateralBase, 8)}`);
    console.log(`  - Total Debt (USD): ${ethers.formatUnits(accountData.totalDebtBase, 8)}`);
    console.log(`  - Available Borrows (USD): ${ethers.formatUnits(accountData.availableBorrowsBase, 8)}`);
    console.log(`  - Current Liquidation Threshold: ${accountData.currentLiquidationThreshold}`);
    console.log(`  - LTV: ${accountData.ltv}`);
    console.log(`  - Health Factor: ${ethers.formatUnits(accountData.healthFactor, 18)}\n`);

    if (accountData.totalDebtBase.toString() === '0') {
      console.log('⚠️  WARNING: Total debt is 0! No borrow positions detected.\n');
    }
  } catch (error) {
    console.error('❌ Error getting account data:', error.message);
    console.error(error);
    return;
  }

  // 2. Get assets list
  console.log('📋 Step 2: Get Assets List');
  console.log('----------------------------------');
  let assetAddresses;
  try {
    assetAddresses = await poolContract.getAssetsList();
    console.log(`Found ${assetAddresses.length} assets:\n`);
  } catch (error) {
    console.error('❌ Error getting assets list:', error.message);
    return;
  }

  // 3. Check each asset for borrow positions
  console.log('🔎 Step 3: Check Borrow Positions for Each Asset');
  console.log('--------------------------------------------------\n');

  for (let i = 0; i < assetAddresses.length; i++) {
    const assetAddress = assetAddresses[i];
    console.log(`Asset ${i + 1}/${assetAddresses.length}: ${assetAddress}`);

    try {
      // Get asset data
      const assetData = await poolContract.getAssetData(assetAddress);

      console.log(`  Asset ID: ${assetData.id}`);
      console.log(`  Supply Token: ${assetData.supplyTokenAddress}`);
      console.log(`  Borrow Token: ${assetData.borrowTokenAddress}`);

      // Get asset symbol (try to call the token contract)
      let symbol = 'UNKNOWN';
      try {
        if (assetAddress === '0x0000000000000000000000000000000000000000') {
          symbol = 'HBAR';
        } else {
          const tokenContract = new ethers.Contract(assetAddress, ERC20ABI.abi, provider);
          symbol = await tokenContract.symbol();
        }
      } catch (e) {
        console.log(`  ⚠️  Could not get symbol: ${e.message}`);
      }
      console.log(`  Symbol: ${symbol}`);

      // Check if borrow token exists
      if (!assetData.borrowTokenAddress || assetData.borrowTokenAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`  ⚠️  No borrow token address - asset not borrowable\n`);
        continue;
      }

      // Get user's borrow token balance
      try {
        const borrowTokenContract = new ethers.Contract(assetData.borrowTokenAddress, ERC20ABI.abi, provider);
        const borrowBalance = await borrowTokenContract.balanceOf(userEvmAddress);

        console.log(`  📊 Borrow Token Balance: ${borrowBalance.toString()}`);

        if (borrowBalance > 0n) {
          // Get decimals to format properly
          let decimals = 18;
          try {
            if (assetAddress !== '0x0000000000000000000000000000000000000000') {
              const tokenContract = new ethers.Contract(assetAddress, ERC20ABI.abi, provider);
              decimals = await tokenContract.decimals();
            } else {
              decimals = 8; // HBAR decimals
            }
          } catch (e) {
            console.log(`    Using default decimals: ${decimals}`);
          }

          const formattedBalance = ethers.formatUnits(borrowBalance, decimals);
          console.log(`  ✅ BORROW FOUND: ${formattedBalance} ${symbol}`);
        } else {
          console.log(`  ℹ️  No borrow for this asset`);
        }
      } catch (error) {
        console.log(`  ❌ Error reading borrow token balance: ${error.message}`);
      }

      console.log(''); // Empty line between assets
    } catch (error) {
      console.log(`  ❌ Error processing asset: ${error.message}\n`);
    }
  }

  // 4. Check user configuration
  console.log('⚙️  Step 4: Check User Configuration Bitmap');
  console.log('-------------------------------------------');
  try {
    const userConfig = await poolContract.getUserConfiguration(userEvmAddress);
    console.log(`User Configuration Bitmap: ${userConfig.data.toString()}`);
    console.log(`Binary: ${userConfig.data.toString(2).padStart(256, '0')}\n`);

    // Analyze the bitmap
    console.log('Bitmap Analysis:');
    for (let i = 0; i < assetAddresses.length; i++) {
      const assetData = await poolContract.getAssetData(assetAddresses[i]);
      const assetId = Number(assetData.id);

      const borrowingBit = (BigInt(userConfig.data) >> BigInt(assetId * 2)) & 1n;
      const collateralBit = (BigInt(userConfig.data) >> BigInt(assetId * 2 + 1)) & 1n;

      console.log(`  Asset ${assetId}: borrowing=${borrowingBit === 1n ? 'YES' : 'NO'}, collateral=${collateralBit === 1n ? 'YES' : 'NO'}`);
    }
  } catch (error) {
    console.error('❌ Error getting user configuration:', error.message);
  }

  console.log('\n========================================');
  console.log('✅ Diagnostic Complete');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
