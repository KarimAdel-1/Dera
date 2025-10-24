# Wallet Connection Flow Fixes

## Issues Fixed

### 1. Pairing URI Expiry Error
**Problem**: When connecting a new wallet, users encountered "Error: Expired. pair() URI has expired" errors.

**Root Cause**:
- The old HashConnect instance was being reused without proper cleanup
- Cached WalletConnect data in localStorage contained expired session information
- Insufficient wait time (500ms) for WalletConnect to complete cleanup before creating new pairing

**Solution**:
- Completely destroy the old HashConnect instance before creating new pairing
- Thoroughly clear all WalletConnect and HashConnect data from localStorage
- Increased cleanup wait time to 2000ms (2 seconds) to allow proper cleanup
- Re-initialize HashConnect with a fresh instance before each new pairing
- Added automatic cleanup of stale/expired WalletConnect data on initialization

### 2. Duplicate Pairings in HashPack
**Problem**: Each connection attempt created a new pairing in HashPack's connected dApps list, resulting in multiple duplicate entries (e.g., wallet 0.0.7093470 paired 3 times).

**Root Cause**:
- Each call to `openPairingModal()` created a new WalletConnect session
- Old pairings were not being properly disconnected from HashPack's side
- The disconnect process wasn't thorough enough to remove pairings from HashPack

**Solution**:
- Improved disconnect logic to properly close pairing modals
- Enhanced cleanup to remove all WalletConnect session data from localStorage
- Destroy and re-initialize HashConnect instance between pairings
- Added more comprehensive filtering for WalletConnect storage keys (wc@2, wc_, walletconnect, WALLETCONNECT, hashpack)

### 3. "Pairing Already Exists" Error
**Problem**: When connecting a second wallet from the same HashPack, users encountered "Error: Pairing already exists: [topic]. Please try again with a new connection URI."

**Root Cause**:
- WalletConnect's internal pairing registry still contained the old pairing topic after disconnect
- The cleanup wasn't thorough enough to remove pairing data from WalletConnect's core storage
- Timing issues between disconnect and re-initialization caused residual pairing data to persist

**Solution**:
- Enhanced cleanup sequence with multiple stages:
  1. Disconnect the pairing with proper error handling
  2. Close pairing modal
  3. Clear localStorage BEFORE destroying instance
  4. Wait 1500ms for disconnect to propagate through WalletConnect network
  5. Destroy HashConnect instance
  6. Clear localStorage AGAIN to ensure complete cleanup
  7. Wait another 1500ms
  8. Re-initialize with fresh instance
- Added comprehensive `clearAllWalletConnectData()` method that removes:
  - All WalletConnect v2 core data (wc@2:, wc_)
  - HashConnect specific data
  - WalletConnect pairing, session, proposal, request, expirer, keychain, history, and jsonrpc data
- Increased total cleanup time from 2.5s to 3.5s for more reliable cleanup

## Changes Made

### File: `/frontend/services/hashpackService.js`

#### 1. Enhanced `connectWallet()` Method
- Completely redesigned cleanup sequence before creating new pairings:
  1. Disconnect existing pairing (with error handling)
  2. Close pairing modal
  3. Clear local state
  4. **Clear localStorage BEFORE destroying instance** (new)
  5. Wait 1500ms for disconnect to propagate (increased from 500ms)
  6. Destroy HashConnect instance
  7. **Clear localStorage AGAIN** (new - ensures complete cleanup)
  8. Wait another 1500ms (new - total 3s wait time)
  9. Re-initialize HashConnect with fresh instance
  10. Wait 500ms for readiness
  11. Open pairing modal with fresh instance
- Total cleanup time: ~3.5 seconds (increased from 2.5s)
- Double localStorage cleanup ensures no residual WalletConnect data

#### 2. Improved `disconnectWallet()` Method
- Added pairing modal closure
- Now uses comprehensive `clearAllWalletConnectData()` method
- Added error handling to continue cleanup even if disconnect fails
- More reliable cleanup process

#### 3. Enhanced `disconnectAll()` Method
- Added logging for number of pairings found
- Improved error handling for individual pairing disconnections
- Added modal closure
- Now uses comprehensive `clearAllWalletConnectData()` method

#### 4. Updated `initialize()` Method
- Added automatic cleanup of stale WalletConnect data on initialization
- Calls `cleanupStaleData()` before creating HashConnect instance
- Prevents expired data from affecting new connections

#### 5. New `reset()` Method
- Completely resets the HashConnect service
- Useful for recovering from errors or clearing all stale data
- Disconnects all pairings, destroys instance, and re-initializes

#### 6. New `cleanupStaleData()` Method
- Automatically removes expired or corrupted WalletConnect sessions
- Checks expiry timestamps and removes expired data
- Helps prevent "Expired URI" errors
- Called automatically on initialization

#### 7. New `clearAllWalletConnectData()` Method ⭐ (Key Addition)
- **Most comprehensive cleanup method**
- Removes ALL WalletConnect and HashConnect data from localStorage
- Filters for the following key patterns:
  - `wc@2:*` - WalletConnect v2 core data
  - `wc_*` - WalletConnect prefixed data
  - `*walletconnect*` - WalletConnect generic
  - `*WALLETCONNECT*` - Uppercase variants
  - `hashconnect*` - HashConnect data
  - `*hashpack*` - HashPack specific
  - `*:pairing*` - WalletConnect pairing data
  - `*:session*` - WalletConnect session data
  - `*:proposal*` - WalletConnect proposals
  - `*:request*` - WalletConnect requests
  - `*:expirer*` - WalletConnect expiry data
  - `*:keychain*` - WalletConnect keychain
  - `*:history*` - WalletConnect history
  - `*:jsonrpc*` - WalletConnect JSON-RPC data
- Logs all removed keys for debugging
- Graceful error handling for each key removal

## Testing Recommendations

1. **First-time connection**: Connect a wallet for the first time
   - Verify user and wallet are created in Supabase
   - Verify pairing appears in HashPack's connected dApps
   - Should complete without errors

2. **Adding second wallet from same HashPack**: Connect another account from the same HashPack wallet
   - Click "Connect New Wallet" → HashPack
   - In HashPack, select a DIFFERENT account than the first one
   - **Expected**: No "Pairing already exists" error
   - **Expected**: No "Expired URI" error
   - **Expected**: New wallet is added to existing user account
   - **Expected**: Only ONE new pairing in HashPack (old one removed, new one created)
   - **Expected**: ~3.5 second delay while cleanup happens (this is normal)

3. **Adding third wallet**: Connect a third wallet from HashPack
   - Same process as test #2
   - Verify clean pairing without errors
   - Verify only one active Dera pairing in HashPack

4. **Multiple reconnections**: Connect, disconnect, and reconnect the same wallet
   - Verify old pairings are properly removed from HashPack
   - Verify no stale pairings accumulate
   - Each reconnection should work cleanly

5. **Check HashPack connected dApps**: Open HashPack → Settings → Connected dApps
   - After connecting multiple wallets, verify only ONE "Dera DApp" entry appears
   - Verify no duplicate entries
   - Verify the entry shows the currently connected wallet(s)

6. **Browser console verification**: Open browser DevTools during connection
   - Look for console logs showing cleanup process
   - Should see: "Clearing ALL WalletConnect and HashConnect data..."
   - Should see: "Successfully cleared X WalletConnect/HashConnect items"
   - Should see: "Re-initializing HashConnect with fresh instance..."
   - Should see: "Cleanup complete, ready for new pairing"

7. **localStorage verification**: Check localStorage during connection process
   - Before connection: May have old `wc@2:*` keys
   - During cleanup: Keys should be removed
   - After connection: Only new session keys should exist

## Technical Details

### WalletConnect Session Lifecycle
1. `openPairingModal()` → Creates new WalletConnect session with fresh URI
2. User approves in HashPack → Pairing event fired with accountIds
3. Session data stored in localStorage with keys: `wc@2:*`, `wc_*`, `walletconnect*`
4. `disconnect(topic)` → Sends disconnect signal to wallet
5. localStorage cleanup → Removes session data

### Cleanup Process
The enhanced cleanup now removes all keys matching:
- `hashconnect*`
- `wc@2*`
- `wc_*`
- `*walletconnect*`
- `*WALLETCONNECT*`
- `*hashpack*`
- `*:pairing*`, `*:session*`, `*:proposal*`, `*:request*`
- `*:expirer*`, `*:keychain*`, `*:history*`, `*:jsonrpc*`

### Cleanup Timing (Total: ~3.5 seconds)
The cleanup is now performed in stages with strategic wait times:

1. **Disconnect phase** (0ms-1500ms):
   - Disconnect pairing topic
   - Close pairing modal
   - Clear local state
   - Clear localStorage (first pass)
   - Wait 1500ms for disconnect to propagate through WalletConnect relay network

2. **Destruction phase** (1500ms-3000ms):
   - Destroy HashConnect instance
   - Clear localStorage (second pass - catches any data written during disconnect)
   - Wait 1500ms for complete cleanup

3. **Re-initialization phase** (3000ms-3500ms):
   - Create new HashConnect instance
   - Setup event listeners
   - Initialize HashConnect
   - Wait 500ms for readiness

**Why the wait times are necessary**:
- **1500ms after disconnect**: WalletConnect uses a relay network to propagate disconnect events. This wait ensures the relay has processed the disconnect before we create a new pairing.
- **1500ms after destruction**: Ensures all asynchronous cleanup operations have completed and localStorage changes have been flushed.
- **500ms after init**: Ensures HashConnect SDK is fully initialized and ready to open pairing modal.

**Previous timing (caused errors)**: 500ms total wait → Caused "Pairing already exists" and "Expired URI" errors
**Current timing (reliable)**: 3500ms total wait → Clean pairing every time

## Future Improvements

1. **Multi-pairing support**: Store multiple active pairings instead of just one
2. **Pairing management UI**: Allow users to view and manage all their pairings
3. **Automatic stale pairing cleanup**: Periodically clean up old pairings
4. **Better error recovery**: Automatically retry with fresh instance on pairing errors

## References

- HashConnect Documentation: https://github.com/Hashpack/hashconnect
- WalletConnect v2 Protocol: https://docs.walletconnect.com/2.0/
