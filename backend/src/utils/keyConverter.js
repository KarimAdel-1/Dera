/**
 * Convert Hedera DER-encoded private key to raw 32-byte hex format for ethers v6
 * @param {string} hederaKey - Hedera private key (DER or raw hex)
 * @returns {string} Raw private key with 0x prefix
 */
function convertHederaPrivateKey(hederaKey) {
  if (!hederaKey) {
    throw new Error('Private key is required');
  }

  // Remove any whitespace
  hederaKey = hederaKey.trim();

  // If it's already a 64-character hex (32 bytes), use as-is
  if (hederaKey.length === 64) {
    return '0x' + hederaKey;
  }

  if (hederaKey.startsWith('0x') && hederaKey.length === 66) {
    return hederaKey;
  }

  // If it's a DER-encoded key (starts with 302 or 303), extract the raw key
  // DER format has the raw 32-byte key (64 hex chars) at the end
  if (hederaKey.startsWith('302') || hederaKey.startsWith('303')) {
    // The last 64 characters are the raw private key
    const rawKey = hederaKey.slice(-64);

    // Validate it's a valid hex string
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return '0x' + rawKey;
    }
  }

  throw new Error(
    'Invalid private key format. Expected either:\n' +
    '  - A 64-character hex string (32 bytes)\n' +
    '  - A DER-encoded Hedera private key (starts with 302 or 303)\n' +
    `  Got: ${hederaKey.substring(0, 10)}... (${hederaKey.length} chars)`
  );
}

module.exports = { convertHederaPrivateKey };
