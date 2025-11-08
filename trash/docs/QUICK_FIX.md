# Quick Fix for Deployment Error

## The Error You're Seeing

```
❌ Deployment failed: ProviderError: execution reverted
```

## Most Likely Cause

**Insufficient HBAR balance** or **gas estimation issue** on Hedera testnet.

## Quick Fix Steps

### Step 1: Check Your Setup

```bash
cd contracts
npm run check
```

This will verify:
- ✅ Network connection
- ✅ Account access
- ✅ HBAR balance (need 50+ HBAR)
- ✅ Environment variables
- ✅ Contract compilation

### Step 2: Get More HBAR (if needed)

If balance is low:
1. Visit https://portal.hedera.com/
2. Login with your account
3. Request testnet HBAR (100 HBAR available)
4. Wait 30 seconds for deposit

### Step 3: Try Minimal Deployment Test

```bash
cd contracts
npm run deploy:test
```

This deploys only essential contracts to isolate the issue.

### Step 4: Full Deployment

Once the test passes:

```bash
cd contracts
npm run deploy
```

## Alternative: Manual Gas Limit Adjustment

If deployment still fails, edit `contracts/scripts/deploy-complete.js`:

**Line 116** - Increase Pool gas limit:
```javascript
// Change from:
const pool = await Pool.deploy(addresses.POOL_ADDRESSES_PROVIDER, addresses.RATE_STRATEGY, { gasLimit: 15000000 });

// To:
const pool = await Pool.deploy(addresses.POOL_ADDRESSES_PROVIDER, addresses.RATE_STRATEGY, { gasLimit: 20000000 });
```

## Common Issues & Solutions

### Issue: "Cannot access account"
**Fix:** Check `PRIVATE_KEY` in `contracts/.env`
- Must start with `0x`
- Must be 66 characters (0x + 64 hex chars)

### Issue: "Network connection failed"
**Fix:** Check `HEDERA_TESTNET_RPC` in `contracts/.env`
- Should be: `https://testnet.hashio.io/api`

### Issue: "Compilation issue"
**Fix:** Recompile contracts
```bash
cd contracts
npx hardhat clean
npx hardhat compile
```

### Issue: Still failing after all checks pass
**Fix:** The Pool contract might be too large. Try:

1. **Reduce optimizer runs** (already set to 1 in hardhat.config.js)
2. **Deploy libraries separately** (already done)
3. **Use via-IR compilation** - Edit `hardhat.config.js`:
   ```javascript
   viaIR: true,  // Change from false to true
   ```

## Verify Successful Deployment

After successful deployment, you should see:

```
✅ PoolAddressesProvider: 0x...
✅ ACLManager: 0x...
✅ Oracle: 0x...
✅ Rate Strategy: 0x...
✅ Libraries deployed
✅ Pool: 0x...
✅ PoolConfigurator: 0x...
✅ Multi-Asset Staking: 0x...
✅ Analytics: 0x...
🎉 DEPLOYMENT COMPLETE!
```

And these files are created:
- `contracts/deployment-info.json`
- `frontend/.env.local`
- `.env` (root directory)

## Next Steps

1. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Open Browser:**
   http://localhost:3000

## Still Having Issues?

1. Check `DEPLOYMENT_TROUBLESHOOTING.md` for detailed debugging
2. Look at `deployment-partial.json` to see which contract failed
3. Check transaction on HashScan: https://hashscan.io/testnet

## Emergency Contact

If you're a hackathon judge and need immediate help:
- Check DoraHacks submission for test credentials
- Contact via DoraHacks submission comments
