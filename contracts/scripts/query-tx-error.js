const fetch = require('node-fetch');

async function main() {
  const txHash = process.argv[2];

  if (!txHash) {
    console.log("Usage: node query-tx-error.js <transaction-hash>");
    console.log("Example: node query-tx-error.js 0xb84eaff722ab9845734381c5d8b2abccb9d281d0d3b655bb22b7a02b54a5bf51");
    process.exit(1);
  }

  console.log("🔍 Querying Hedera Mirror Node for transaction details...\n");
  console.log("Transaction Hash:", txHash);

  // Query mirror node
  const url = `https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${txHash}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    console.log("\n============================================================");
    console.log("TRANSACTION DETAILS");
    console.log("============================================================\n");

    if (data.error_message) {
      console.log("❌ Error Message:", data.error_message);
    }

    if (data.result) {
      console.log("Result:", data.result);
    }

    if (data.error_message || data.result) {
      console.log("\nRaw Response:");
      console.log(JSON.stringify(data, null, 2));
    }

    // Check for contract revert
    if (data.call_result) {
      console.log("\nCall Result (hex):", data.call_result);

      // Try to decode if it looks like an error selector
      if (data.call_result.startsWith('0x')) {
        const errorSelector = data.call_result.slice(0, 10);
        const errorData = data.call_result.slice(10);

        console.log("\nError Selector:", errorSelector);
        console.log("Error Data:", errorData);

        if (errorSelector === '0x358d9e8f') {
          console.log("\n🎯 This is a StalePriceData error!");
          console.log("The oracle is returning 0 or stale data during the transaction.");
        }
      }
    }

    console.log("\n============================================================");
    console.log("GAS USAGE");
    console.log("============================================================\n");

    if (data.gas_used) {
      console.log("Gas Used:", data.gas_used);
    }
    if (data.gas_limit) {
      console.log("Gas Limit:", data.gas_limit);
    }

  } catch (error) {
    console.error("Error querying mirror node:", error.message);
    console.error("\nFull error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
