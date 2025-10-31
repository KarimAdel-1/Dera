const { Client, TopicCreateTransaction, PrivateKey } = require('@hashgraph/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create real HCS topics using Hedera SDK
async function createRealHCSTopics() {
  console.log("🚀 Creating Real HCS Topics using Hedera SDK\n");

  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;

  if (!operatorId || !operatorKey) {
    console.error("❌ Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY");
    process.exit(1);
  }

  try {
    // Create Hedera client
    const client = Client.forTestnet();
    const operatorPrivateKey = PrivateKey.fromString(operatorKey);
    client.setOperator(operatorId, operatorPrivateKey);
    
    console.log(`📍 Using operator account: ${operatorId}`);
    console.log("📍 Creating 5 HCS topics...\n");
    
    const topicNames = ['SUPPLY', 'WITHDRAW', 'BORROW', 'REPAY', 'LIQUIDATION'];
    const topics = {};
    
    for (const topicName of topicNames) {
      console.log(`📍 Creating ${topicName} topic...`);
      
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(`Dera Protocol ${topicName} Events`)
        .setAdminKey(operatorPrivateKey.publicKey)
        .setSubmitKey(operatorPrivateKey.publicKey);
      
      const response = await transaction.execute(client);
      const receipt = await response.getReceipt(client);
      const topicId = receipt.topicId.toString();
      
      topics[topicName] = topicId;
      console.log(`✅ ${topicName} topic created: ${topicId}`);
    }
    
    client.close();
    console.log("\n✅ All HCS topics created successfully!");

    const topicsInfo = {
      network: "testnet",
      created: new Date().toISOString(),
      topics,
      note: "Real HCS topics created via Hedera SDK"
    };

    // Save topics to file
    fs.writeFileSync("./hcs-topics.json", JSON.stringify(topicsInfo, null, 2));
    
    // Update environment files
    updateEnvironmentFiles(topics);

    console.log("✅ HCS Topic Configuration Complete!");
    console.log("\n📋 Topic IDs:");
    Object.entries(topics).forEach(([name, topicId]) => {
      console.log(`   ${name}: ${topicId}`);
    });

    console.log("\n📄 Files Updated:");
    console.log("   - hcs-topics.json");
    console.log("   - .env (root)");
    console.log("   - frontend/.env.local");

    console.log("\n🔗 View on HashScan (when topics are created):");
    Object.entries(topics).forEach(([name, topicId]) => {
      console.log(`   ${name}: https://hashscan.io/testnet/topic/${topicId}`);
    });

  } catch (error) {
    console.error("❌ Failed to create HCS topics:", error.message);
    console.log("\n⚠️  Falling back to mock topic IDs for development...");
    
    const baseTopicId = 7070200;
    const topics = {
      SUPPLY: `0.0.${baseTopicId}`,
      WITHDRAW: `0.0.${baseTopicId + 1}`,
      BORROW: `0.0.${baseTopicId + 2}`,
      REPAY: `0.0.${baseTopicId + 3}`,
      LIQUIDATION: `0.0.${baseTopicId + 4}`
    };
    
    const topicsInfo = {
      network: "testnet",
      created: new Date().toISOString(),
      topics,
      note: "Mock topic IDs - SDK creation failed"
    };
    
    // Save topics to file
    fs.writeFileSync("./hcs-topics.json", JSON.stringify(topicsInfo, null, 2));
    
    // Update environment files
    updateEnvironmentFiles(topics);
    
    console.log("\n✅ Mock HCS topics configured!");
    console.log("\n💡 To create real topics:");
    console.log("   1. Ensure sufficient HBAR balance (>10 HBAR)");
    console.log("   2. Check network connectivity");
    console.log("   3. Verify operator credentials");
  }
}

function updateEnvironmentFiles(topics) {
  // Update root .env
  const rootEnvPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(rootEnvPath)) {
    let rootEnvContent = fs.readFileSync(rootEnvPath, "utf8");
    
    rootEnvContent = rootEnvContent.replace(/HCS_SUPPLY_TOPIC=.*/, `HCS_SUPPLY_TOPIC=${topics.SUPPLY}`);
    rootEnvContent = rootEnvContent.replace(/HCS_WITHDRAW_TOPIC=.*/, `HCS_WITHDRAW_TOPIC=${topics.WITHDRAW}`);
    rootEnvContent = rootEnvContent.replace(/HCS_BORROW_TOPIC=.*/, `HCS_BORROW_TOPIC=${topics.BORROW}`);
    rootEnvContent = rootEnvContent.replace(/HCS_REPAY_TOPIC=.*/, `HCS_REPAY_TOPIC=${topics.REPAY}`);
    rootEnvContent = rootEnvContent.replace(/HCS_LIQUIDATION_TOPIC=.*/, `HCS_LIQUIDATION_TOPIC=${topics.LIQUIDATION}`);
    
    fs.writeFileSync(rootEnvPath, rootEnvContent);
  }

  // Update frontend .env.local
  const envPath = path.join(__dirname, "../../frontend/.env.local");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_SUPPLY_TOPIC=.*/, `NEXT_PUBLIC_HCS_SUPPLY_TOPIC=${topics.SUPPLY}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=.*/, `NEXT_PUBLIC_HCS_WITHDRAW_TOPIC=${topics.WITHDRAW}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_BORROW_TOPIC=.*/, `NEXT_PUBLIC_HCS_BORROW_TOPIC=${topics.BORROW}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_REPAY_TOPIC=.*/, `NEXT_PUBLIC_HCS_REPAY_TOPIC=${topics.REPAY}`);
    envContent = envContent.replace(/NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=.*/, `NEXT_PUBLIC_HCS_LIQUIDATION_TOPIC=${topics.LIQUIDATION}`);
    
    fs.writeFileSync(envPath, envContent);
  }
}

if (require.main === module) {
  createRealHCSTopics()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = createRealHCSTopics;