const fs = require('fs');
const path = require('path');

/**
 * Check bytecode sizes of all compiled contracts
 * Helps identify contracts that might exceed Hedera's deployment limits
 */

const HEDERA_SIZE_LIMIT = 24576; // 24KB standard limit
const HEDERA_HARD_LIMIT = 49152; // 48KB absolute limit

function findContractArtifacts(dir, contracts = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and build_info
      if (file !== 'node_modules' && file !== 'build-info') {
        findContractArtifacts(filePath, contracts);
      }
    } else if (file.endsWith('.json') && !file.includes('.dbg.')) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (content.bytecode && content.contractName) {
          contracts.push({
            name: content.contractName,
            path: filePath.replace(process.cwd() + '/', ''),
            bytecode: content.bytecode
          });
        }
      } catch (e) {
        // Skip invalid JSON files
      }
    }
  }

  return contracts;
}

async function main() {
  console.log('\n📊 Contract Bytecode Size Analysis\n');
  console.log('━'.repeat(80));

  const artifactsDir = path.join(__dirname, '../artifacts');

  if (!fs.existsSync(artifactsDir)) {
    console.log('❌ No artifacts found. Run `npx hardhat compile` first.');
    process.exit(1);
  }

  const contracts = findContractArtifacts(artifactsDir);

  if (contracts.length === 0) {
    console.log('❌ No contract artifacts found.');
    process.exit(1);
  }

  // Calculate sizes and sort by size descending
  const contractSizes = contracts.map(contract => {
    const bytecodeSize = (contract.bytecode.length - 2) / 2; // Remove '0x' prefix
    return {
      ...contract,
      size: bytecodeSize,
      sizeKB: (bytecodeSize / 1024).toFixed(2),
      exceedsStandard: bytecodeSize > HEDERA_SIZE_LIMIT,
      exceedsHard: bytecodeSize > HEDERA_HARD_LIMIT
    };
  }).sort((a, b) => b.size - a.size);

  // Display results
  console.log('Contract Name'.padEnd(40) + 'Size'.padEnd(15) + 'Status');
  console.log('━'.repeat(80));

  let hasWarnings = false;
  let hasErrors = false;

  for (const contract of contractSizes) {
    let status = '✅ OK';
    if (contract.exceedsHard) {
      status = '❌ TOO LARGE (>48KB)';
      hasErrors = true;
    } else if (contract.exceedsStandard) {
      status = '⚠️  LARGE (>24KB)';
      hasWarnings = true;
    }

    const namePart = contract.name.padEnd(40);
    const sizePart = `${contract.sizeKB} KB`.padEnd(15);

    console.log(`${namePart}${sizePart}${status}`);
  }

  console.log('━'.repeat(80));

  // Summary
  const tooLarge = contractSizes.filter(c => c.exceedsHard);
  const large = contractSizes.filter(c => c.exceedsStandard && !c.exceedsHard);

  console.log('\n📋 Summary:');
  console.log(`   Total contracts: ${contractSizes.length}`);
  console.log(`   ✅ Within limits: ${contractSizes.length - large.length - tooLarge.length}`);

  if (large.length > 0) {
    console.log(`   ⚠️  Large (24-48KB): ${large.length}`);
    large.forEach(c => console.log(`      - ${c.name} (${c.sizeKB} KB)`));
  }

  if (tooLarge.length > 0) {
    console.log(`   ❌ Too large (>48KB): ${tooLarge.length}`);
    tooLarge.forEach(c => console.log(`      - ${c.name} (${c.sizeKB} KB)`));
  }

  // Check specific contracts
  console.log('\n🔍 Key Contracts:');
  const keyContracts = ['DeraPoolConfigurator', 'DeraPool', 'PoolConfigurator', 'ConfiguratorLogic'];
  for (const name of keyContracts) {
    const contract = contractSizes.find(c => c.name === name);
    if (contract) {
      let icon = '✅';
      if (contract.exceedsHard) icon = '❌';
      else if (contract.exceedsStandard) icon = '⚠️';
      console.log(`   ${icon} ${name}: ${contract.sizeKB} KB`);
    }
  }

  console.log('\n💡 Notes:');
  console.log('   - Hedera standard limit: 24KB');
  console.log('   - Hedera hard limit: 48KB');
  console.log('   - Use viaIR compiler to reduce stack depth (may increase size)');
  console.log('   - Consider splitting large contracts or using libraries\n');

  if (hasErrors) {
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
