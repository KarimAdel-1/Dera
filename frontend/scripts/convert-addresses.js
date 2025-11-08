#!/usr/bin/env node
/**
 * Convert EVM contract addresses to Hedera format (0.0.X)
 * by querying the Hedera Mirror Node
 */

const fs = require('fs');
const path = require('path');

const MIRROR_NODE_URL = process.env.NEXT_PUBLIC_MIRROR_NODE_URL || 'https://testnet.mirrornode.hedera.com';

async function getHederaIdFromEVM(evmAddress) {
  try {
    console.log(`🔍 Querying mirror node for ${evmAddress}...`);

    // Query mirror node API for contract by EVM address
    const response = await fetch(`${MIRROR_NODE_URL}/api/v1/contracts/${evmAddress}`);

    if (!response.ok) {
      throw new Error(`Mirror node returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.contract_id) {
      console.log(`✅ Found Hedera ID: ${data.contract_id}`);
      return data.contract_id;
    }

    throw new Error('Contract ID not found in response');
  } catch (error) {
    console.error(`❌ Error querying ${evmAddress}:`, error.message);
    return null;
  }
}

async function convertDeploymentAddresses() {
  const deploymentInfoPath = path.join(__dirname, '../../contracts/deployment-info.json');

  if (!fs.existsSync(deploymentInfoPath)) {
    console.error('❌ deployment-info.json not found at:', deploymentInfoPath);
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, 'utf8'));

  console.log('📝 Converting contract addresses from EVM to Hedera format...\n');

  const hederaAddresses = {};

  for (const [name, evmAddress] of Object.entries(deploymentInfo.addresses)) {
    const hederaId = await getHederaIdFromEVM(evmAddress);

    if (hederaId) {
      hederaAddresses[name] = hederaId;
    } else {
      console.warn(`⚠️  Could not convert ${name}: ${evmAddress}`);
      hederaAddresses[name] = evmAddress; // Keep EVM address as fallback
    }

    // Rate limit to avoid overwhelming the mirror node
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate .env.local file
  const envPath = path.join(__dirname, '../.env.local');

  let envContent = `# Auto-generated from deployment-info.json
# Contract addresses in Hedera format (0.0.X)
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Contract Addresses (Hedera Format)
`;

  const addressMapping = {
    'POOL': 'NEXT_PUBLIC_POOL_ADDRESS',
    'ORACLE': 'NEXT_PUBLIC_ORACLE_ADDRESS',
    'ANALYTICS': 'NEXT_PUBLIC_ANALYTICS_ADDRESS',
    'MULTI_ASSET_STAKING': 'NEXT_PUBLIC_MULTI_ASSET_STAKING_ADDRESS',
    'POOL_CONFIGURATOR': 'NEXT_PUBLIC_POOL_CONFIGURATOR',
    'POOL_ADDRESSES_PROVIDER': 'NEXT_PUBLIC_POOL_ADDRESSES_PROVIDER',
    'ACL_MANAGER': 'NEXT_PUBLIC_ACL_MANAGER',
    'RATE_STRATEGY': 'NEXT_PUBLIC_RATE_STRATEGY'
  };

  for (const [contractName, envVar] of Object.entries(addressMapping)) {
    if (hederaAddresses[contractName]) {
      envContent += `${envVar}=${hederaAddresses[contractName]}\n`;
    }
  }

  // Add other env variables from .env.example if they exist
  const envExamplePath = path.join(__dirname, '../.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');

    // Extract HCS topics and other variables
    const hcsTopicMatch = envExample.match(/# HCS Topic IDs[\s\S]*?(?=\n\n|$)/);
    if (hcsTopicMatch) {
      envContent += `\n${hcsTopicMatch[0]}\n`;
    }
  }

  fs.writeFileSync(envPath, envContent);

  console.log(`\n✅ Created ${envPath} with Hedera format addresses:`);
  console.log(envContent);

  console.log('\n📝 Summary:');
  for (const [name, id] of Object.entries(hederaAddresses)) {
    console.log(`   ${name}: ${id}`);
  }
}

// Run the conversion
convertDeploymentAddresses().catch(console.error);
