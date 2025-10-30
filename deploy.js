#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  console.log(`\n🔧 Running: ${command}`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env }
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

async function deploy() {
  console.log('🚀 Dera Protocol Complete Deployment\n');

  try {
    // Check if environment is set up
    const contractsEnvPath = path.join(__dirname, 'contracts', '.env');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env.local');

    if (!fs.existsSync(contractsEnvPath) || !fs.existsSync(frontendEnvPath)) {
      console.log('⚙️  Setting up environment...');
      runCommand('node setup-environment.js');
    }

    // Install dependencies
    console.log('\n📦 Installing contract dependencies...');
    runCommand('npm install', path.join(__dirname, 'contracts'));

    // Add Hedera SDK for HCS topics
    console.log('\n📦 Installing Hedera SDK...');
    runCommand('npm install @hashgraph/sdk', path.join(__dirname, 'contracts'));

    // Compile contracts
    console.log('\n🔨 Compiling contracts...');
    runCommand('npx hardhat compile', path.join(__dirname, 'contracts'));

    // Deploy contracts
    console.log('\n🚀 Deploying contracts to Hedera Testnet...');
    runCommand('npx hardhat run scripts/deploy-complete.js --network testnet', path.join(__dirname, 'contracts'));

    // Create HCS topics
    console.log('\n📡 Creating HCS topics...');
    runCommand('node scripts/create-hcs-topics.js', path.join(__dirname, 'contracts'));

    // Install frontend dependencies
    console.log('\n📦 Installing frontend dependencies...');
    runCommand('npm install', path.join(__dirname, 'frontend'));

    // Build frontend
    console.log('\n🏗️  Building frontend...');
    runCommand('npm run build', path.join(__dirname, 'frontend'));

    console.log('\n🎉 Deployment Complete!');
    console.log('\n🚀 To start the frontend:');
    console.log('   cd frontend');
    console.log('   npm run dev');
    console.log('   Open http://localhost:3000');

    console.log('\n📄 Check these files for deployment info:');
    console.log('   - contracts/deployment-info.json');
    console.log('   - contracts/hcs-topics.json');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check your Hedera account has sufficient HBAR (50+ recommended)');
    console.log('   2. Verify your private key and account ID are correct');
    console.log('   3. Ensure you have internet connection');
    console.log('   4. Check contracts/deployment-partial.json for partial deployment info');
    process.exit(1);
  }
}

deploy();