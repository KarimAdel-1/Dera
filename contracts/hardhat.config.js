require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

// Convert Hedera DER-encoded private key to raw 32-byte hex format
function convertHederaPrivateKey(hederaKey) {
  if (!hederaKey) return [];

  // Remove any whitespace
  hederaKey = hederaKey.trim();

  // If it's already a 64-character hex (32 bytes), use as-is
  if (hederaKey.length === 64 || (hederaKey.startsWith('0x') && hederaKey.length === 66)) {
    return [hederaKey.startsWith('0x') ? hederaKey : '0x' + hederaKey];
  }

  // If it's a DER-encoded key (starts with 302 or 303), extract the raw key
  // DER format has the raw 32-byte key (64 hex chars) at the end
  if (hederaKey.startsWith('302') || hederaKey.startsWith('303')) {
    // The last 64 characters are the raw private key
    const rawKey = hederaKey.slice(-64);

    // Validate it's a valid hex string
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      console.log('✓ Hedera DER key detected and converted successfully');
      return ['0x' + rawKey];
    }
  }

  console.warn('⚠ Warning: Unexpected private key format. Please ensure your HEDERA_PRIVATE_KEY is either:');
  console.warn('  - A 64-character hex string (32 bytes)');
  console.warn('  - A DER-encoded Hedera private key (starts with 302 or 303)');
  console.warn('  Current key starts with:', hederaKey.substring(0, 10) + '...');
  console.warn('  Key length:', hederaKey.length, 'characters');
  return [];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: convertHederaPrivateKey(process.env.HEDERA_PRIVATE_KEY),
      chainId: 296,
    },
    mainnet: {
      url: "https://mainnet.hashio.io/api",
      accounts: convertHederaPrivateKey(process.env.HEDERA_PRIVATE_KEY),
      chainId: 295,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
