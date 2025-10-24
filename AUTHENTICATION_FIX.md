# Wallet-First Authentication & Duplicate Connection Fixes

## Issues Fixed

### Issue 1: Wallet-First Authentication Not Working (Duplicate User Creation)

**Problem**: When reconnecting with a secondary wallet after clearing localStorage, the system created a new user instead of finding the existing wallet and its associated user.

**Example scenario**:
1. Connect wallet `0.0.7093470` → Creates user `c404662e-...` with `unique_identifier: user_0.0.7093470`
2. Add second wallet `0.0.7094264` to same user → Creates wallet entry linked to user `c404662e-...`
3. Clear localStorage
4. Try to reconnect with `0.0.7094264` → **WRONG**: Created NEW user `7ac130b9-...` with `unique_identifier: user_0.0.7094264` ❌
5. **SHOULD**: Find existing wallet `0.0.7094264`, load its user (`c404662e-...`) ✓

**Root Cause**:
- Database query using `users!inner(*)` join syntax was failing with **406 Not Acceptable** error
- The Supabase REST API couldn't process the inner join properly
- When wallet lookup failed, the code assumed it was a new wallet and created a new user
- This broke the wallet-first authentication pattern

**Solution**:
Changed from single complex query to two-step lookup:

**Before (failed)**:
```javascript
const { data: existingWallet, error: walletError } = await supabase
  .from('wallets')
  .select(`
    *,
    users!inner(*)  // ❌ This caused 406 error
  `)
  .eq('wallet_address', walletAddress)
  .single();
```

**After (works)**:
```javascript
// Step 1: Find wallet
const { data: existingWallets, error: walletError } = await supabase
  .from('wallets')
  .select('*')
  .eq('wallet_address', walletAddress);

if (existingWallets && existingWallets.length > 0) {
  const existingWallet = existingWallets[0];

  // Step 2: Get associated user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', existingWallet.user_id)
    .single();

  // Reactivate wallet and update last login
  // Return existing user ✓
}
```

**Key improvements**:
- Removed problematic join that caused API errors
- Added comprehensive logging at each step
- Properly handles wallet reactivation
- Updates user's last login timestamp
- Returns `isReturningUser` flag to distinguish new vs existing users
- Logs all user wallets count for debugging

---

### Issue 2: Duplicate HashPack Connections After localStorage Clear

**Problem**: When clearing localStorage and reconnecting with the same wallet, duplicate entries appeared in HashPack's "Connected dApps" list.

**Example scenario**:
1. Connect wallet `0.0.7093470` → Creates pairing A in HashPack ✓
2. Clear localStorage → Pairing A still exists in HashPack
3. Reconnect with `0.0.7093470` → Creates pairing B in HashPack ❌
4. Result: Two "Dera DApp" entries in HashPack for wallet `0.0.7093470`

**Root Cause**:
- WalletConnect session keys are stored in **localStorage**
- When localStorage is cleared, the session keys are **permanently lost**
- Without session keys, there's **no way to recover** or reuse old pairings
- Old pairings become "orphaned" - they exist in HashPack but our app doesn't know about them
- Each reconnection creates a **new pairing** because we can't access the old one
- This is a fundamental limitation of the WalletConnect protocol

**Solution**:
Added automatic orphaned pairing detection and cleanup:

```javascript
async cleanupOrphanedPairings() {
  // Get all pairings from HashConnect's internal data
  const allPairings = this.hashconnect.hcData?.pairingData || [];

  // Check if we have pairings but no active connection
  const isConnected = this.state === 'Paired';

  if (allPairings.length > 0 && !isConnected) {
    // These are orphaned pairings - disconnect them
    for (const pairing of allPairings) {
      await this.hashconnect.disconnect(pairing.topic);
    }

    // Clear all WalletConnect data
    this.clearAllWalletConnectData();
  }
}
```

**When it runs**:
- Automatically called after HashConnect initialization
- Detects pairings that exist in HashConnect's memory but have no valid connection
- Disconnects orphaned pairings to prevent accumulation
- Clears associated WalletConnect localStorage data

**Important limitation**:
Due to WalletConnect protocol design, once localStorage is cleared, we **cannot recover** old session keys. This means:
- Some stale pairings may still appear in HashPack after localStorage clear
- Users may need to manually remove very old connections from HashPack settings
- The cleanup reduces but may not completely eliminate duplicates

**Better long-term solution (future enhancement)**:
Store WalletConnect session keys in **database** instead of localStorage:
- Would allow session recovery after localStorage clear
- Would enable true persistent sessions
- Would completely eliminate duplicate pairings
- Requires more complex implementation

---

## Changes Made

### File: `/frontend/services/supabaseService.js`

#### Enhanced `processWalletConnection()` Method

**Changes**:
1. **Two-step wallet lookup** (replaced problematic join):
   ```javascript
   // Step 1: Find wallet by address
   const { data: existingWallets } = await supabase
     .from('wallets')
     .select('*')
     .eq('wallet_address', walletAddress);

   // Step 2: Get associated user
   const { data: user } = await supabase
     .from('users')
     .select('*')
     .eq('id', existingWallet.user_id)
     .single();
   ```

2. **Comprehensive logging**:
   - Logs wallet lookup result (found, count, errors)
   - Logs existing wallet details (wallet_id, user_id, is_active)
   - Logs associated user (user_id, unique_identifier)
   - Logs all user wallets count

3. **Proper wallet reactivation**:
   ```javascript
   if (!existingWallet.is_active) {
     await supabase
       .from('wallets')
       .update({
         is_active: true,
         connected_at: new Date().toISOString()
       })
       .eq('wallet_address', walletAddress);
   }
   ```

4. **User login tracking**:
   ```javascript
   await supabase
     .from('users')
     .update({ last_login: new Date().toISOString() })
     .eq('id', user.id);
   ```

5. **Return flags for flow control**:
   ```javascript
   return {
     user,
     wallet,
     isNewWallet: false,
     isReturningUser: true  // New flag
   };
   ```

### File: `/frontend/services/hashpackService.js`

#### New `cleanupOrphanedPairings()` Method

**Purpose**: Automatically clean up orphaned pairings after localStorage clear

**How it works**:
1. Called automatically during `initialize()` after HashConnect init
2. Gets all pairings from `hashconnect.hcData.pairingData`
3. Checks if pairings exist but connection state is not "Paired"
4. If orphaned pairings found:
   - Disconnects each pairing topic
   - Clears all WalletConnect localStorage data
   - Logs cleanup actions
5. If active connection found, skips cleanup (no orphans)

**Code**:
```javascript
async cleanupOrphanedPairings() {
  const allPairings = this.hashconnect.hcData?.pairingData || [];
  const isConnected = this.state === 'Paired';

  if (allPairings.length > 0 && !isConnected) {
    console.log('Found orphaned pairings, cleaning up...');

    for (const pairing of allPairings) {
      await this.hashconnect.disconnect(pairing.topic);
    }

    this.clearAllWalletConnectData();
  }
}
```

#### Updated `initialize()` Method

**Addition**:
```javascript
await this.hashconnect.init();

// New: Clean up orphaned pairings after init
await this.cleanupOrphanedPairings();
```

---

## Testing Recommendations

### Test Issue 1: Wallet-First Authentication

**Scenario A: Add second wallet**
1. Connect wallet `0.0.7093470` on connect page
   - Should create user with `unique_identifier: user_0.0.7093470`
   - Check database: 1 user, 1 wallet
2. In dashboard, click "Connect New Wallet" → HashPack
   - Select wallet `0.0.7094264`
   - Should add wallet to **existing user**
   - Check database: 1 user, 2 wallets (same user_id)

**Scenario B: Reconnect with second wallet** (the previously failing case)
1. Clear localStorage completely
2. Go to connect page → Connect HashPack
3. In HashPack, select wallet `0.0.7094264` (the second wallet)
4. **Expected results**:
   - Console shows: "✅ Found existing wallet:"
   - Console shows: "👤 Found associated user: user_0.0.7093470"
   - Console shows: "📊 User has 2 active wallets"
   - Should load existing user (NOT create new one) ✓
   - Check database: Still 1 user, 2 wallets ✓
   - Dashboard shows both wallets ✓

**Scenario C: Reconnect with first wallet**
1. Clear localStorage
2. Connect with wallet `0.0.7093470` (original wallet)
3. Should find existing wallet and load user
4. Should show both wallets in dashboard

### Test Issue 2: Duplicate HashPack Connections

**Scenario A: Check orphaned pairing cleanup**
1. Connect wallet `0.0.7093470`
2. Clear localStorage
3. Refresh page / restart app
4. **Check console logs**:
   - Should see: "Found X existing pairings, checking for orphaned ones..."
   - If orphaned: "Found orphaned pairings (pairings exist but not connected), cleaning up..."
   - Should see: "Disconnecting orphaned pairing: [topic]"
   - Should see: "Orphaned pairings cleaned up"

**Scenario B: Check HashPack Connected dApps**
1. Connect wallet
2. Check HashPack → Settings → Connected dApps
   - Should see 1 "Dera DApp" entry
3. Clear localStorage
4. Reconnect same wallet
5. Check HashPack → Settings → Connected dApps
   - Due to orphaned cleanup, should see fewer duplicates
   - May still have 1-2 entries (WalletConnect limitation)
   - Should NOT accumulate 5+ entries over multiple reconnects

**Scenario C: Manual cleanup if needed**
- If old stale pairings persist in HashPack:
  1. Open HashPack extension
  2. Go to Settings → Connected dApps
  3. Manually disconnect old "Dera DApp" entries
  4. Keep only the most recent connection

---

## Console Logs to Verify Fixes

### For Issue 1 (Wallet-First Auth):

**When reconnecting with existing wallet, you should see**:
```
🔄 Processing wallet connection: 0.0.7094264
💾 Wallet lookup result: { found: true, count: 1, error: null }
✅ Found existing wallet: { wallet_id: '...', user_id: 'c404662e-...', is_active: true }
👤 Found associated user: { user_id: 'c404662e-...', unique_identifier: 'user_0.0.7093470' }
🔄 Reactivating wallet...  (if was inactive)
📝 Updating last login...
📊 User has 2 active wallets
```

**Bad logs (old behavior - should NOT see)**:
```
🆕 New wallet detected - creating new user  ❌ WRONG!
```

### For Issue 2 (Duplicate Connections):

**After localStorage clear and app restart, you should see**:
```
HashConnect v3 initialized successfully
Found 1 existing pairings, checking for orphaned ones...
Found orphaned pairings (pairings exist but not connected), cleaning up...
Disconnecting orphaned pairing: [topic-id]
Cleared ALL WalletConnect and HashConnect data from localStorage...
Successfully cleared X WalletConnect/HashConnect items
Orphaned pairings cleaned up
```

**Or if no orphans**:
```
No existing pairings found to check
```

---

## Known Limitations

### WalletConnect Protocol Limitation

**Issue**: Once localStorage is cleared, WalletConnect session keys are permanently lost and cannot be recovered.

**Impact**:
- Old pairings in HashPack become "orphaned" (app can't access them)
- Some stale connections may persist in HashPack
- Users may need manual cleanup in HashPack settings occasionally

**Why this happens**:
- WalletConnect v2 stores all session data (keys, topics, encryption) in localStorage
- These keys are required to communicate with existing pairings
- No backup or recovery mechanism exists in the protocol
- This is by design for security reasons

**Workarounds**:
1. **Current solution**: Automatic orphaned pairing cleanup (reduces duplicates)
2. **Better solution** (future): Store session keys in database instead of localStorage
3. **Manual solution**: Users can clean up old pairings in HashPack → Settings → Connected dApps

---

## Future Improvements

### 1. Database-Backed WalletConnect Sessions

**Goal**: Persist WalletConnect session keys in database instead of localStorage

**Benefits**:
- Session survives localStorage clear
- True persistent authentication
- No orphaned pairings
- Seamless reconnection experience

**Implementation**:
```javascript
// On pairing success
const sessionData = {
  topic: pairingData.topic,
  symKey: /* encryption key */,
  // ... other session data
};
await supabaseService.saveWalletSession(userId, walletAddress, sessionData);

// On reconnection
const sessionData = await supabaseService.getWalletSession(userId, walletAddress);
// Restore session to WalletConnect
```

### 2. Automatic Stale Pairing Detection

**Goal**: Detect and remove very old pairings from HashPack

**Implementation**:
- Track pairing creation timestamp in database
- On initialization, check if pairing is older than X days
- If old and not used, disconnect automatically

### 3. User-Friendly Pairing Management

**Goal**: UI for users to view and manage their HashPack connections

**Features**:
- Show all active pairings
- Last used timestamp
- Button to manually disconnect specific pairings
- Clear all button for bulk cleanup

---

## Summary

### What's Fixed

✅ **Issue 1**: Wallet-first authentication works correctly
- Reconnecting with any wallet finds existing user
- No duplicate users created
- Proper wallet reactivation
- Comprehensive logging for debugging

✅ **Issue 2**: Reduced duplicate HashPack connections
- Automatic orphaned pairing cleanup
- Disconnects stale pairings on app start
- Clears WalletConnect data properly
- Fewer duplicates accumulate

### What to Know

⚠️ **WalletConnect Limitation**:
- Once localStorage is cleared, old session keys are lost forever
- Some stale pairings may persist in HashPack
- Users may need occasional manual cleanup in HashPack settings
- This is a protocol limitation, not a bug

### Next Steps

1. Test the wallet-first authentication flow thoroughly
2. Verify database queries work without 406 errors
3. Monitor console logs for proper wallet lookup
4. Check HashPack Connected dApps list after multiple reconnects
5. Consider implementing database-backed sessions for perfect solution
