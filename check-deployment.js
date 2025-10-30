#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function checkDeploymentStatus() {
  console.log('🔍 Dera Protocol Deployment Status Check\n');

  const checks = [
    {
      name: 'Environment Configuration',
      files: [
        { path: 'contracts/.env', description: 'Contract deployment config' },
        { path: 'frontend/.env.local', description: 'Frontend configuration' }
      ]
    },
    {
      name: 'Contract Deployment',
      files: [
        { path: 'contracts/deployment-info.json', description: 'Deployed contract addresses' },
        { path: 'contracts/hcs-topics.json', description: 'HCS topic IDs' }
      ]
    },
    {
      name: 'Dependencies',
      files: [
        { path: 'contracts/node_modules', description: 'Contract dependencies' },
        { path: 'frontend/node_modules', description: 'Frontend dependencies' }
      ]
    },
    {
      name: 'Build Artifacts',
      files: [
        { path: 'contracts/artifacts', description: 'Compiled contracts' },
        { path: 'frontend/.next', description: 'Built frontend' }
      ]
    }
  ];

  let allGood = true;

  checks.forEach(check => {
    console.log(`📋 ${check.name}:`);
    
    check.files.forEach(file => {
      const exists = fs.existsSync(path.join(__dirname, file.path));
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${file.description}`);
      
      if (!exists) allGood = false;
    });
    
    console.log('');
  });

  // Check if contracts are deployed
  const deploymentInfoPath = path.join(__dirname, 'contracts', 'deployment-info.json');
  if (fs.existsSync(deploymentInfoPath)) {
    console.log('📊 Deployed Contracts:');
    try {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));
      Object.entries(deploymentInfo.addresses || {}).forEach(([name, address]) => {
        console.log(`   🔗 ${name}: ${address}`);
        console.log(`      https://hashscan.io/testnet/contract/${address}`);
      });
      console.log('');
    } catch (e) {
      console.log('   ❌ Could not read deployment info');
    }
  }

  // Check HCS topics
  const hcsTopicsPath = path.join(__dirname, 'contracts', 'hcs-topics.json');
  if (fs.existsSync(hcsTopicsPath)) {
    console.log('📡 HCS Topics:');
    try {
      const topicsInfo = JSON.parse(fs.readFileSync(hcsTopicsPath, 'utf8'));
      Object.entries(topicsInfo.topics || {}).forEach(([name, topicId]) => {
        console.log(`   📻 ${name}: ${topicId}`);
        console.log(`      https://hashscan.io/testnet/topic/${topicId}`);
      });
      console.log('');
    } catch (e) {
      console.log('   ❌ Could not read HCS topics info');
    }
  }

  // Summary
  console.log('=' .repeat(50));
  if (allGood) {
    console.log('🎉 Deployment Status: COMPLETE');
    console.log('\n🚀 Ready to use:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Run: cd frontend && npm run dev');
  } else {
    console.log('⚙️  Deployment Status: IN PROGRESS');
    console.log('\n🔧 Next steps:');
    console.log('   1. Run: npm run setup (if environment not configured)');
    console.log('   2. Run: npm run deploy (for full deployment)');
    console.log('   3. Or run individual steps as needed');
  }

  return allGood;
}

if (require.main === module) {
  checkDeploymentStatus();
}

module.exports = checkDeploymentStatus;