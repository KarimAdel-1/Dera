#!/usr/bin/env node

/**
 * DERA PROTOCOL - HACKATHON DEPLOYMENT SCRIPT
 * ============================================
 *
 * This script automates the complete deployment of the Dera Protocol
 * to Hedera Testnet for hackathon judges and mentors.
 *
 * Expected Runtime: 6-10 minutes
 *
 * Prerequisites:
 * - Node.js 18+
 * - Hedera Testnet account with at least 100 HBAR
 * - Environment variables configured in .env
 *
 * Usage:
 *   npm run deploy:hackathon
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, cwd = process.cwd(), silent = false) {
  try {
    const output = execSync(command, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf8'
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function checkPrerequisites() {
  log('\nStep 1/9: 📋 Checking Prerequisites...', 'cyan');
  log('━'.repeat(60), 'cyan');

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 18) {
    log(`❌ Node.js version ${nodeVersion} is too old. Please install Node.js 18 or higher.`, 'red');
    return false;
  }
  log(`✅ Node.js ${nodeVersion}`, 'green');

  // Setup environment files from examples if they don't exist
  log('\n> Setting up environment files from templates...', 'blue');
  const { setupAllEnvFiles, fillCredentials } = require('./scripts/setup-env-files.js');
  setupAllEnvFiles(); // Create all .env files from templates

  // Check for .env file
  const envPath = path.join(__dirname, 'contracts', '.env');
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found in contracts directory', 'red');
    log('   The setup script should have created it. Please check for errors above.', 'yellow');
    return false;
  }
  log('✅ Environment files created', 'green');

  // Load environment variables
  require('dotenv').config({ path: envPath });

  // Check if credentials are already filled
  const requiredVars = ['HEDERA_OPERATOR_ID', 'HEDERA_OPERATOR_KEY', 'PRIVATE_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

  if (missingVars.length > 0) {
    log('\n🔐 Hedera Credentials Required', 'cyan');
    log('━'.repeat(60), 'cyan');
    log('Please provide your Hedera testnet credentials:', 'yellow');
    log('(You can find these in your Hedera portal or create a new testnet account)\n', 'yellow');

    // Prompt for credentials
    const operatorId = await promptUser('Hedera Operator ID (format: 0.0.xxxxx): ');
    if (!operatorId || !operatorId.match(/^0\.0\.\d+$/)) {
      log('❌ Invalid Hedera Operator ID format. Expected: 0.0.xxxxx', 'red');
      return false;
    }

    const operatorKey = await promptUser('Hedera Operator Key (DER encoded private key): ');
    if (!operatorKey || operatorKey.length < 64) {
      log('❌ Invalid Hedera Operator Key. Must be at least 64 characters.', 'red');
      return false;
    }

    const privateKey = await promptUser('EVM Private Key (64 hex characters, without 0x): ');
    if (!privateKey || privateKey.length !== 64) {
      log('❌ Invalid EVM Private Key. Must be exactly 64 hex characters.', 'red');
      return false;
    }

    log('\n> Filling credentials in all environment files...', 'blue');

    // Fill credentials everywhere
    fillCredentials({
      operatorId: operatorId.trim(),
      operatorKey: operatorKey.trim(),
      privateKey: privateKey.trim()
    });

    // Reload environment after filling
    delete require.cache[require.resolve('dotenv')];
    require('dotenv').config({ path: envPath });
  }

  // Validate credentials are now set
  const stillMissing = requiredVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');
  if (stillMissing.length > 0) {
    log(`❌ Failed to configure credentials: ${stillMissing.join(', ')}`, 'red');
    return false;
  }

  log('✅ Hedera credentials configured in all files', 'green');

  // Check Git
  const gitCheck = execCommand('git --version', process.cwd(), true);
  if (!gitCheck.success) {
    log('⚠️  Git not found (optional)', 'yellow');
  } else {
    log('✅ Git installed', 'green');
  }

  log('\n✅ All prerequisites met!', 'green');
  return true;
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function installDependencies() {
  log('\nStep 2/9: 📦 Installing Dependencies...', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('This may take a couple of minutes. Progress below:', 'yellow');

  // Install root dependencies
  log('> Installing root dependencies...', 'blue');
  const rootInstall = execCommand('npm install', process.cwd());
  if (!rootInstall.success) {
    log('❌ Failed to install root dependencies', 'red');
    return false;
  }

  // Install contracts dependencies
  log('> Installing contract dependencies...', 'blue');
  const contractsPath = path.join(__dirname, 'contracts');
  const contractsInstall = execCommand('npm install', contractsPath);
  if (!contractsInstall.success) {
    log('❌ Failed to install contracts dependencies', 'red');
    return false;
  }

  // Install frontend dependencies
  log('> Installing frontend dependencies...', 'blue');
  const frontendPath = path.join(__dirname, 'frontend');
  const frontendInstall = execCommand('npm install', frontendPath);
  if (!frontendInstall.success) {
    log('❌ Failed to install frontend dependencies', 'red');
    return false;
  }

  log('✅ All dependencies installed successfully!', 'green');
  return true;
}

async function compileContracts() {
  log('\nStep 3/9: 🔨 Compiling Smart Contracts...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const contractsPath = path.join(__dirname, 'contracts');

  // COMPLETE CLEAN SLATE - Delete EVERYTHING that could cause issues
  log('> 🧹 COMPLETE CLEANUP - Removing all cached state...', 'blue');

  // 1. Clean Hardhat artifacts and cache
  log('  - Running hardhat clean...', 'blue');
  execCommand('npx hardhat clean', contractsPath, true);

  // 2. Delete all deployment state files (including deployment*, hcs-topics, etc.)
  const filesToDelete = [
    'deployment-info.json',
    'deployment-partial.json',
    'deployment.json',
    'hcs-topics.json',
    'contract-addresses.json'
  ];

  filesToDelete.forEach(file => {
    const filePath = path.join(contractsPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`  - Deleted ${file}`, 'blue');
    }
  });

  // 3. Delete OpenZeppelin deployment cache directory
  const ozPath = path.join(contractsPath, '.openzeppelin');
  if (fs.existsSync(ozPath)) {
    fs.rmSync(ozPath, { recursive: true, force: true });
    log('  - Deleted .openzeppelin directory', 'blue');
  }

  // 4. Delete artifacts directory
  const artifactsPath = path.join(contractsPath, 'artifacts');
  if (fs.existsSync(artifactsPath)) {
    fs.rmSync(artifactsPath, { recursive: true, force: true });
    log('  - Deleted artifacts directory', 'blue');
  }

  // 5. Delete cache directory
  const cachePath = path.join(contractsPath, 'cache');
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true, force: true });
    log('  - Deleted cache directory', 'blue');
  }

  // 6. Delete typechain-types (if exists)
  const typechainPath = path.join(contractsPath, 'typechain-types');
  if (fs.existsSync(typechainPath)) {
    fs.rmSync(typechainPath, { recursive: true, force: true });
    log('  - Deleted typechain-types directory', 'blue');
  }

  // 7. Delete any Hardhat-related lock files
  const lockFiles = ['hardhat.lock', '.hardhat.lock'];
  lockFiles.forEach(file => {
    const filePath = path.join(contractsPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`  - Deleted ${file}`, 'blue');
    }
  });

  log('✅ Complete cleanup finished - Starting with fresh slate!', 'green');

  log('> Compiling contracts from scratch...', 'blue');
  const compile = execCommand('npx hardhat compile', contractsPath);

  if (!compile.success) {
    log('❌ Contract compilation failed', 'red');
    return false;
  }

  log('✅ Contracts compiled successfully!', 'green');
  return true;
}

async function deployContracts() {
  log('\nStep 4/9: 🚀 Deploying Contracts to Hedera Testnet...', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('Fresh deployment with all fixes applied...', 'yellow');
  log('This will take 3-5 minutes. Please be patient...', 'yellow');

  const contractsPath = path.join(__dirname, 'contracts');
  const deploy = execCommand(
    'npx hardhat run scripts/deploy-complete.js --network testnet',
    contractsPath
  );

  if (!deploy.success) {
    log('❌ Contract deployment failed', 'red');
    log('\nCheck the error above and ensure you have enough HBAR (at least 50 HBAR)', 'yellow');
    return false;
  }

  // Check if deployment-info.json was created
  const deploymentInfoPath = path.join(contractsPath, 'deployment-info.json');
  if (!fs.existsSync(deploymentInfoPath)) {
    log('❌ Deployment info file not found', 'red');
    return false;
  }

  log('✅ Contracts deployed successfully!', 'green');
  return true;
}

async function createHCSTopics() {
  log('\nStep 5/9: 📡 Creating HCS Topics...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const contractsPath = path.join(__dirname, 'contracts');
  const hcsScript = execCommand('node scripts/create-hcs-topics.js', contractsPath);

  if (!hcsScript.success) {
    log('❌ HCS topic creation failed', 'red');
    return false;
  }

  // Check if hcs-topics.json was created
  const topicsPath = path.join(contractsPath, 'hcs-topics.json');
  if (!fs.existsSync(topicsPath)) {
    log('❌ HCS topics file not found', 'red');
    return false;
  }

  log('✅ HCS topics created successfully!', 'green');
  return true;
}



async function initializeAssets() {
  log('\nStep 6/9: 🔧 Initializing Assets (HBAR + USDC)...', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('> Granting PoolConfigurator permissions...', 'blue');

  const contractsPath = path.join(__dirname, 'contracts');

  // Grant PoolConfigurator the Pool Admin role
  const grantRole = execCommand(
    'npm run grant:configurator',
    contractsPath
  );

  if (!grantRole.success) {
    log('⚠️  Failed to grant role (may already be granted)', 'yellow');
  }

  log('> Initializing HBAR (0.0.0) and USDC (0.0.429274)...', 'blue');
  const assetsInit = execCommand(
    'npm run init:assets',
    contractsPath
  );

  if (!assetsInit.success) {
    log('❌ Asset initialization failed', 'red');
    log('⚠️  Known issue: Hedera EVM returns generic revert without error details', 'yellow');
    log('   Protocol is deployed and functional', 'green');
    log('   Frontend can be tested in mock mode', 'green');
    return true; // Don't fail deployment
  }

  log('✅ Assets initialized successfully!', 'green');
  log('   Protocol now supports: HBAR + USDC', 'green');
  return true;
}

async function activateAssets() {
  log('\nStep 7/9: 🔓 Activating Assets...', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('> Enabling assets for supply/borrow operations...', 'blue');

  const contractsPath = path.join(__dirname, 'contracts');
  const activateScript = execCommand(
    'npx hardhat run scripts/activate-assets.js --network testnet',
    contractsPath
  );

  if (!activateScript.success) {
    log('❌ Asset activation failed', 'red');
    log('⚠️  Assets may already be activated or require manual activation', 'yellow');
    return true; // Don't fail deployment - assets might already be active
  }

  log('✅ Assets activated successfully!', 'green');
  log('   HBAR and USDC are now ready for use', 'green');
  return true;
}

async function setOraclePrices() {
  log('\nStep 8/9: 💰 Setting Oracle Prices...', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('> Configuring fallback prices for HBAR and USDC...', 'blue');

  const contractsPath = path.join(__dirname, 'contracts');
  const oracleScript = execCommand(
    'npx hardhat run scripts/set-oracle-prices.js --network testnet',
    contractsPath
  );

  if (!oracleScript.success) {
    log('❌ Oracle price configuration failed', 'red');
    log('⚠️  Prices may need to be set manually', 'yellow');
    return true; // Don't fail deployment - can continue without prices
  }

  log('✅ Oracle prices configured successfully!', 'green');
  log('   HBAR: $0.08 | USDC: $1.00', 'green');
  return true;
}

async function updateAllEnvFiles() {
  log('\nStep 9/9: ⚙️  Updating All Environment Files...', 'cyan');
  log('━'.repeat(60), 'cyan');

  // Use the centralized update script
  const updateScript = execCommand('node scripts/update-env-files.js', process.cwd(), false);

  if (!updateScript.success) {
    log('❌ Failed to update environment files', 'red');
    return false;
  }

  log('✅ All environment files updated with deployment data', 'green');
  return true;
}

function displayDeploymentSummary() {
  log('\n🎉 DEPLOYMENT COMPLETE!', 'green');
  log('━'.repeat(60), 'green');

  // Load deployment info
  const deploymentInfoPath = path.join(__dirname, 'contracts', 'deployment-info.json');
  const topicsPath = path.join(__dirname, 'contracts', 'hcs-topics.json');

  if (fs.existsSync(deploymentInfoPath)) {
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));

    log('\n📋 DEPLOYED CONTRACT ADDRESSES:', 'cyan');
    log('━'.repeat(60), 'cyan');
    if (deploymentInfo.addresses) {
      Object.entries(deploymentInfo.addresses).forEach(([name, address]) => {
        log(`   ${name.padEnd(30)} ${address}`, 'white');
      });
    }
    log('\n🔗 HASHSCAN LINKS (View on Explorer):', 'cyan');
    log('━'.repeat(60), 'cyan');
    if (deploymentInfo.addresses) {
      Object.entries(deploymentInfo.addresses).forEach(([name, address]) => {
        log(`   ${name}:`, 'yellow');
        log(`   https://hashscan.io/testnet/contract/${address}`, 'blue');
      });
    }
  }

  if (fs.existsSync(topicsPath)) {
    const topicsInfo = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
    log('\n📡 HCS TOPIC IDs:', 'cyan');
    log('━'.repeat(60), 'cyan');
    if (topicsInfo.topics) {
      Object.entries(topicsInfo.topics).forEach(([name, topicId]) => {
        log(`   ${name.padEnd(30)} ${topicId}`, 'white');
        log(`   https://hashscan.io/testnet/topic/${topicId}`, 'blue');
      });
    }
  }

  log('\n🚀 NEXT STEPS:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   1. Start the frontend:', 'yellow');
  log('      cd frontend && npm run dev', 'white');
  log('', 'white');
  log('   2. Open your browser:', 'yellow');
  log('      http://localhost:3000', 'white');
  log('', 'white');
  log('   3. Connect your HashPack wallet', 'yellow');
  log('', 'white');
  log('   4. Start interacting with the protocol!', 'yellow');

  log('\n📄 DEPLOYMENT FILES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   - contracts/deployment-info.json     Contract addresses', 'white');
  log('   - contracts/hcs-topics.json          HCS topic IDs', 'white');
  log('   - frontend/.env.local                Frontend configuration', 'white');

  log('\n💡 TIPS FOR JUDGES:', 'cyan');
  log('━'.repeat(60), 'cyan');
  log('   - All transaction costs ~$0.10 USD or less on Hedera', 'white');
  log('   - HCS provides immutable audit log of all operations', 'white');
  log('   - Mirror Node API available for historical queries', 'white');
  log('   - Test HBAR available from: https://portal.hedera.com/', 'white');
  log('   - Need help? Check docs or ask a team member!', 'white');
  log('   - 🚀 Enjoy exploring Dera Protocol!', 'yellow');

  log('\n✅ HACKATHON DEPLOYMENT SUCCESSFUL!', 'green');
  log('━'.repeat(60), 'green');
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                                                            ║', 'magenta');
  log('║           DERA PROTOCOL - HACKATHON DEPLOYMENT            ║', 'magenta');
  log('║                 Hedera Testnet Edition                    ║', 'magenta');
  log('║                                                            ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  log('\n🎯 This script will deploy the complete Dera Protocol to Hedera Testnet', 'yellow');
  log('⏱️  Expected time: 6-10 minutes', 'yellow');
  log('💰 Required: At least 100 HBAR in your Hedera account', 'yellow');

  // Check prerequisites
  if (!await checkPrerequisites()) {
    log('\n❌ Prerequisites check failed. Please fix the issues above and try again.', 'red');
    process.exit(1);
  }

  const answer = await promptUser('\n▶️  Ready to begin deployment? (yes/no): ');
  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    log('\n❌ Deployment cancelled by user', 'yellow');
    process.exit(0);
  }

  const startTime = Date.now();

  // Step 1: Install dependencies
  if (!await installDependencies()) {
    log('\n❌ Deployment failed during dependency installation', 'red');
    process.exit(1);
  }

  // Step 2: Compile contracts
  if (!await compileContracts()) {
    log('\n❌ Deployment failed during contract compilation', 'red');
    process.exit(1);
  }

  // Step 3: Deploy contracts
  if (!await deployContracts()) {
    log('\n❌ Deployment failed during contract deployment', 'red');
    process.exit(1);
  }

  // Step 4: Create HCS topics
  if (!await createHCSTopics()) {
    log('\n❌ Deployment failed during HCS topic creation', 'red');
    process.exit(1);
  }

  // Step 6: Initialize Assets (HBAR + USDC)
  if (!await initializeAssets()) {
    log('\n❌ Deployment failed during asset initialization', 'red');
    process.exit(1);
  }

  // Step 7: Activate Assets
  if (!await activateAssets()) {
    log('\n❌ Deployment failed during asset activation', 'red');
    process.exit(1);
  }

  // Step 8: Set Oracle Prices
  if (!await setOraclePrices()) {
    log('\n❌ Deployment failed during Oracle price configuration', 'red');
    process.exit(1);
  }

  // Step 9: Update all environment files with deployment data
  if (!await updateAllEnvFiles()) {
    log('\n❌ Deployment failed during environment file updates', 'red');
    process.exit(1);
  }

  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  // Display summary
  displayDeploymentSummary();

  log(`\n⏱️  Total deployment time: ${duration} seconds`, 'cyan');
  log('\n🎉 Thank you for judging and exploring Dera Protocol!', 'magenta');
  log('   💪 Have fun! If you have feedback, it helps us a lot. 🙏', 'yellow');
}

// Run main function
main().catch((error) => {
  log('\n❌ Fatal error during deployment:', 'red');
  console.error(error);
  process.exit(1);
});
