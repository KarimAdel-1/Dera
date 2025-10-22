require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });

// Convert Hedera DER-encoded private key to raw 32-byte hex format
function convertHederaPrivateKey(hederaKey) {
  if (!hederaKey) return [];

  // If it's already a 64-character hex (32 bytes), use as-is
  if (hederaKey.length === 64 || (hederaKey.startsWith('0x') && hederaKey.length === 66)) {
    return [hederaKey.startsWith('0x') ? hederaKey : '0x' + hederaKey];
  }

  // If it's a DER-encoded key (starts with 302e...), extract the raw key
  // DER format: 302e020100300506032b657004220420 + [32 bytes raw key]
  if (hederaKey.startsWith('302e020100300506032b6570042204')) {
    const rawKey = hederaKey.slice(hederaKey.length - 64);
    return ['0x' + rawKey];
  }

  console.warn('Warning: Unexpected private key format. Please ensure your HEDERA_PRIVATE_KEY is either:');
  console.warn('  - A 64-character hex string (32 bytes)');
  console.warn('  - A DER-encoded Hedera private key (starts with 302e...)');
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
