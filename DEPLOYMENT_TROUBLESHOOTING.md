# Deployment Troubleshooting Guide

## Common Deployment Issues and Solutions

### Issue 1: "execution reverted" Error During Pool Deployment

**Symptoms:**
```
❌ Deployment failed: ProviderError: execution reverted
```

**Possible Causes:**

1. **Insufficient HBAR Balance**
   - **Solution:** Ensure your account has at least 100 HBAR
   - Check balance: Visit https://hashscan.io/testnet/account/YOUR_ACCOUNT_ID
   - Get testnet HBAR: https://portal.hedera.com/

2. **Gas Limit Too Low**
   - **Solution:** The deployment script now includes explicit gas limits
   - Pool deployment uses `gasLimit: 15000000`
   - If still failing, increase in `deploy-complete.js` line 116

3. **Invalid Constructor Parameters**
   - **Solution:** Verify addresses are not zero
   - Check that `POOL_ADDRESSES_PROVIDER` is deployed first
   - Check that `RATE_STRATEGY` is deployed and address is valid

4. **Contract Size Too Large**
   - **Solution:** Optimizer settings in `hardhat.config.js`
   - Current setting: `runs: 1` (optimizes for deployment size)
   - Libraries are deployed separately to reduce Pool contract size

### Issue 2: Network Connection Errors

**Symptoms:**
```
Error: could not detect network
```

**Solutions:**
1. Check `.env` file has correct `HEDERA_TESTNET_RPC`
2. Default RPC: `https://testnet.hashio.io/api`
3. Verify internet connection
4. Try alternative RPC: `https://testnet.hashio.io/api`

### Issue 3: Private Key Issues

**Symptoms:**
```
Error: invalid private key
```

**Solutions:**
1. Ensure `PRIVATE_KEY` in `.env` starts with `0x`
2. Format: `PRIVATE_KEY=0x1234...` (64 hex characters after 0x)
3. Verify key matches your Hedera account
4. Never commit `.env` file to git

### Issue 4: Out of Gas Errors

**Symptoms:**
```
Error: Transaction ran out of gas
```

**Solutions:**
1. Increase gas limit in deployment script
2. Check account has sufficient HBAR for gas fees
3. Deployment typically costs 20-50 HBAR total

## Debugging Steps

### Step 1: Verify Prerequisites

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Verify .env file exists
ls contracts/.env

# Check HBAR balance (replace with your account ID)
# Visit: https://hashscan.io/testnet/account/0.0.YOUR_ID
```

### Step 2: Test Minimal Deployment

Run the test script to isolate the issue:

```bash
cd contracts
npx hardhat run scripts/test-pool-deploy.js --network testnet
```

This will:
- Deploy only essential contracts
- Show detailed error messages
- Help identify which contract is failing

### Step 3: Check Compilation

```bash
cd contracts
npx hardhat clean
npx hardhat compile
```

Expected output:
```
Compiling 40 Solidity files...
✅ Compilation successful!
```

### Step 4: Verify Network Configuration

```bash
# Test RPC connection
curl https://testnet.hashio.io/api \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x128"}
```
(0x128 = 296 in decimal, Hedera testnet chain ID)

## Manual Deployment Steps

If automated deployment fails, try manual step-by-step deployment:

### 1. Deploy PoolAddressesProvider

```bash
npx hardhat run scripts/deploy-step1-provider.js --network testnet
```

### 2. Deploy ACLManager

```bash
npx hardhat run scripts/deploy-step2-acl.js --network testnet
```

### 3. Deploy Oracle

```bash
npx hardhat run scripts/deploy-step3-oracle.js --network testnet
```

### 4. Deploy Interest Rate Strategy

```bash
npx hardhat run scripts/deploy-step4-rate-strategy.js --network testnet
```

### 5. Deploy Libraries

```bash
npx hardhat run scripts/deploy-step5-libraries.js --network testnet
```

### 6. Deploy Pool

```bash
npx hardhat run scripts/deploy-step6-pool.js --network testnet
```

## Environment Variables Checklist

Ensure your `contracts/.env` file has:

```env
# Required
HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
PRIVATE_KEY=0x... (your private key)
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=302e... (your DER format key)

# Optional (have defaults)
PYTH_CONTRACT_ADDRESS=0x0708325268dF9F66270F1401206434524814508b
REWARD_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
```

## Getting Help

If issues persist:

1. **Check Logs:** Look at `deployment-partial.json` for partial deployment info
2. **HashScan:** View failed transactions at https://hashscan.io/testnet
3. **Hedera Discord:** Ask in #developer-general
4. **GitHub Issues:** Open an issue with full error logs

## Success Indicators

Successful deployment shows:

```
✅ All dependencies installed!
✅ Contracts compiled successfully!
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

Files created:
- `contracts/deployment-info.json` - All contract addresses
- `frontend/.env.local` - Frontend configuration
- `.env` (root) - Backend configuration

## Next Steps After Successful Deployment

1. **Start Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Verify Contracts:**
   - Visit HashScan links shown in deployment output
   - Check contract bytecode is deployed
   - Verify contract addresses match `deployment-info.json`

3. **Test Basic Operations:**
   ```bash
   cd contracts
   npx hardhat run scripts/test-hbar-deposit.js --network testnet
   ```

## Contact

For urgent issues during hackathon judging, contact via DoraHacks submission comments.
