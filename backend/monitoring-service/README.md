# Dera Protocol Monitoring & Emergency Control Service

Real-time monitoring service with automated emergency controls for Dera Protocol on Hedera.

## Features

- 🔍 **Real-time Monitoring** - Continuous health checks of all system components
- 🚨 **Multi-Channel Alerts** - Email, Telegram, and Webhook notifications
- 🛑 **Emergency Controls** - Automated pause on critical issues (optional)
- 📊 **Metrics Collection** - TVL, utilization, health factors, liquidations
- 💊 **Health Checks** - Monitors contracts, services, and dependencies
- 📈 **Performance Tracking** - Alert history and statistics

## What Gets Monitored

### Smart Contracts
- ✅ **Pool** - Pause status, basic functionality
- ✅ **Oracle** - Price feeds, staleness
- ✅ **Staking** - Staking status, rewards

### Backend Services
- ✅ **Liquidation Bot** - Service uptime
- ✅ **HCS Event Service** - Event submission status
- ✅ **Staking Service** - Reward claiming status

### External Dependencies
- ✅ **RPC Endpoint** - Hedera JSON-RPC availability
- ✅ **Mirror Node** - API responsiveness

### Protocol Metrics
- ✅ **TVL** - Total Value Locked
- ✅ **Utilization** - Per-asset utilization rates
- ✅ **Health Factors** - Average user health
- ✅ **Liquidations** - Pending liquidation count
- ✅ **Transactions** - Large liquidation alerts

## Alert Levels

### INFO ℹ️
Normal operations, periodic reports
- Service started/stopped
- Routine health checks passed

### WARNING ⚠️
Attention needed, but not critical
- High utilization (>95%)
- Service temporarily unavailable
- Large liquidation executed

### CRITICAL 🚨
Immediate action required
- Oracle not responding
- Average health factor < 1.2
- Many pending liquidations
- Pool contract inaccessible

### EMERGENCY 🛑
Auto-trigger pause (if enabled)
- Oracle returning zero prices
- RPC endpoint down
- Critical contract failure

## Installation

```bash
cd backend/monitoring-service
npm install
cp .env.example .env
```

## Configuration

Edit `.env` file:

### Required Configuration

```bash
# Admin key for emergency pause
ADMIN_PRIVATE_KEY=0x...

# Contract addresses
POOL_ADDRESS=0x...
POOL_CONFIGURATOR_ADDRESS=0x...
ORACLE_ADDRESS=0x...
NODE_STAKING_CONTRACT_ADDRESS=0x...
```

### Alert Thresholds

```bash
MIN_HEALTH_FACTOR_THRESHOLD=1.2        # Alert if avg < 1.2
MAX_UTILIZATION_THRESHOLD=0.95         # Alert if > 95%
MAX_PENDING_LIQUIDATIONS=50            # Alert if > 50
LARGE_LIQUIDATION_THRESHOLD=10000      # Alert for > $10k
```

### Emergency Controls

```bash
# WARNING: Auto-pause will pause the protocol automatically
AUTO_PAUSE_ENABLED=false    # Set to true to enable
```

**Auto-Pause Triggers:**
- Oracle returns zero prices
- RPC endpoint unreachable
- Average health factor critically low

### Email Alerts

```bash
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password    # Use app password, not account password
EMAIL_TO=admin@dera.fi
```

**Gmail Setup:**
1. Enable 2FA on your Google account
2. Generate app password: https://myaccount.google.com/apppasswords
3. Use app password in `EMAIL_PASS`

### Telegram Alerts

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

**Setup:**
1. Create bot: Talk to @BotFather on Telegram
2. Get token from BotFather
3. Start chat with your bot
4. Get chat ID: Send message, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`

### Webhook Alerts

```bash
WEBHOOK_URL=https://your-webhook.com/alerts
```

Webhook will receive POST requests:

```json
{
  "level": "CRITICAL",
  "title": "Oracle Not Responding",
  "message": "Oracle not responding",
  "details": {},
  "timestamp": "2025-10-28T12:00:00.000Z",
  "service": "dera-monitoring"
}
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Using PM2
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 logs dera-monitoring
pm2 status
```

### Using Docker
```bash
docker-compose up -d
docker logs -f dera-monitoring
```

## Service Output

```
═══════════════════════════════════════════════════════════
   DERA PROTOCOL MONITORING & EMERGENCY CONTROL
   Real-time monitoring and automated emergency response
═══════════════════════════════════════════════════════════

[10:00:00] INFO: Initializing Monitoring Service...
[10:00:01] INFO: ✅ Email alerts enabled
[10:00:01] INFO: ✅ Telegram alerts enabled
[10:00:01] INFO: ✅ Monitoring Service initialized successfully
[10:00:02] INFO: 🚀 Starting Monitoring Service...
[10:00:02] INFO: 💓 Starting health checks...
[10:00:02] INFO:    Interval: 30000ms
[10:00:02] INFO: 📊 Starting metrics collection...
[10:00:02] INFO:    Interval: 60000ms
[10:00:02] INFO: 👂 Starting event monitoring...

# Normal Health Check
[10:00:05] DEBUG: 🔍 Performing health check...
[10:00:06] DEBUG: ✅ Health check complete

# Warning Alert
[10:05:00] WARN: ⚠️  1 warning(s) detected
[10:05:00] WARN: [WARNING] High Utilization: HBAR utilization is 96.50%

# Critical Alert
[10:10:00] ERROR: 🚨 1 critical issue(s) detected!
[10:10:00] ERROR: 🚨 CRITICAL: Oracle Not Responding
[10:10:00] ERROR:    Oracle not responding

# Emergency Pause (if AUTO_PAUSE_ENABLED=true)
[10:10:01] ERROR: 🛑 AUTO-PAUSE TRIGGERED
[10:10:01] ERROR: 🛑 EMERGENCY PAUSE INITIATED
[10:10:01] ERROR:    Reason: Oracle Not Responding
[10:10:02] ERROR: ⏳ Pause transaction sent: 0x789...
[10:10:05] ERROR: ✅ PROTOCOL PAUSED SUCCESSFULLY

# Metrics
[10:15:00] INFO: 📊 Monitoring Metrics: {
  totalAlerts: 25,
  criticalAlerts: 2,
  servicesUp: 7,
  servicesDown: 0,
  isRunning: true
}
```

## Alert Examples

### Email Alert

![Email Alert Example](docs/email-alert.png)

Subject: `[CRITICAL] Oracle Not Responding - Dera Protocol`

### Telegram Alert

```
🚨 *Oracle Not Responding*

*Level:* CRITICAL
*Message:* Oracle not responding

*Details:*
```json
{
  "error": "Request timeout"
}
```

_2025-10-28T12:00:00.000Z_
```

## Monitoring Dashboard (Optional)

The service can expose a web dashboard:

```bash
npm run dashboard
```

Visit: `http://localhost:3000`

Shows:
- Real-time health status
- Current metrics
- Alert history
- System uptime

## Emergency Procedures

### Manual Emergency Pause

If you need to manually pause the protocol:

```bash
# Via ethers.js
const pool = new ethers.Contract(POOL_ADDRESS, poolABI, wallet);
await pool.pause();

# Via Hashscan (for emergencies)
1. Go to hashscan.io
2. Navigate to Pool contract
3. Call pause() function
```

### Manual Unpause

After resolving the issue:

```bash
const pool = new ethers.Contract(POOL_ADDRESS, poolABI, wallet);
await pool.unpause();
```

**Note**: Only Emergency Admin can pause/unpause.

## Troubleshooting

### Alerts not sending

**Issue**: Service running but no alerts received

**Solutions**:
1. Check alert configuration in `.env`
2. Verify email/Telegram credentials
3. Check logs: `tail -f logs/combined.log`
4. Test alert manager: Send test alert

### False positives

**Issue**: Too many alerts for non-issues

**Solutions**:
1. Adjust thresholds in `.env`
2. Increase check intervals
3. Add cooldown periods

### Service crashing

**Issue**: Service keeps restarting

**Solutions**:
1. Check error logs: `tail -f logs/error.log`
2. Verify all contract addresses are correct
3. Ensure admin private key is valid
4. Check RPC endpoint is accessible

### Auto-pause triggering incorrectly

**Issue**: Protocol paused when it shouldn't be

**Solutions**:
1. Review pause triggers in code
2. Adjust `MIN_HEALTH_FACTOR_THRESHOLD`
3. Disable auto-pause: `AUTO_PAUSE_ENABLED=false`
4. Monitor manually instead

## Best Practices

### 1. Test Alerts First

Before going live, test all alert channels:

```bash
# Send test email
# Send test Telegram message
# Trigger test webhook
```

### 2. Use Conservative Thresholds

Start with loose thresholds and tighten over time:

```bash
MIN_HEALTH_FACTOR_THRESHOLD=1.1   # Start loose
MAX_UTILIZATION_THRESHOLD=0.98     # Start high
```

### 3. Disable Auto-Pause Initially

Only enable after thorough testing:

```bash
AUTO_PAUSE_ENABLED=false    # Test manually first
```

### 4. Monitor the Monitor

Set up external monitoring for this service:
- Uptime monitors (Pingdom, UptimeRobot)
- Server monitoring (Datadog, New Relic)
- Log aggregation (ELK stack)

### 5. Redundancy

Run multiple instances:
- Primary instance with all features
- Backup instance (alerts only)
- Different geographic locations

## Integration with Existing Services

The monitoring service can check health of:

1. **Liquidation Bot** - Via HTTP health endpoint
2. **HCS Service** - Via HTTP health endpoint
3. **Staking Service** - Via HTTP health endpoint

Add health endpoints to each service:

```javascript
// In each service
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});
```

## Performance Considerations

### Resource Usage

- **CPU**: Low (~5% under normal load)
- **RAM**: 100-200 MB
- **Network**: Minimal (periodic RPC calls)

### Scaling

For high-traffic protocols:
- Increase check intervals
- Use caching for metrics
- Batch alert sending
- Implement rate limiting

## Security Considerations

### Private Key Management

- **CRITICAL**: Store `ADMIN_PRIVATE_KEY` securely
- Use environment variables, never commit
- Rotate keys periodically
- Use hardware wallet for mainnet

### Access Control

- Monitoring service needs Emergency Admin role
- Limit who can trigger manual pause
- Audit all pause/unpause events

### Alert Security

- Use app passwords for email (not account password)
- Keep Telegram bot token private
- Secure webhook endpoints (HTTPS + auth)

## Future Enhancements

- [ ] Web dashboard with real-time charts
- [ ] Historical alert analytics
- [ ] Machine learning for anomaly detection
- [ ] Automated incident response playbooks
- [ ] Mobile app for alerts
- [ ] Integration with PagerDuty/Opsgenie
- [ ] Customizable alert rules
- [ ] Multi-signature for emergency pause

## FAQ

**Q: Will auto-pause affect user funds?**
A: Pause only stops new operations (supply, borrow). Existing positions are safe. Users can still repay and withdraw.

**Q: How quickly does auto-pause trigger?**
A: Typically within 30 seconds of detecting critical issue (one health check cycle).

**Q: Can I customize what gets monitored?**
A: Yes, edit `HealthChecker.js` and `MetricsCollector.js` to add custom checks.

**Q: What happens if monitoring service goes down?**
A: Protocol continues operating normally. No alerts sent. Consider running redundant instances.

**Q: How do I silence alerts temporarily?**
A: Set alert levels in code or disable specific channels in `.env`.

## License

MIT License

## Support

- GitHub Issues: Report bugs
- Discord: Community support
- Email: team@dera.fi

---

**⚠️ IMPORTANT: Test thoroughly on testnet before enabling auto-pause on mainnet!**
