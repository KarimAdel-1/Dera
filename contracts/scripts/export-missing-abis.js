const fs = require('fs');
const path = require('path');

/**
 * Export missing ABI files for frontend integration
 */
async function exportMissingABIs() {
  console.log('🔄 Exporting missing ABI files...');

  const contractsDir = path.join(__dirname, '../contracts/hedera');
  const frontendAbisDir = path.join(__dirname, '../../frontend/contracts/abis');
  const backendAbisDir = path.join(__dirname, '../../backend');

  // Ensure frontend abis directory exists
  if (!fs.existsSync(frontendAbisDir)) {
    fs.mkdirSync(frontendAbisDir, { recursive: true });
  }

  // Contracts to export
  const contractsToExport = [
    'DeraMultiAssetStaking',
    'DeraNodeStaking', 
    'DeraHCSEventStreamer',
    'DeraProtocolIntegration',
    'DeraMirrorNodeAnalytics'
  ];

  for (const contractName of contractsToExport) {
    try {
      // Try to find compiled artifact
      const artifactPath = path.join(__dirname, '../artifacts/contracts/hedera', `${contractName}.sol/${contractName}.json`);
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Create ABI-only file for frontend
        const abiFile = {
          contractName: contractName,
          abi: artifact.abi,
          bytecode: artifact.bytecode,
          deployedBytecode: artifact.deployedBytecode
        };

        // Export to frontend
        const frontendPath = path.join(frontendAbisDir, `${contractName}.json`);
        fs.writeFileSync(frontendPath, JSON.stringify(abiFile, null, 2));
        console.log(`✅ Exported ${contractName}.json to frontend`);

        // Export to backend services
        const backendServices = ['node-staking-service', 'hcs-event-service', 'monitoring-service'];
        
        for (const service of backendServices) {
          const serviceAbisDir = path.join(backendAbisDir, service, 'src/abis');
          if (fs.existsSync(path.join(backendAbisDir, service))) {
            if (!fs.existsSync(serviceAbisDir)) {
              fs.mkdirSync(serviceAbisDir, { recursive: true });
            }
            
            const backendPath = path.join(serviceAbisDir, `${contractName}.json`);
            fs.writeFileSync(backendPath, JSON.stringify(abiFile, null, 2));
            console.log(`✅ Exported ${contractName}.json to ${service}`);
          }
        }
      } else {
        console.warn(`⚠️ Artifact not found for ${contractName} - compile contracts first`);
      }
    } catch (error) {
      console.error(`❌ Error exporting ${contractName}:`, error.message);
    }
  }

  console.log('✅ ABI export completed');
}

// Run if called directly
if (require.main === module) {
  exportMissingABIs().catch(console.error);
}

module.exports = { exportMissingABIs };