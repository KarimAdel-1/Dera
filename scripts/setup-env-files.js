#!/usr/bin/env node

/**
 * Environment Files Setup Utility
 *
 * Creates .env files from .env.example templates across the entire project
 * Preserves existing values and only fills in missing ones
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Create .env file from .env.example if it doesn't exist
 * @param {string} examplePath - Path to .env.example file
 * @param {string} targetPath - Path to target .env file
 * @param {string} description - Description for logging
 * @returns {boolean} - True if created or already exists
 */
function createEnvFromExample(examplePath, targetPath, description) {
  if (!fs.existsSync(examplePath)) {
    log(`  ⚠️  ${description}: Example file not found at ${examplePath}`, 'yellow');
    return false;
  }

  if (fs.existsSync(targetPath)) {
    log(`  ✓ ${description}: Already exists`, 'green');
    return true;
  }

  try {
    fs.copyFileSync(examplePath, targetPath);
    log(`  ✅ ${description}: Created from template`, 'green');
    return true;
  } catch (error) {
    log(`  ❌ ${description}: Failed to create - ${error.message}`, 'red');
    return false;
  }
}

/**
 * Fill Hedera credentials in all relevant .env files
 * @param {object} credentials - { operatorId, operatorKey, privateKey }
 */
function fillCredentials(credentials) {
  const rootDir = path.join(__dirname, '..');
  const { operatorId, operatorKey, privateKey } = credentials;

  log('\n🔐 Filling Hedera Credentials...', 'cyan');

  const filesToUpdate = [
    { path: path.join(rootDir, 'contracts', '.env'), vars: { HEDERA_OPERATOR_ID: operatorId, HEDERA_OPERATOR_KEY: operatorKey, PRIVATE_KEY: privateKey } },
    { path: path.join(rootDir, 'backend', 'hcs-event-service', '.env'), vars: { HEDERA_OPERATOR_ID: operatorId, HEDERA_OPERATOR_KEY: operatorKey } },
    { path: path.join(rootDir, 'backend', 'liquidation-bot', '.env'), vars: { HEDERA_OPERATOR_ID: operatorId, HEDERA_OPERATOR_KEY: operatorKey, LIQUIDATOR_PRIVATE_KEY: privateKey } },
    { path: path.join(rootDir, 'backend', 'monitoring-service', '.env'), vars: { HEDERA_OPERATOR_ID: operatorId, HEDERA_OPERATOR_KEY: operatorKey } },
    { path: path.join(rootDir, 'backend', 'node-staking-service', '.env'), vars: { HEDERA_OPERATOR_ID: operatorId, HEDERA_OPERATOR_KEY: operatorKey } },
    { path: path.join(rootDir, 'backend', 'rate-updater-service', '.env'), vars: { HEDERA_ACCOUNT_ID: operatorId, HEDERA_PRIVATE_KEY: operatorKey } },
  ];

  filesToUpdate.forEach(({ path: filePath, vars }) => {
    if (!fs.existsSync(filePath)) {
      log(`  ⚠️  File not found: ${filePath}`, 'yellow');
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'gm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`);
      } else {
        content += `\n${key}=${value}`;
      }
    });

    fs.writeFileSync(filePath, content);
    log(`  ✅ Updated: ${filePath}`, 'green');
  });

  log('✅ Credentials filled in all files!', 'green');
}

/**
 * Setup environment files across the project
 * @param {object} credentials - Optional credentials to fill
 */
function setupAllEnvFiles(credentials = null) {
  log('\n📝 Setting Up Environment Files...', 'cyan');
  log('━'.repeat(60), 'cyan');

  const rootDir = path.join(__dirname, '..');
  let successCount = 0;
  let totalCount = 0;

  // 1. Root .env
  log('\n1. Root Environment:', 'cyan');
  totalCount++;
  if (createEnvFromExample(
    path.join(rootDir, '.env.deployment.example'),
    path.join(rootDir, '.env'),
    'Root .env'
  )) {
    successCount++;
  }

  // 2. Contracts .env
  log('\n2. Contracts Environment:', 'cyan');
  totalCount++;
  if (createEnvFromExample(
    path.join(rootDir, 'contracts', '.env.example'),
    path.join(rootDir, 'contracts', '.env'),
    'Contracts .env'
  )) {
    successCount++;
  }

  // 3. Frontend .env.local
  log('\n3. Frontend Environment:', 'cyan');
  totalCount++;
  if (createEnvFromExample(
    path.join(rootDir, 'frontend', '.env.example'),
    path.join(rootDir, 'frontend', '.env.local'),
    'Frontend .env.local'
  )) {
    successCount++;
  }

  // 4. Backend Services .env
  log('\n4. Backend Services Environments:', 'cyan');
  const backendDir = path.join(rootDir, 'backend');

  if (fs.existsSync(backendDir)) {
    const services = fs.readdirSync(backendDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    services.forEach(service => {
      const serviceDir = path.join(backendDir, service);
      const examplePath = path.join(serviceDir, '.env.example');
      const targetPath = path.join(serviceDir, '.env');

      totalCount++;
      if (createEnvFromExample(
        examplePath,
        targetPath,
        `${service}/.env`
      )) {
        successCount++;
      }
    });
  } else {
    log('  ⚠️  Backend directory not found', 'yellow');
  }

  // Summary
  log('\n━'.repeat(60), 'cyan');
  log(`\n✅ Environment Files Setup Complete!`, 'green');
  log(`   Created/Verified: ${successCount}/${totalCount} files`, 'cyan');

  if (successCount < totalCount) {
    log(`\n⚠️  ${totalCount - successCount} files had issues - check warnings above`, 'yellow');
  }

  // Fill credentials if provided
  if (credentials) {
    fillCredentials(credentials);
  } else {
    log('\n📝 Next Steps:', 'cyan');
    log('   1. Fill in your credentials in contracts/.env:', 'white');
    log('      - HEDERA_OPERATOR_ID', 'white');
    log('      - HEDERA_OPERATOR_KEY', 'white');
    log('      - PRIVATE_KEY', 'white');
    log('   2. (Optional) Configure Supabase in frontend/.env.local', 'white');
    log('   3. Run: npm run deploy:hackathon', 'white');
  }
  log('');

  return successCount === totalCount;
}

// Run if executed directly
if (require.main === module) {
  const success = setupAllEnvFiles();
  process.exit(success ? 0 : 1);
}

module.exports = { setupAllEnvFiles, createEnvFromExample, fillCredentials };
