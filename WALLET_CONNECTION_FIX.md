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

## Changes Made

### File: `/frontend/services/hashpackService.js`

#### 1. Enhanced `connectWallet()` Method
- Added proper cleanup sequence before creating new pairings:
  1. Disconnect existing pairing
  2. Destroy HashConnect instance
  3. Wait 2 seconds for cleanup
  4. Re-initialize HashConnect
  5. Wait 500ms for readiness
  6. Open pairing modal with fresh instance

#### 2. Improved `disconnectWallet()` Method
- Added pairing modal closure
- Enhanced localStorage cleanup with more WalletConnect key patterns
- Added error handling to continue cleanup even if disconnect fails
- More comprehensive key filtering for removal

#### 3. Enhanced `disconnectAll()` Method
- Added logging for number of pairings found
- Improved error handling for individual pairing disconnections
- Added modal closure
- More thorough localStorage cleanup

#### 4. Updated `initialize()` Method
- Added automatic cleanup of stale WalletConnect data on initialization
- Calls `cleanupStaleData()` before creating HashConnect instance

#### 5. New `reset()` Method
- Completely resets the HashConnect service
- Useful for recovering from errors or clearing all stale data
- Disconnects all pairings, destroys instance, and re-initializes

#### 6. New `cleanupStaleData()` Method
- Automatically removes expired or corrupted WalletConnect sessions
- Checks expiry timestamps and removes expired data
- Helps prevent "Expired URI" errors

## Testing Recommendations

1. **First-time connection**: Connect a wallet for the first time
   - Verify user and wallet are created in Supabase
   - Verify pairing appears in HashPack's connected dApps

2. **Adding second wallet**: Connect an additional wallet
   - Verify no "Expired URI" error occurs
   - Verify new wallet is added to existing user account
   - Verify only ONE new pairing is created in HashPack (not duplicates)

3. **Multiple reconnections**: Connect, disconnect, and reconnect the same wallet
   - Verify old pairings are properly removed from HashPack
   - Verify no stale pairings accumulate

4. **Check HashPack connected dApps**: After multiple connections
   - Verify only currently active connections appear
   - Verify no duplicate entries for the same wallet

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

### Wait Times
- **2000ms** after disconnect: Allows WalletConnect protocol to complete cleanup
- **500ms** after re-initialization: Ensures HashConnect is fully ready

## Future Improvements

1. **Multi-pairing support**: Store multiple active pairings instead of just one
2. **Pairing management UI**: Allow users to view and manage all their pairings
3. **Automatic stale pairing cleanup**: Periodically clean up old pairings
4. **Better error recovery**: Automatically retry with fresh instance on pairing errors

## References

- HashConnect Documentation: https://github.com/Hashpack/hashconnect
- WalletConnect v2 Protocol: https://docs.walletconnect.com/2.0/
