# How to Enable HBAR as Collateral

## 🎯 The Problem

Your console logs show you keep sending `useAsCollateral: false` (disabling it), but you need to send `useAsCollateral: true` (enabling it).

## 📊 Step 1: Check Current State

**Open browser console (F12) and paste this:**

```javascript
// Copy and paste the ENTIRE contents of check-collateral-state.js
```

Or just open `check-collateral-state.js` and copy/paste it into the console.

This will tell you:
- ✅ What the ACTUAL on-chain state is
- ✅ Whether collateral is enabled or disabled
- ✅ Whether the UI state matches reality

## 🔧 Step 2: Enable Collateral

Based on what the diagnostic shows:

### If it shows "HBAR IS NOT ENABLED AS COLLATERAL":

This is most likely the case! Here's what to do:

1. **Look at your "Your Positions" tab**
2. **Find your HBAR supply** (should show 250 HBAR)
3. **Look for the collateral toggle/switch**
   - It might be a toggle switch
   - It might be a checkbox
   - It might be a button that says "Enable Collateral"
4. **The toggle should currently show as OFF/DISABLED**
   - If it shows as ON but collateral is actually OFF, **refresh the page first**
5. **Click the toggle to turn it ON/ENABLED**
6. **In the console, you should see:**
   ```javascript
   🔄 Toggling collateral via Hedera transaction... {
     asset: '0x0000000000000000000000000000000000000000',
     useAsCollateral: true,  // ✅ THIS MEANS ENABLING!
     userAddress: '0.0.7093470'
   }
   ```
7. **Approve the transaction in HashPack**
8. **Wait for success message**

## 🎉 Step 3: Verify It Worked

After the transaction succeeds:

1. **Run the diagnostic again** (paste check-collateral-state.js in console)
2. **It should now show:**
   - ✅ HBAR IS ENABLED AS COLLATERAL ON-CHAIN
   - ✅ Total Collateral: ~$20 USD (250 HBAR × $0.08)
   - ✅ Available to Borrow: ~$15 USD (75% LTV)

3. **Check the main dashboard** - it should now show:
   - Total Supplied: $20
   - Available to Borrow: $15

## 🔍 Understanding the Console Logs

**When ENABLING collateral** (what you WANT):
```javascript
useAsCollateral: true  // ✅ ENABLING
```

**When DISABLING collateral** (what you've been doing):
```javascript
useAsCollateral: false  // ❌ DISABLING
```

## ⚠️ Common Mistakes

1. **UI shows "Enabled" but collateral is actually disabled**
   - **Fix:** Refresh the page to sync UI with on-chain state
   - Then click the toggle (it should show as disabled after refresh)

2. **Clicking the toggle multiple times**
   - Each click toggles it back and forth
   - Make sure you're clicking it in the right direction!

3. **Confusing "Enable Collateral" with "Disable Collateral"**
   - Enable = useAsCollateral: true
   - Disable = useAsCollateral: false
   - Check the console logs to confirm!

## 🐛 If It's Still Not Working

If you enable collateral (useAsCollateral: true) but it REVERTS:

1. **Check the console for the error message**
2. **It might show:**
   - `❌ CONTRACT REVERTED: 0x47bc4b2c` - This is a specific contract error
   - We can investigate what this error means

3. **The error might indicate:**
   - LTV is still zero (run `npm run fix:hbar` in contracts folder)
   - Asset is not active (run `npm run fix:hbar`)
   - Some other contract-level restriction

## 📝 What to Share Next

After you try to enable collateral, share:

1. **Console output** showing `useAsCollateral: true` (not false!)
2. **Transaction result** (success or error)
3. **Diagnostic output** (from check-collateral-state.js)
4. **Any error messages** if it reverts

This will help me diagnose exactly what's happening!

---

## 🎓 Summary

**The Key Point:** Your logs show you've been toggling collateral to `false` (disabling it). You need to toggle it to `true` (enabling it).

**How to Know:** Watch the console log that says:
```javascript
🔄 Toggling collateral via Hedera transaction...
```

Make sure it shows `useAsCollateral: true` ← **This is what you want!**
