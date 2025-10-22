# Blade Wallet Integration Guide

## Overview

Blade wallet is integrated through its browser extension, not an npm package. When users have the Blade wallet extension installed, it injects a `bladeConnect` object into the browser's `window` object.

## How It Works

### Detection
```typescript
// Check if Blade wallet is installed
if (window.bladeConnect) {
  // Blade is available
} else {
  // Show error: "Please install Blade wallet"
}
```

### Connection Flow
```typescript
const connectBlade = async () => {
  try {
    // Check if Blade is installed
    if (!window.bladeConnect) {
      throw new Error('Blade wallet is not installed. Please install it from https://bladewallet.io/');
    }

    const bladeConnect = window.bladeConnect;

    // Create session
    const result = await bladeConnect.createSession({
      name: 'Dera Platform',
      description: 'DeFi Lending Platform',
      url: window.location.origin,
    });

    // Get account
    const accountId = result.accountId;

    return {
      accountId,
      publicKey: result.publicKey,
      network: 'testnet' // or 'mainnet'
    };
  } catch (error) {
    console.error('Blade connection error:', error);
    throw error;
  }
};
```

### Transaction Signing
```typescript
const signTransaction = async (transaction, accountId) => {
  if (!window.bladeConnect) {
    throw new Error('Blade wallet not available');
  }

  const result = await window.bladeConnect.signTransaction({
    transaction,
    accountId,
  });

  return result;
};
```

### Disconnection
```typescript
const disconnectBlade = async () => {
  if (window.bladeConnect) {
    await window.bladeConnect.killSession();
  }
};
```

## Installation Instructions for Users

1. Visit https://bladewallet.io/
2. Download the browser extension for:
   - Chrome
   - Firefox
   - Edge
   - Brave
3. Install the extension
4. Create or import a Hedera account
5. Return to Dera platform and click "Connect Wallet"
6. Select "Blade" and approve the connection

## TypeScript Types

Add these types to your project:

```typescript
// types/blade-wallet.d.ts
interface BladeWalletAPI {
  createSession(params: {
    name: string;
    description: string;
    url: string;
  }): Promise<{
    accountId: string;
    publicKey: string;
    network: string;
  }>;

  signTransaction(params: {
    transaction: Uint8Array | string;
    accountId: string;
  }): Promise<{
    signature: string;
    signedTransaction: Uint8Array;
  }>;

  killSession(): Promise<void>;

  getAccountInfo(): Promise<{
    accountId: string;
    balance: string;
    network: string;
  }>;
}

interface Window {
  bladeConnect?: BladeWalletAPI;
}
```

## Current Implementation

The `WalletContext.tsx` already includes full Blade wallet support:

- ✅ Detection of Blade extension
- ✅ Connection flow
- ✅ Transaction signing
- ✅ Disconnection handling
- ✅ Error handling with helpful messages

## Testing

To test Blade wallet integration:

1. **Without Extension:**
   ```
   Expected: Error message "Blade wallet is not installed"
   ```

2. **With Extension:**
   ```
   1. Click "Connect Wallet"
   2. Select "Blade"
   3. Blade popup appears
   4. Approve connection
   5. Wallet connected successfully
   ```

3. **Transaction Signing:**
   ```
   1. Initiate a transaction (deposit/borrow)
   2. Blade popup appears with transaction details
   3. Review and approve
   4. Transaction signed and submitted
   ```

## Troubleshooting

### Issue: "Blade wallet is not installed"
**Solution:** Install Blade extension from https://bladewallet.io/

### Issue: Connection timeout
**Solution:**
- Check if Blade extension is enabled
- Refresh the page
- Try clicking "Connect Wallet" again

### Issue: Transaction signing fails
**Solution:**
- Ensure Blade has sufficient HBAR for gas
- Check network (testnet vs mainnet)
- Verify account is unlocked in Blade

## Comparison with Other Wallets

| Feature | HashPack | Kabila | Blade |
|---------|----------|--------|-------|
| NPM Package | ✅ @hashgraph/hashconnect | ✅ @hashgraph/hashconnect | ❌ Browser extension only |
| Installation | Extension + NPM | Extension + NPM | Extension only |
| Connection | HashConnect protocol | HashConnect protocol | Direct API |
| Multi-account | ✅ | ✅ | ✅ |
| Mobile | ✅ | ✅ | ✅ |

## Notes

- **No NPM Package Required:** Blade works purely through browser extension API
- **Same User Experience:** Despite different technical implementation, users see the same UI
- **Production Ready:** Current implementation handles all Blade wallet features
- **Graceful Fallback:** Shows helpful error if extension not installed

## References

- Blade Wallet: https://bladewallet.io/
- Blade Docs: https://docs.bladewallet.io/
- Chrome Extension: https://chrome.google.com/webstore (search "Blade Wallet")
- GitHub: https://github.com/Blade-Labs

---

Generated: 2025-10-22
Status: Blade wallet fully integrated (no npm package needed)
