/**
 * Check recent borrow transactions for a user
 */

const { ethers } = require('ethers');

const USER_ACCOUNT = '0.0.7093470';
const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';
const POOL_ADDRESS = '0xB22d91dc1fCAE2851C2EF0bFF63277085414af14';

async function checkBorrowTransactions() {
  console.log('🔍 Checking Recent Borrow Transactions\n');
  console.log('========================================\n');
  console.log(`User Account: ${USER_ACCOUNT}`);
  console.log(`Pool Contract: ${POOL_ADDRESS}\n`);

  try {
    // Fetch recent transactions
    const response = await fetch(
      `${MIRROR_NODE_URL}/api/v1/accounts/${USER_ACCOUNT}/transactions?limit=50&order=desc`
    );

    if (!response.ok) {
      throw new Error(`Mirror Node API error: ${response.statusText}`);
    }

    const data = await response.json();
    const transactions = data.transactions || [];

    console.log(`Found ${transactions.length} recent transactions\n`);

    // Filter for contract calls to the Pool contract
    const poolTransactions = transactions.filter(tx => {
      // Check if transaction is a contract call
      if (tx.name !== 'CONTRACTCALL') return false;

      // Check if it's to our Pool contract
      const contractId = tx.entity_id;

      // Convert Pool address to account ID format if needed
      // Pool address: 0xB22d91dc1fCAE2851C2EF0bFF63277085414af14
      // Extract the last part and convert to decimal
      const poolAddressHex = POOL_ADDRESS.toLowerCase().replace('0x', '');
      const poolAccountNum = parseInt(poolAddressHex.slice(-8), 16); // Last 8 hex chars

      return contractId === `0.0.${poolAccountNum}` ||
             tx.transaction_id.includes('CONTRACTCALL');
    });

    console.log(`Found ${poolTransactions.length} contract call transactions\n`);
    console.log('Recent Pool Contract Transactions:');
    console.log('----------------------------------\n');

    for (const tx of poolTransactions.slice(0, 10)) {
      console.log(`Transaction: ${tx.transaction_id}`);
      console.log(`  Time: ${new Date(parseFloat(tx.consensus_timestamp) * 1000).toISOString()}`);
      console.log(`  Result: ${tx.result}`);
      console.log(`  Charged Fee: ${tx.charged_tx_fee / 100000000} HBAR`);

      if (tx.result !== 'SUCCESS') {
        console.log(`  ❌ Transaction FAILED!`);
      } else {
        console.log(`  ✅ Transaction succeeded`);
      }

      // Try to decode function call
      if (tx.function_parameters) {
        console.log(`  Function Parameters: ${tx.function_parameters}`);
      }

      console.log('');
    }

    // Also check for any failed transactions
    const failedTxs = transactions.filter(tx => tx.result !== 'SUCCESS');
    if (failedTxs.length > 0) {
      console.log('\n⚠️  Failed Transactions:');
      console.log('------------------------\n');

      for (const tx of failedTxs.slice(0, 5)) {
        console.log(`${tx.transaction_id}: ${tx.result} - ${tx.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBorrowTransactions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
