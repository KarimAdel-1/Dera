const { ethers } = require("hardhat");
const fs = require("fs");

async function verifyDeployment() {
  console.log("🔍 Verifying Dera Protocol Deployment\n");

  try {
    // Check if deployment info exists
    if (!fs.existsSync("./deployment-info.json")) {
      console.error("❌ No deployment info found. Run deployment first.");
      return false;
    }

    const deploymentInfo = JSON.parse(fs.readFileSync("./deployment-info.json", "utf8"));
    const addresses = deploymentInfo.addresses;

    console.log("📋 Checking deployed contracts...\n");

    // Verify each contract
    const contracts = [
      { name: "Pool", address: addresses.POOL, factory: "Pool" },
      { name: "Oracle", address: addresses.ORACLE, factory: "DeraOracle" },
      { name: "Multi-Asset Staking", address: addresses.MULTI_ASSET_STAKING, factory: "DeraMultiAssetStaking" },
      { name: "Analytics", address: addresses.ANALYTICS, factory: "DeraMirrorNodeAnalytics" }
    ];

    let allValid = true;

    for (const contract of contracts) {
      try {
        console.log(`🔍 Checking ${contract.name}...`);
        
        // Get contract instance
        const contractInstance = await ethers.getContractAt(contract.factory, contract.address);
        
        // Try to call a view function to verify it's deployed
        const code = await ethers.provider.getCode(contract.address);
        
        if (code === "0x") {
          console.log(`❌ ${contract.name}: No contract code found`);
          allValid = false;
        } else {
          console.log(`✅ ${contract.name}: Contract verified at ${contract.address}`);
          
          // Additional checks for specific contracts
          if (contract.factory === "Pool") {
            try {
              const addressesProvider = await contractInstance.ADDRESSES_PROVIDER();
              console.log(`   📍 Addresses Provider: ${addressesProvider}`);
            } catch (e) {
              console.log(`   ⚠️  Could not read addresses provider`);
            }
          }
          
          if (contract.factory === "DeraMultiAssetStaking") {
            try {
              const poolAddress = await contractInstance.pool();
              console.log(`   📍 Pool Address: ${poolAddress}`);
            } catch (e) {
              console.log(`   ⚠️  Could not read pool address`);
            }
          }
        }
        
      } catch (error) {
        console.log(`❌ ${contract.name}: Verification failed - ${error.message}`);
        allValid = false;
      }
    }

    // Check HCS topics if they exist
    if (fs.existsSync("./hcs-topics.json")) {
      console.log("\n📡 Checking HCS Topics...");
      const topicsInfo = JSON.parse(fs.readFileSync("./hcs-topics.json", "utf8"));
      
      Object.entries(topicsInfo.topics).forEach(([name, topicId]) => {
        console.log(`✅ ${name} Topic: ${topicId}`);
        console.log(`   🔗 View: https://hashscan.io/testnet/topic/${topicId}`);
      });
    }

    // Check frontend configuration
    console.log("\n🖥️  Checking Frontend Configuration...");
    const frontendEnvPath = "../frontend/.env.local";
    
    if (fs.existsSync(frontendEnvPath)) {
      const envContent = fs.readFileSync(frontendEnvPath, "utf8");
      
      const requiredVars = [
        "NEXT_PUBLIC_POOL_ADDRESS",
        "NEXT_PUBLIC_ORACLE_ADDRESS",
        "NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS"
      ];
      
      let frontendConfigured = true;
      
      for (const varName of requiredVars) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match && match[1] && match[1] !== "") {
          console.log(`✅ ${varName}: ${match[1]}`);
        } else {
          console.log(`❌ ${varName}: Not configured`);
          frontendConfigured = false;
        }
      }
      
      if (frontendConfigured) {
        console.log("✅ Frontend configuration complete");
      } else {
        console.log("⚠️  Frontend configuration incomplete");
        allValid = false;
      }
    } else {
      console.log("❌ Frontend .env.local not found");
      allValid = false;
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    if (allValid) {
      console.log("🎉 Deployment Verification: PASSED");
      console.log("\n✅ All contracts deployed and verified");
      console.log("✅ Frontend configured correctly");
      console.log("\n🚀 Ready to start frontend:");
      console.log("   cd ../frontend && npm run dev");
    } else {
      console.log("❌ Deployment Verification: FAILED");
      console.log("\n🔧 Issues found. Please check the errors above.");
    }

    return allValid;

  } catch (error) {
    console.error("❌ Verification failed:", error);
    return false;
  }
}

if (require.main === module) {
  verifyDeployment()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = verifyDeployment;