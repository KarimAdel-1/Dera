const { Client, TopicCreateTransaction, PrivateKey, AccountId } = require("@hashgraph/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function createHCSTopics() {
  console.log("🚀 Creating HCS Topics for Event Logging\n");

  // Setup Hedera client
  const accountId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
  const privateKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);

  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  const topics = {};
  const eventTypes = [
    { name: "SUPPLY", description: "Asset supply events" },
    { name: "WITHDRAW", description: "Asset withdrawal events" },
    { name: "BORROW", description: "Asset borrow events" },
    { name: "REPAY", description: "Loan repayment events" },
    { name: "LIQUIDATION", description: "Liquidation events" }
  ];

  try {
    for (const eventType of eventTypes) {
      console.log(`📍 Creating ${eventType.name} topic...`);
      
      const createTx = new TopicCreateTransaction()
        .setTopicMemo(`Dera Protocol - ${eventType.description}`)
        .setAdminKey(privateKey.publicKey)
        .setSubmitKey(privateKey.publicKey);

      const response = await createTx.execute(client);
      const receipt = await response.getReceipt(client);
      const topicId = receipt.topicId.toString();
      
      topics[eventType.name] = topicId;
      console.log(`✅ ${eventType.name} Topic: ${topicId}`);
      
      // Wait between topic creations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Save topics to file
    const topicsInfo = {
      network: "testnet",
      created: new Date().toISOString(),
      topics
    };

    fs.writeFileSync("./hcs-topics.json", JSON.stringify(topicsInfo, null, 2));

    // Update frontend .env.local
    const envPath = path.join(__dirname, "../../frontend/.env.local");
    let envContent = fs.readFileSync(envPath, "utf8");
    
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_SUPPLY_TOPIC=.*/, `NEXT_PUBLIC_HCS_SUPPLY_TOPIC=${topics.SUPPLY}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=.*/, `NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=${topics.WITHDRAW}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_BORROW_TOPIC=.*/, `NEXT_PUBLIC_HCS_BORROW_TOPIC=${topics.BORROW}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_REPAY_TOPIC=.*/, `NEXT_PUBLIC_HCS_REPAY_TOPIC=${topics.REPAY}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=.*/, `NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=${topics.LIQUIDATION}`);
    
    fs.writeFileSync(envPath, envContent);

    console.log("\n✅ HCS Topics Created Successfully!");
    console.log("\n📋 Topic IDs:");
    Object.entries(topics).forEach(([name, topicId]) => {
      console.log(`   ${name}: ${topicId}`);
    });

    console.log("\n📄 Files Updated:");
    console.log("   - hcs-topics.json");
    console.log("   - frontend/.env.local");

    console.log("\n🔗 View on HashScan:");
    Object.entries(topics).forEach(([name, topicId]) => {
      console.log(`   ${name}: https://hashscan.io/testnet/topic/${topicId}`);
    });

  } catch (error) {
    console.error("❌ HCS Topic creation failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

if (require.main === module) {
  createHCSTopics()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = createHCSTopics;