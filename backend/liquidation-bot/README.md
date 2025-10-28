# Dera Protocol Liquidation Bot

Automated liquidation service for Dera Protocol on Hedera. Monitors user positions and executes profitable liquidations.

## Features

- 🔍 **Continuous Monitoring** - Scans for unhealthy positions every 30 seconds
- 💰 **Profitability Calculation** - Only liquidates when profit exceeds threshold
- 🛡️ **Safety Limits** - Configurable max liquidations per cycle
- 📊 **Metrics Tracking** - Success rate, total profit, execution stats
- 🔐 **Hedera Integration** - Native support for Hedera SDK
- 📝 **Comprehensive Logging** - Winston logging with file rotation

## How It Works

### 1. Position Monitoring
The bot queries `LiquidationDataProvider.sol` to check user health factors:
- Health Factor < 1.0 = Liquidatable
- Health Factor ≥ 1.0 = Healthy

### 2. Profitability Check
For each liquidatable position:
```
Expected Profit = (Debt Covered × Liquidation Bonus %) - Gas Costs
```

Only executes if `Expected Profit > MIN_PROFIT_USD`

### 3. Liquidation Execution
Calls `Pool.liquidationCall()`:
- Repays user's debt
- Receives collateral + liquidation bonus (e.g., 5%)
- Logs transaction and updates metrics

## Installation

```bash
cd backend/liquidation-bot
npm install
cp .env.example .env
```

## Configuration

Edit `.env` file:

```bash
# Network
NETWORK=testnet
RPC_URL=https://testnet.hashio.io/api

# Hedera Account
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# Liquidator Account (needs USDC/HBAR to cover debt)
LIQUIDATOR_PRIVATE_KEY=0x...

# Contract Addresses (from deployment)
POOL_ADDRESS=0x...
LIQUIDATION_DATA_PROVIDER_ADDRESS=0x...
ORACLE_ADDRESS=0x...

# Bot Parameters
CHECK_INTERVAL_MS=30000      # Check every 30 seconds
MIN_PROFIT_USD=10            # Minimum $10 profit
ESTIMATED_GAS_COST_USD=5     # Estimated gas cost
```

## Running the Bot

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using PM2 (recommended for production)
```bash
npm install -g pm2
pm2 start src/index.js --name dera-liquidation-bot
pm2 logs dera-liquidation-bot
pm2 status
```

## Bot Output

```
═══════════════════════════════════════════════════════════
   DERA PROTOCOL LIQUIDATION BOT
   Automated liquidation service for Hedera
═══════════════════════════════════════════════════════════

[2025-10-28 10:00:00] INFO: Initializing Liquidation Bot...
[2025-10-28 10:00:01] INFO: ✅ Liquidation Bot initialized successfully
[2025-10-28 10:00:01] INFO: Operator Account: 0.0.123456
[2025-10-28 10:00:01] INFO: Network: testnet
[2025-10-28 10:00:01] INFO: 🚀 Starting liquidation monitoring...
[2025-10-28 10:00:01] INFO: Check interval: 30000ms
[2025-10-28 10:00:01] INFO: Min profit threshold: $10

[2025-10-28 10:00:05] INFO: 🔍 Checking for liquidatable positions...
[2025-10-28 10:00:06] INFO: ✅ No liquidatable positions found

[2025-10-28 10:00:35] INFO: 🔍 Checking for liquidatable positions...
[2025-10-28 10:00:37] INFO: 🎯 Found 1 liquidatable position(s)
[2025-10-28 10:00:37] INFO: 💀 Liquidatable position found: 0xABC... (HF: 0.8542)
[2025-10-28 10:00:37] INFO: 🔨 Processing liquidation for 0xABC...
[2025-10-28 10:00:38] INFO: 💰 Expected profit: $25.50
[2025-10-28 10:00:38] INFO:    Collateral: 0xDEF... (HBAR)
[2025-10-28 10:00:38] INFO:    Debt Asset: 0x123... (USDC)
[2025-10-28 10:00:38] INFO:    Debt to Cover: 500.00 USDC
[2025-10-28 10:00:39] INFO: 📤 Sending liquidation transaction...
[2025-10-28 10:00:40] INFO: ⏳ Transaction sent: 0x789...
[2025-10-28 10:00:45] INFO: ✅ Liquidation confirmed in block 12345
[2025-10-28 10:00:45] INFO: ✅ Liquidation successful! Total profit: $25.50

[2025-10-28 10:05:00] INFO: 📊 Current Metrics: {
  totalLiquidations: 1,
  successfulLiquidations: 1,
  failedLiquidations: 0,
  totalProfitUSD: 25.50,
  isRunning: true,
  successRate: "100.00%"
}
```

## Requirements

### Liquidator Account Must Have:
1. **USDC (or debt token)** - To repay user's debt
   - Amount: Varies based on position sizes
   - Recommended: $10,000+ USDC
2. **HBAR** - For gas fees
   - Amount: ~100 HBAR for gas
3. **Approved Spending** - Bot auto-approves on first liquidation

### Example Capital Requirements:
- **Small positions**: $5,000 USDC + 50 HBAR
- **Medium positions**: $25,000 USDC + 100 HBAR
- **Large positions**: $100,000+ USDC + 200 HBAR

## Architecture

```
LiquidationMonitor
├── initialize()
│   ├── Setup Hedera client
│   ├── Setup Ethers provider
│   └── Load contract instances
│
├── start()
│   └── setInterval(checkAndLiquidate)
│
├── checkAndLiquidate()
│   ├── getLiquidatablePositions()
│   │   └── Query Pool.getUserAccountData()
│   │
│   └── For each position:
│       └── processLiquidation()
│           ├── calculateLiquidationParams()
│           │   ├── Find best collateral asset
│           │   ├── Calculate profit
│           │   └── Check profitability
│           │
│           └── executeLiquidation()
│               ├── Approve debt token
│               └── Call Pool.liquidationCall()
│
└── shutdown()
    └── Log metrics and cleanup
```

## Monitoring

### Logs Location
- **All logs**: `logs/combined.log`
- **Errors only**: `logs/error.log`

### Metrics
Track bot performance:
- Total liquidations executed
- Success/failure rate
- Total profit in USD
- Average profit per liquidation

### Alerts (Future Enhancement)
- Telegram bot for notifications
- Email alerts for failures
- Discord webhook integration

## Troubleshooting

### Bot not finding positions
**Issue**: No liquidatable positions detected
**Solutions**:
- Check `MONITORED_ADDRESSES` in `.env`
- Verify contract addresses are correct
- Ensure positions actually exist with HF < 1.0

### Liquidations failing
**Issue**: Transactions revert
**Solutions**:
- Check liquidator account has enough USDC
- Verify HBAR balance for gas
- Check approval status
- Review error logs in `logs/error.log`

### High gas costs
**Issue**: Liquidations not profitable due to gas
**Solutions**:
- Increase `MIN_PROFIT_USD` threshold
- Reduce `CHECK_INTERVAL_MS` to catch positions earlier
- Optimize for larger liquidations only

## Security Considerations

1. **Private Key Storage**
   - NEVER commit `.env` file
   - Use environment variables in production
   - Consider using AWS Secrets Manager or HashiCorp Vault

2. **Safety Limits**
   - `MAX_LIQUIDATIONS_PER_CYCLE` prevents spam
   - `MAX_DEBT_TO_COVER_USD` limits exposure
   - `MIN_PROFIT_USD` ensures profitability

3. **Access Control**
   - Bot account should only have liquidator role
   - No admin privileges needed
   - Monitor bot account balance regularly

## Performance Optimization

### Efficient Position Tracking
Instead of querying all users on-chain, track users via events:
1. Listen to `Supply`, `Borrow` events
2. Maintain local database of active positions
3. Only check health factors for tracked users

### Parallel Liquidations
Process multiple liquidations simultaneously:
- Check profitability in parallel
- Execute multiple txs in same block
- Increase throughput

### Gas Optimization
- Use `staticcall` for read operations
- Batch multiple liquidations in one tx (future)
- Monitor Hedera gas prices

## Future Enhancements

- [ ] Event-based position tracking (vs polling)
- [ ] Multi-collateral liquidation optimization
- [ ] Telegram bot integration
- [ ] Web dashboard for monitoring
- [ ] Automatic capital rebalancing
- [ ] MEV protection strategies
- [ ] Flashbot integration (if applicable to Hedera)

## Contributing

To add features:
1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit pull request

## License

MIT License - See LICENSE file

## Support

- GitHub Issues: Report bugs
- Discord: Community support
- Email: team@dera.fi

---

**⚠️ DISCLAIMER**: This bot trades with real funds. Test thoroughly on testnet before mainnet deployment. No guarantees of profitability. Use at your own risk.
