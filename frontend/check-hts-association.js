/**
 * Check HTS Token Association
 *
 * On Hedera, users MUST associate with HTS tokens before receiving them.
 * This script checks if the user is associated with the dToken contract.
 */

const { ethers } = require('ethers');
const PoolABI = require('./contracts/abis/Pool.json');

// Contract addresses
const POOL_ADDRESS = '0xB22d91dc1fCAE2851C2EF0bFF63277085414af14';
const RPC_URL = 'https://testnet.hashio.io/api';
const HBAR_ADDRESS = '0x0000000000000000000000000000000000000000';

// User address
const USER_ADDRESS = process.argv[2] || '0x0000000000000000000000000000000000000000';

async function checkHTSAssociation() {
  console.log('🔍 Checking HTS Token Association\n');
  console.log('=========================================\n');

  if (USER_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('❌ ERROR: Please provide your wallet address as an argument!');
    console.log('Usage: node check-hts-association.js YOUR_EVM_ADDRESS\n');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const poolContract = new ethers.Contract(POOL_ADDRESS, PoolABI.abi, provider);

  try {
    // Get dToken address
    console.log('1️⃣ Getting dToken address...');
    const assetData = await poolContract.getAssetData(HBAR_ADDRESS);
    const dTokenAddress = assetData.supplyTokenAddress;
    console.log(`   dToken Address: ${dTokenAddress}\n`);

    // Convert to Hedera ID
    const hex = dTokenAddress.slice(2).replace(/^0+/, '') || '0';
    const hederaId = `0.0.${parseInt(hex, 16)}`;
    console.log(`   dToken Hedera ID: ${hederaId}\n`);

    // Try to query the user's balance on the dToken
    // If the user is NOT associated, this will fail
    console.log('2️⃣ Checking if user is associated with dToken...');
    const HTS = '0x0000000000000000000000000000000000000167';
    const htsInterface = new ethers.Interface([
      'function balanceOf(address token, address account) external view returns (uint256)'
    ]);

    try {
      const data = htsInterface.encodeFunctionData('balanceOf', [dTokenAddress, USER_ADDRESS]);
      const result = await provider.call({
        to: HTS,
        data: data
      });

      console.log('   ✅ User IS associated with dToken!');
      console.log(`   Balance query succeeded: ${result}\n`);
    } catch (e) {
      console.log('   ❌ User is NOT associated with dToken!');
      console.log(`   Error: ${e.message}\n`);
      console.log('   📋 SOLUTION:');
      console.log('   1. Open HashPack wallet');
      console.log('   2. Go to Tokens tab');
      console.log(`   3. Click "Add Token" and enter: ${hederaId}`);
      console.log('   4. Confirm the association');
      console.log('   5. Try supplying again\n');
      return;
    }

    // Check borrow token association too
    const borrowTokenAddress = assetData.borrowTokenAddress;
    const borrowHex = borrowTokenAddress.slice(2).replace(/^0+/, '') || '0';
    const borrowHederaId = `0.0.${parseInt(borrowHex, 16)}`;

    console.log('3️⃣ Checking if user is associated with borrow token...');
    console.log(`   Borrow Token Address: ${borrowTokenAddress}`);
    console.log(`   Borrow Token Hedera ID: ${borrowHederaId}\n`);

    try {
      const data = htsInterface.encodeFunctionData('balanceOf', [borrowTokenAddress, USER_ADDRESS]);
      const result = await provider.call({
        to: HTS,
        data: data
      });

      console.log('   ✅ User IS associated with borrow token!\n');
    } catch (e) {
      console.log('   ❌ User is NOT associated with borrow token!');
      console.log(`   Error: ${e.message}\n`);
      console.log('   📋 SOLUTION:');
      console.log('   1. Open HashPack wallet');
      console.log('   2. Go to Tokens tab');
      console.log(`   3. Click "Add Token" and enter: ${borrowHederaId}`);
      console.log('   4. Confirm the association\n');
    }

    console.log('\n=========================================');
    console.log('📋 SUMMARY');
    console.log('=========================================\n');
    console.log('HTS requires token association BEFORE you can receive tokens.');
    console.log('If you are not associated with dToken, supply will fail to mint dTokens.');
    console.log('Associate with both tokens in HashPack before using the protocol.\n');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
  }
}

checkHTSAssociation()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
