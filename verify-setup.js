#!/usr/bin/env node

/**
 * DERA PROTOCOL - PRE-DEPLOYMENT VERIFICATION SCRIPT
 * ===================================================
 *
 * This script verifies that all necessary files and configurations
 * are in place before deploying the Dera Protocol.
 *
 * Usage:
 *   npm run verify-setup
 *   or
 *   node verify-setup.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`  ✅ ${description}`, 'green');
  } else {
    log(`  ❌ ${description} - NOT FOUND`, 'red');
  }
  return exists;
}

function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    log(`  ✅ Node.js ${nodeVersion} (>= 18 required)`, 'green');
    return true;
  } else {
    log(`  ❌ Node.js ${nodeVersion} - Version 18+ required`, 'red');
    return false;
  }
}

function checkEnvVariables() {
  const envPath = path.join(__dirname, 'contracts', '.env');

  if (!fs.existsSync(envPath)) {
    log(`  ⚠️  .env file not found - copy .env.example to .env`, 'yellow');
    return false;
  }

  require('dotenv').config({ path: envPath });

  const requiredVars = [
    'HEDERA_OPERATOR_ID',
    'HEDERA_OPERATOR_KEY',
    'PRIVATE_KEY'
  ];

  let allPresent = true;

  for (const varName of requiredVars) {
    if (process.env[varName] && process.env[varName].length > 0) {
      log(`  ✅ ${varName} is set`, 'green');
    } else {
      log(`  ❌ ${varName} is missing`, 'red');
      allPresent = false;
    }
  }

  return allPresent;
}

function checkCommand(command, description) {
  try {
    execSync(`${command} --version`, { stdio: 'pipe', encoding: 'utf8' });
    log(`  ✅ ${description} installed`, 'green');
    return true;
  } catch (error) {
    log(`  ⚠️  ${description} not found (optional)`, 'yellow');
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║                                                            ║', 'magenta');
  log('║         DERA PROTOCOL - PRE-DEPLOYMENT VERIFICATION       ║', 'magenta');
  log('║                                                            ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');

  let allChecks = true;

  // Check 1: Node.js version
  log('\n📋 1/7 Checking Node.js version...', 'cyan');
  if (!checkNodeVersion()) {
    allChecks = false;
  }

  // Check 2: Directory structure
  log('\n📂 2/7 Checking directory structure...', 'cyan');
  const requiredDirs = [
    ['contracts', 'Contracts directory'],
    ['frontend', 'Frontend directory'],
    ['backend', 'Backend directory'],
    ['contracts/contracts', 'Solidity contracts directory'],
    ['contracts/scripts', 'Deployment scripts directory']
  ];

  for (const [dir, desc] of requiredDirs) {
    if (!checkExists(path.join(__dirname, dir), desc)) {
      allChecks = false;
    }
  }

  // Check 3: Deployment scripts
  log('\n📜 3/7 Checking deployment scripts...', 'cyan');
  const requiredScripts = [
    ['deploy-hackathon.js', 'Hackathon deployment script'],
    ['quick-deploy.sh', 'Quick deployment script'],
    ['contracts/scripts/deploy-complete.js', 'Core deployment script'],
    ['contracts/scripts/create-hcs-topics.js', 'HCS topic creation script']
  ];

  for (const [script, desc] of requiredScripts) {
    if (!checkExists(path.join(__dirname, script), desc)) {
      allChecks = false;
    }
  }

  // Check 4: Configuration files
  log('\n⚙️  4/7 Checking configuration files...', 'cyan');
  const requiredConfigs = [
    ['contracts/.env.example', 'Contracts .env.example'],
    ['frontend/.env.example', 'Frontend .env.example'],
    ['contracts/hardhat.config.js', 'Hardhat configuration'],
    ['package.json', 'Root package.json']
  ];

  for (const [config, desc] of requiredConfigs) {
    if (!checkExists(path.join(__dirname, config), desc)) {
      allChecks = false;
    }
  }

  // Check 5: Environment variables
  log('\n🔐 5/7 Checking environment variables...', 'cyan');
  if (!checkEnvVariables()) {
    allChecks = false;
  }

  // Check 6: Package dependencies
  log('\n📦 6/7 Checking package dependencies...', 'cyan');

  const packageChecks = [
    ['node_modules', 'Root dependencies'],
    ['contracts/node_modules', 'Contract dependencies'],
    ['frontend/node_modules', 'Frontend dependencies']
  ];

  for (const [dir, desc] of packageChecks) {
    const fullPath = path.join(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      log(`  ✅ ${desc} installed`, 'green');
    } else {
      log(`  ⚠️  ${desc} not installed - run npm install`, 'yellow');
    }
  }

  // Check 7: Optional tools
  log('\n🔧 7/7 Checking optional tools...', 'cyan');
  checkCommand('git', 'Git');
  checkCommand('gh', 'GitHub CLI');

  // Final summary
  log('\n' + '━'.repeat(60), 'cyan');

  if (allChecks) {
    log('\n✅ ALL CHECKS PASSED!', 'green');
    log('\n🚀 You are ready to deploy. Run:', 'cyan');
    log('   npm run deploy:hackathon', 'yellow');
    log('\n   or', 'cyan');
    log('   ./quick-deploy.sh', 'yellow');
  } else {
    log('\n❌ SOME CHECKS FAILED', 'red');
    log('\n📝 Please fix the issues above before deploying.', 'yellow');
    log('\n🔧 Quick fixes:', 'cyan');
    log('   1. Install dependencies: npm run install:all', 'white');
    log('   2. Configure environment: cp contracts/.env.example contracts/.env', 'white');
    log('   3. Edit contracts/.env with your credentials', 'white');
  }

  log('\n📚 Documentation:', 'cyan');
  log('   - README.md - Complete deployment guide', 'white');
  log('   - contracts/.env.example - Configuration template', 'white');

  log('\n' + '━'.repeat(60), 'cyan');

  process.exit(allChecks ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
