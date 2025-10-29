# Dera Protocol - Rate Limiting & Anti-MEV Protection Service

Comprehensive rate limiting and anti-MEV protection service for Dera Protocol on Hedera.

## Overview

This service provides multiple layers of protection against abuse, DoS attacks, and MEV-like exploits:

1. **Rate Limiting**: Configurable limits on API requests and operations
2. **Transaction Cooldowns**: Prevents rapid successive transactions
3. **Anti-MEV Protections**: Guards against sandwich attacks and similar exploits
4. **Price Impact Limits**: Prevents transactions with excessive market impact
5. **Oracle Staleness Checks**: Ensures fresh price data
6. **Slippage Protection**: Validates execution prices

## Features

### Rate Limiting

- **Global Rate Limiting**: Overall request limits per IP/wallet
- **Endpoint-Specific Limits**: Different limits for different operations
- **Redis-Based Distributed Limiting**: Scales across multiple instances
- **Graceful Degradation**: Falls back to in-memory when Redis unavailable

#### Predefined Rate Limiters

| Limiter | Window | Max Requests | Use Case |
|---------|--------|--------------|----------|
| Global | 15 min | 1000 | All endpoints |
| Transaction | 1 min | 5 | Write operations |
| Supply/Borrow | 2 min | 10 | Pool operations |
| Liquidation | 1 min | 30 | Liquidation calls |
| Oracle | 1 min | 100 | Price queries |

### Anti-MEV Protections

#### Transaction Cooldown
Prevents rapid successive transactions from the same wallet:
- Supply: 30 seconds
- Borrow: 60 seconds
- Withdraw: 30 seconds
- Repay: 30 seconds

#### Rapid Operation Detection
Monitors operation patterns and blocks suspicious activity:
- Max 10 operations per minute per wallet
- Sliding window tracking
- Automatic flagging

#### Price Impact Protection
Limits market impact of large transactions:
- Default max impact: 5% of liquidity
- Configurable per operation type
- Real-time impact calculation

#### Oracle Staleness Check
Ensures price data is fresh:
- Max age: 5 minutes (default)
- Prevents stale price exploitation
- Configurable threshold

#### Slippage Protection
Validates execution prices match expectations:
- Checks expected vs. actual price
- User-defined slippage tolerance
- Prevents front-running impact

#### Same-Block Prevention
Prevents multiple operations in rapid succession:
- 3-second minimum between operations
- Hedera consensus round protection
- Per-wallet, per-operation type

#### Flash Loan Detection
Detects and flags flash loan-like patterns:
- Monitors borrow/repay timing
- Flags suspicious patterns
- Logs for review (doesn't block)

#### Transaction Size Limits
Prevents excessively large transactions:
- Max 25% of available liquidity (default)
- Protects against liquidity draining
- Configurable per operation

## Installation

### Prerequisites

- Node.js 18+
- Redis (optional but recommended for production)

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Start the service
npm start
```

## Configuration

### Environment Variables

```env
# Server
PORT=3005
NODE_ENV=development

# Redis (Optional)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limits
GLOBAL_RATE_LIMIT=1000
GLOBAL_RATE_WINDOW_MS=900000

# Cooldowns (milliseconds)
TRANSACTION_COOLDOWN_MS=30000
SUPPLY_COOLDOWN_MS=30000
BORROW_COOLDOWN_MS=60000
WITHDRAW_COOLDOWN_MS=30000
REPAY_COOLDOWN_MS=30000

# Anti-MEV
MAX_OPERATIONS_PER_MINUTE=10
MAX_PRICE_IMPACT_PERCENT=5
MAX_ORACLE_AGE_SECONDS=300
MAX_TRANSACTION_SIZE_PERCENT=25
MAX_SLIPPAGE_PERCENT=1

# Logging
LOG_LEVEL=info
LOG_DIR=./logs
```

## Usage

### As a Validation Service

Call validation endpoints before executing transactions:

```javascript
// Example: Validate supply operation
const response = await fetch('http://localhost:3005/validate/supply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Wallet-Address': '0.0.123456'
  },
  body: JSON.stringify({
    walletAddress: '0.0.123456',
    operationType: 'supply',
    asset: '0.0.111111',
    amount: '1000000000',
    availableLiquidity: '5000000000',
    oracleTimestamp: Math.floor(Date.now() / 1000)
  })
});

if (response.ok) {
  // Proceed with transaction
  await executeSupply();
} else {
  // Handle rate limit or validation error
  const error = await response.json();
  console.error(error.message);
}
```

### As Importable Middleware

```javascript
import {
  transactionRateLimiter,
  supplyBorrowRateLimiter
} from './middleware/rateLimiter.js';
import {
  transactionCooldown,
  priceImpactProtection
} from './middleware/antiMEV.js';

// Apply to Express routes
app.post('/api/supply',
  supplyBorrowRateLimiter,
  transactionCooldown,
  priceImpactProtection(5),
  handleSupply
);
```

## API Endpoints

### Validation Endpoints

#### POST /validate/supply
Validates supply operations.

**Headers:**
- `X-Wallet-Address`: Wallet performing the operation

**Body:**
```json
{
  "walletAddress": "0.0.123456",
  "operationType": "supply",
  "asset": "0.0.111111",
  "amount": "1000000000",
  "availableLiquidity": "5000000000",
  "totalSupply": "10000000000",
  "oracleTimestamp": 1234567890
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Supply operation validated",
  "timestamp": 1234567890123
}
```

**Response (Rate Limited):**
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Please wait 30 seconds before performing this operation again.",
  "remainingCooldown": 30
}
```

#### POST /validate/borrow
Validates borrow operations with stricter checks.

#### POST /validate/withdraw
Validates withdraw operations.

#### POST /validate/repay
Validates repay operations and detects flash loan patterns.

#### POST /validate/liquidation
Validates liquidation operations (more lenient limits).

#### POST /validate/oracle
Validates oracle price queries.

#### POST /validate/transaction
Generic transaction validation.

### Monitoring Endpoints

#### GET /health
Service health check.

**Response:**
```json
{
  "success": true,
  "service": "Rate Limiting & Anti-MEV Protection",
  "status": "healthy",
  "timestamp": 1234567890123,
  "redis": "enabled"
}
```

#### GET /metrics/:walletAddress
Get metrics for a specific wallet.

**Response:**
```json
{
  "success": true,
  "walletAddress": "0.0.123456",
  "metrics": {
    "recentOperations": 5,
    "cooldownStatus": "active",
    "flagged": false
  },
  "timestamp": 1234567890123
}
```

## Deployment

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs dera-rate-limiting

# Restart
pm2 restart dera-rate-limiting

# Stop
pm2 stop dera-rate-limiting
```

### Manual Deployment

```bash
# Production start
NODE_ENV=production npm start
```

## Architecture

```
┌─────────────────────────────────────────────┐
│         Client Application / DApp           │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│     Rate Limiting & Anti-MEV Service        │
│  ┌─────────────────────────────────────┐   │
│  │     Rate Limiter Middleware         │   │
│  │  • Global Limits                    │   │
│  │  • Endpoint Limits                  │   │
│  │  • Wallet-based Tracking            │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │     Anti-MEV Middleware             │   │
│  │  • Transaction Cooldowns            │   │
│  │  • Rapid Operation Detection        │   │
│  │  • Price Impact Protection          │   │
│  │  • Oracle Staleness Checks          │   │
│  │  • Slippage Protection              │   │
│  └─────────────────────────────────────┘   │
└─────────────┬───────────────────────────────┘
              │
              ▼
        ┌─────────┐
        │  Redis  │  (Optional but recommended)
        └─────────┘
```

## Security Considerations

### Rate Limiting Bypass Prevention
- Wallet address-based tracking (not just IP)
- Redis-backed distributed limiting
- No rate limit info leakage in responses (standard headers only)

### MEV Protection Philosophy
Hedera's consensus mechanism prevents traditional MEV, but we protect against:
- Rapid transaction sequences that could exploit price movements
- Large transactions that could manipulate markets
- Stale price oracle exploitation
- Liquidity draining attacks

### What This Doesn't Prevent
- Network-level DDoS (use Cloudflare/WAF)
- Smart contract exploits (requires audits)
- Social engineering attacks

## Performance

### Benchmarks
- Validation latency: <5ms (in-memory), <20ms (Redis)
- Throughput: 10,000+ req/s per instance
- Memory usage: ~50MB base + ~1KB per tracked wallet

### Scaling
- Horizontal: Add more service instances behind load balancer
- Vertical: Increase Redis memory for more tracked wallets
- Sharding: Use Redis cluster for extreme scale

## Monitoring & Logging

### Log Files
- `logs/rate-limiting-YYYY-MM-DD.log`: All operations
- `logs/errors-YYYY-MM-DD.log`: Errors only
- Daily rotation with 14-day retention

### Log Levels
- `error`: Critical errors
- `warn`: Rate limits exceeded, suspicious patterns
- `info`: Service status, connections
- `debug`: Detailed request info

### Metrics to Monitor
- Rate limit hit rate
- Cooldown violations
- Flash loan pattern detections
- Average validation latency
- Redis connection status

## Troubleshooting

### Issue: High latency on validations
**Solution:** Enable Redis, check network latency to Redis

### Issue: Too many false positives
**Solution:** Adjust cooldown timers and operation limits in `.env`

### Issue: Redis connection failures
**Solution:** Check Redis connectivity, service will fall back to in-memory

### Issue: Wallet addresses not being tracked
**Solution:** Ensure `X-Wallet-Address` header is set in requests

## Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev
```

### Adding Custom Middleware
```javascript
export function customProtection(options = {}) {
  return (req, res, next) => {
    // Your protection logic
    next();
  };
}
```

## Integration Examples

### With Smart Contract Calls

```javascript
// Before executing contract call
async function executeSupply(asset, amount, wallet) {
  // 1. Validate with rate limiting service
  const validation = await fetch('http://localhost:3005/validate/supply', {
    method: 'POST',
    headers: {
      'X-Wallet-Address': wallet,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      walletAddress: wallet,
      operationType: 'supply',
      asset,
      amount,
      oracleTimestamp: Math.floor(Date.now() / 1000)
    })
  });

  if (!validation.ok) {
    throw new Error('Rate limit exceeded');
  }

  // 2. Execute contract call
  const tx = await pool.supply(asset, amount, wallet, 0);
  await tx.wait();
}
```

### With Frontend DApp

```javascript
// Frontend validation before signing
async function handleSupply() {
  try {
    // Validate first
    const canProceed = await validateOperation('supply', {
      walletAddress: userWallet,
      asset: selectedAsset,
      amount: supplyAmount
    });

    if (!canProceed) {
      toast.error('Please wait before performing this operation');
      return;
    }

    // Proceed with transaction
    await executeSupplyTransaction();
  } catch (error) {
    handleError(error);
  }
}
```

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/dera-protocol/issues
- Discord: https://discord.gg/dera
- Email: support@deraprotocol.com
