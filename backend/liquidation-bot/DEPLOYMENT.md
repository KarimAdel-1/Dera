# Liquidation Bot Deployment Guide

Complete guide for deploying and running the Dera Protocol Liquidation Bot on Hedera.

## Prerequisites

### 1. System Requirements
- Node.js v18+
- npm or yarn
- Linux/Mac (recommended) or Windows with WSL
- Minimum 1GB RAM, 10GB disk space

### 2. Hedera Testnet Account
Create account at: https://portal.hedera.com/register

You'll receive:
- Account ID (e.g., `0.0.123456`)
- Private Key (DER format)
- Initial HBAR balance

### 3. Liquidator Wallet
You need a separate EVM-compatible wallet:
- MetaMask or similar
- Fund with USDC (to cover debt repayments)
- Fund with HBAR (for gas fees)

**Recommended Initial Capital**:
- 10,000 USDC
- 100 HBAR

## Step-by-Step Deployment

### Step 1: Install Dependencies

```bash
cd backend/liquidation-bot
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Fill in all required values:

```bash
# Hedera Network
NETWORK=testnet
RPC_URL=https://testnet.hashio.io/api

# Your Hedera account (from portal.hedera.com)
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_DER_PRIVATE_KEY

# Your liquidator wallet private key (EVM format, starts with 0x)
LIQUIDATOR_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Contract addresses (get these after deploying contracts)
POOL_ADDRESS=0x...
LIQUIDATION_DATA_PROVIDER_ADDRESS=0x...
ORACLE_ADDRESS=0x...

# Default asset addresses
DEFAULT_COLLATERAL_ASSET=0x...  # HBAR wrapper or native
DEFAULT_DEBT_ASSET=0x...        # USDC address

# Bot tuning
CHECK_INTERVAL_MS=30000
MIN_PROFIT_USD=10
ESTIMATED_GAS_COST_USD=5
```

### Step 3: Get Contract ABIs

The bot needs ABI files to interact with contracts:

```bash
mkdir -p src/abis

# Copy ABIs from contract compilation
cp ../../contracts/artifacts/contracts/protocol/pool/Pool.sol/Pool.json src/abis/
cp ../../contracts/artifacts/contracts/helpers/LiquidationDataProvider.sol/LiquidationDataProvider.json src/abis/
cp ../../contracts/artifacts/contracts/misc/DeraOracle.sol/DeraOracle.json src/abis/
```

### Step 4: Test Configuration

```bash
# Dry run - checks configuration without executing
npm run dev
```

Expected output:
```
═══════════════════════════════════════════════════════════
   DERA PROTOCOL LIQUIDATION BOT
   Automated liquidation service for Hedera
═══════════════════════════════════════════════════════════

[2025-10-28 10:00:00] INFO: Initializing Liquidation Bot...
[2025-10-28 10:00:01] INFO: ✅ Liquidation Bot initialized successfully
[2025-10-28 10:00:01] INFO: Operator Account: 0.0.123456
[2025-10-28 10:00:01] INFO: Network: testnet
```

Press `Ctrl+C` to stop.

### Step 5: Fund Liquidator Account

Send funds to your liquidator wallet address:

```bash
# Get your liquidator address
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet(process.env.LIQUIDATOR_PRIVATE_KEY); console.log(wallet.address);"
```

**Send to this address:**
- 10,000 USDC (for debt repayment)
- 100 HBAR (for gas fees)

**How to get testnet USDC:**
1. Use Hedera testnet faucet
2. Use USDC testnet faucet (if available)
3. Swap HBAR → USDC on testnet DEX

### Step 6: Run Bot in Production

#### Option A: Run Directly (for testing)
```bash
npm start
```

#### Option B: Use PM2 (recommended for production)
```bash
# Install PM2 globally
npm install -g pm2

# Start bot
pm2 start src/index.js --name dera-liquidation-bot

# View logs
pm2 logs dera-liquidation-bot

# Check status
pm2 status

# Stop bot
pm2 stop dera-liquidation-bot

# Restart bot
pm2 restart dera-liquidation-bot

# Auto-start on system reboot
pm2 startup
pm2 save
```

#### Option C: Docker Deployment
```bash
# Build Docker image
docker build -t dera-liquidation-bot .

# Run container
docker run -d \
  --name dera-bot \
  --env-file .env \
  --restart unless-stopped \
  dera-liquidation-bot

# View logs
docker logs -f dera-bot
```

## Monitoring

### Check Bot Status

```bash
# View real-time logs
pm2 logs dera-liquidation-bot --lines 100

# View log files
tail -f logs/combined.log
tail -f logs/error.log
```

### Monitor Metrics

Bot logs metrics every 5 minutes:

```
[2025-10-28 10:05:00] INFO: 📊 Current Metrics: {
  totalLiquidations: 5,
  successfulLiquidations: 5,
  failedLiquidations: 0,
  totalProfitUSD: 127.50,
  isRunning: true,
  successRate: "100.00%"
}
```

### Monitor Wallet Balance

Create a script to check balances:

```bash
# check-balance.sh
#!/bin/bash

echo "Liquidator Wallet Balance:"
echo "USDC: $(cast balance $LIQUIDATOR_ADDRESS --rpc-url $RPC_URL)"
echo "HBAR: $(cast balance $LIQUIDATOR_ADDRESS --rpc-url $RPC_URL)"
```

## Maintenance

### Daily Tasks
- [ ] Check bot is running: `pm2 status`
- [ ] Review logs for errors: `tail logs/error.log`
- [ ] Verify wallet balances are sufficient

### Weekly Tasks
- [ ] Review metrics and profitability
- [ ] Rotate log files if needed
- [ ] Update monitored addresses if needed
- [ ] Check for contract upgrades

### Monthly Tasks
- [ ] Update dependencies: `npm update`
- [ ] Review and optimize MIN_PROFIT_USD threshold
- [ ] Analyze liquidation patterns
- [ ] Withdraw accumulated profits

## Troubleshooting

### Bot Won't Start

**Error**: "Cannot find module './config'"
```bash
# Solution: Ensure all files exist
ls -la src/
npm install
```

**Error**: "HEDERA_OPERATOR_ID is required"
```bash
# Solution: Check .env file
cat .env
# Ensure all variables are set
```

### No Positions Found

**Issue**: Bot never finds liquidatable positions

**Solutions**:
1. Verify contract addresses in `.env`
2. Check if positions actually exist:
   ```javascript
   // Use Hedera Mirror Node API
   curl "https://testnet.mirrornode.hedera.com/api/v1/contracts/$POOL_ADDRESS/results"
   ```
3. Add specific addresses to monitor:
   ```bash
   MONITORED_ADDRESSES=0xAddress1,0xAddress2
   ```

### Transactions Failing

**Error**: "Insufficient funds"
```bash
# Check USDC balance
# Send more USDC to liquidator address
```

**Error**: "Gas estimation failed"
```bash
# Check HBAR balance
# Send more HBAR for gas
```

**Error**: "Health factor not below threshold"
```bash
# Position may have been liquidated by another bot
# Or health factor recovered
# This is normal in competitive liquidation markets
```

### High Memory Usage

If bot uses too much RAM:

```bash
# Reduce log retention
pm2 flush dera-liquidation-bot

# Reduce check frequency
CHECK_INTERVAL_MS=60000  # Check every 60s instead of 30s
```

## Performance Tuning

### Optimize for Speed

```bash
# Check more frequently
CHECK_INTERVAL_MS=15000  # 15 seconds

# Lower profit threshold (more liquidations)
MIN_PROFIT_USD=5

# Increase max liquidations per cycle
MAX_LIQUIDATIONS_PER_CYCLE=20
```

### Optimize for Profit

```bash
# Check less frequently
CHECK_INTERVAL_MS=60000  # 60 seconds

# Higher profit threshold (only best opportunities)
MIN_PROFIT_USD=50

# Focus on larger positions
MAX_DEBT_TO_COVER_USD=500000
```

## Upgrading to Mainnet

### Before Going to Mainnet:

1. **Test thoroughly on testnet** (minimum 1 week)
2. **Verify profitability** (track all costs)
3. **Increase capital** (mainnet positions are larger)
4. **Get mainnet accounts**
5. **Update .env**:
   ```bash
   NETWORK=mainnet
   RPC_URL=https://mainnet.hashio.io/api
   # Update all contract addresses to mainnet
   ```

### Mainnet Recommendations:

- **Minimum Capital**: $50,000 USDC + 500 HBAR
- **Run redundant bots** (multiple servers)
- **Use monitoring service** (Datadog, New Relic)
- **Set up alerts** (PagerDuty, Telegram)
- **Regular backups** of configuration
- **24/7 monitoring**

## Security Best Practices

### 1. Private Key Management
- Never commit `.env` to git
- Use encrypted storage (AWS Secrets Manager)
- Rotate keys periodically
- Use separate keys for testnet/mainnet

### 2. Bot Security
- Run on secured server (not local machine)
- Use firewall rules
- Disable SSH password auth (use keys only)
- Keep system updated
- Monitor for unauthorized access

### 3. Capital Management
- Start with minimum capital
- Withdraw profits regularly
- Don't store excess funds in bot wallet
- Use multi-sig for large amounts

## Advanced Configuration

### Event-Based Monitoring

Instead of polling, listen to events:

```javascript
// In LiquidationMonitor.js
async setupEventListeners() {
  this.contracts.pool.on('Borrow', async (user, ...args) => {
    logger.info(`New borrow detected from ${user}`);
    await this.checkPosition(user);
  });
}
```

### Telegram Notifications

```javascript
// src/utils/telegram.js
const axios = require('axios');

async function sendTelegramAlert(message) {
  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message
  });
}
```

### Database Integration

Track historical data:

```javascript
// src/database.js
const sqlite3 = require('sqlite3');

class LiquidationDB {
  async saveLiquidation(data) {
    // Store liquidation details
  }

  async getStats() {
    // Retrieve performance metrics
  }
}
```

## Support

Need help?
- GitHub Issues: Report bugs
- Discord: Community support
- Email: support@dera.fi

---

**Ready to deploy?** Follow the steps above and happy liquidating! 🚀
