/**
 * Diagnose Supply Token (dToken) Balance Issue
 *
 * This script checks:
 * 1. User's dToken balance (should show supplied amount)
 * 2. User's scaled dToken balance
 * 3. dToken contract's HBAR balance
 * 4. Pool contract's HBAR balance
 * 5. Asset liquidity index
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');
const ERC20ABI = require('./contracts/abis/ERC20.json');

// Contract addresses
const POOL_ADDRESS = '0xB22d91dc1fCAE2851C2EF0bFF63277085414af14';
const RPC_URL = 'https://testnet.hashio.io/api';
const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

// User address (from your wallet - UPDATE THIS!)
const USER_ADDRESS = process.argv[2] || '0x0000000000000000000000000000000000000000';

async function diagnoseSupplyTokens() {
  console.log('🔍 Diagnosing Supply Token (dToken) Balance Issue\n');
  console.log('=========================================\n');

  if (USER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('❌ ERROR: Please provide your wallet address as an argument!');
    console.log('Usage: node diagnose-supply-tokens.js YOUR_EVM_ADDRESS\n');
    console.log('Example: node diagnose-supply-tokens.js 0x1234567890123456789012345678901234567890\n');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(POOL_ADDRESS, PoolABI.abi, provider);

  try {
    // 1. Get HBAR asset data
    console.log('1️⃣ Getting HBAR asset data from Pool...');
    const assetData = await poolContract.getAssetData(HBAR_ADDRESS);
    console.log(`   Supply Token (dToken) Address: ${assetData.supplyTokenAddress}`);
    console.log(`   Borrow Token Address: ${assetData.borrowTokenAddress}`);
    console.log(`   Liquidity Index: ${assetData.liquidityIndex.toString()}`);
    console.log(`   Variable Borrow Index: ${assetData.variableBorrowIndex.toString()}\n`);

    const dTokenAddress = assetData.supplyTokenAddress;
    const dTokenContract = new ethers.Contract(dTokenAddress, ERC20ABI.abi, provider);

    // 2. Check user's dToken balance
    console.log('2️⃣ Checking user dToken balance...');
    try {
      const dTokenBalance = await dTokenContract.balanceOf(USER_ADDRESS);
      const formattedBalance = ethers.formatUnits(dTokenBalance, 8);
      console.log(`   User ${USER_ADDRESS}`);
      console.log(`   dToken Balance: ${formattedBalance} dHBAR`);

      if (parseFloat(formattedBalance) === 0) {
        console.log('   ❌ ISSUE FOUND: User has ZERO dToken balance!');
        console.log('   This means either:');
        console.log('      a) The supply transaction failed to mint dTokens');
        console.log('      b) The supply never actually happened');
        console.log('      c) The dTokens were burned/transferred away\n');
      } else {
        console.log(`   ✅ User has ${formattedBalance} dHBAR tokens\n`);
      }
    } catch (e) {
      console.log(`   ❌ Error querying dToken balance: ${e.message}\n`);
    }

    // 3. Check dToken contract's HBAR balance
    console.log('3️⃣ Checking dToken contract HBAR balance...');
    const dTokenHbarBalance = await provider.getBalance(dTokenAddress);
    const dTokenHbar = ethers.formatUnits(dTokenHbarBalance, 8);
    console.log(`   dToken Contract Balance: ${dTokenHbar} HBAR`);

    if (parseFloat(dTokenHbar) === 0) {
      console.log('   ❌ ISSUE FOUND: dToken contract has NO HBAR!');
      console.log('   The supplied HBAR never made it to the dToken contract.\n');
    } else {
      console.log(`   ✅ dToken contract has ${dTokenHbar} HBAR\n`);
    }

    // 4. Check Pool contract's HBAR balance
    console.log('4️⃣ Checking Pool contract HBAR balance...');
    const poolHbarBalance = await provider.getBalance(POOL_ADDRESS);
    const poolHbar = ethers.formatUnits(poolHbarBalance, 8);
    console.log(`   Pool Contract Balance: ${poolHbar} HBAR`);

    if (parseFloat(poolHbar) > 0) {
      console.log('   ⚠️  POTENTIAL ISSUE: Pool has HBAR but it should be in dToken contract!');
      console.log('   The supply flow may not be transferring HBAR to dToken properly.\n');
    } else {
      console.log('   ✅ Pool contract has no HBAR (expected - HBAR should be in dToken)\n');
    }

    // 5. Check user's account data from Pool
    console.log('5️⃣ Checking user account data from Pool...');
    try {
      const accountData = await poolContract.getUserAccountData(USER_ADDRESS);
      console.log('   User Account Data:');
      console.log(`   - Total Collateral (USD): ${ethers.formatUnits(accountData[0], 8)}`);
      console.log(`   - Total Debt (USD): ${ethers.formatUnits(accountData[1], 8)}`);
      console.log(`   - Available to Borrow (USD): ${ethers.formatUnits(accountData[2], 8)}`);
      console.log(`   - Liquidation Threshold: ${accountData[3].toString()}`);
      console.log(`   - LTV: ${accountData[4].toString()}`);
      console.log(`   - Health Factor: ${ethers.formatUnits(accountData[5], 18)}\n`);

      if (accountData[0] === 0n) {
        console.log('   ❌ ISSUE CONFIRMED: User has ZERO collateral in Pool!');
        console.log('   This confirms dTokens were never minted.\n');
      }
    } catch (e) {
      console.log(`   ❌ Error querying user account data: ${e.message}\n`);
    }

    // 6. Check dToken total supply
    console.log('6️⃣ Checking dToken total supply...');
    try {
      const totalSupply = await dTokenContract.totalSupply();
      const formattedSupply = ethers.formatUnits(totalSupply, 8);
      console.log(`   Total dHBAR Supply: ${formattedSupply}`);

      if (parseFloat(formattedSupply) === 0) {
        console.log('   ❌ CRITICAL: Total dToken supply is ZERO!');
        console.log('   No dTokens have been minted for ANY user.\n');
      } else {
        console.log(`   ✅ Total dHBAR supply: ${formattedSupply}\n`);
      }
    } catch (e) {
      console.log(`   ❌ Error querying total supply: ${e.message}\n`);
    }

    // 7. Summary and diagnosis
    console.log('\n=========================================');
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('=========================================\n');

    console.log('Based on the error code 0x47bc4b2c = NotEnoughAvailableUserBalance()');
    console.log('This error occurs when: scaledAmount > scaledUserBalance\n');

    console.log('Most likely causes:');
    console.log('1. Supply transaction succeeded but dTokens were NOT minted');
    console.log('2. HBAR was sent to Pool but never forwarded to dToken contract');
    console.log('3. dToken mint function failed silently during supply');
    console.log('4. User address mismatch (EVM vs Hedera account ID)\n');

    console.log('Next steps:');
    console.log('1. Check the actual supply transaction hash on HashScan');
    console.log('2. Verify HBAR was transferred to dToken contract');
    console.log('3. Check if dToken Mint event was emitted');
    console.log('4. Inspect supply transaction internal calls\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  }
}

diagnoseSupplyTokens()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
