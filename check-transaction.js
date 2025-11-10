// Check transaction details from Hedera Mirror Node
const fetch = require('node-fetch');

async function checkTransaction(txId) {
  const MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';

  // Convert transaction ID format for mirror node API
  // From: 0.0.7093470@1762732535.831582941
  // To:   0.0.7093470-1762732535-831582941
  const mirrorNodeTxId = txId.replace('@', '-').replace(/\.(\d+)$/, '-$1');

  console.log('🔍 Querying transaction:', mirrorNodeTxId);
  console.log('URL:', `${MIRROR_NODE_URL}/api/v1/transactions/${mirrorNodeTxId}`);

  try {
    const response = await fetch(`${MIRROR_NODE_URL}/api/v1/transactions/${mirrorNodeTxId}`);

    if (!response.ok) {
      console.error('❌ Failed to fetch:', response.status, response.statusText);
      return;
    }

    const data = await response.json();
    const txInfo = data.transactions?.[0];

    if (!txInfo) {
      console.error('❌ No transaction found');
      return;
    }

    console.log('\n📊 Transaction Details:');
    console.log('Result:', txInfo.result);
    console.log('Consensus Timestamp:', txInfo.consensus_timestamp);

    // Check for contract call result
    if (txInfo.result === 'CONTRACT_REVERT_EXECUTED') {
      console.log('\n❌ CONTRACT REVERTED');

      // Try to get contract result details
      const contractResultUrl = `${MIRROR_NODE_URL}/api/v1/contracts/results/${mirrorNodeTxId}`;
      console.log('\n🔍 Checking contract result:', contractResultUrl);

      const contractResponse = await fetch(contractResultUrl);
      if (contractResponse.ok) {
        const contractData = await contractResponse.json();
        console.log('\nContract Result:');
        console.log(JSON.stringify(contractData, null, 2));

        if (contractData.error_message) {
          console.log('\n⚠️  Error Message:', contractData.error_message);
        }

        if (contractData.result === 'CONTRACT_REVERT_EXECUTED' && contractData.call_result) {
          console.log('\n📝 Call Result (hex):', contractData.call_result);

          // Try to decode revert reason
          if (contractData.call_result.startsWith('0x08c379a0')) {
            // Standard revert with message
            const reason = Buffer.from(contractData.call_result.slice(138), 'hex').toString();
            console.log('🔴 Revert Reason:', reason);
          }
        }
      } else {
        console.log('⚠️  Could not fetch contract result:', contractResponse.status);
      }
    } else {
      console.log('\n✅ Transaction succeeded');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get transaction ID from command line or use default
const txId = process.argv[2] || '0.0.7093470@1762732535.831582941';
checkTransaction(txId);
