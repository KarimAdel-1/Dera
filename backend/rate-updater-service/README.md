# Rate Updater Service

Automated service that periodically updates interest rates for all assets in the Dera Protocol Pool contract.

## Overview

This service calls `syncRatesState()` on the Pool contract at regular intervals to keep interest rates up-to-date based on current utilization. Without this service, interest rates would only update when users interact with the protocol.

## Features

- ✅ Automatic rate updates every 60 seconds (configurable)
- ✅ Batch processing of multiple assets
- ✅ Retry logic with exponential backoff
- ✅ Health check and status endpoints
- ✅ Prometheus metrics
- ✅ Alert on failure (webhook)
- ✅ Dry-run mode for testing
- ✅ Graceful shutdown

## Installation

```bash
cd backend/rate-updater-service
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Configuration

- `HEDERA_ACCOUNT_ID`: Your Hedera account ID
- `HEDERA_PRIVATE_KEY`: Your Hedera private key
- `POOL_ADDRESS`: Deployed Pool contract address
- `RPC_URL`: Hedera JSON-RPC endpoint

### Optional Configuration

- `UPDATE_INTERVAL_MS`: Update interval in milliseconds (default: 60000 = 1 minute)
- `ASSETS`: Comma-separated list of asset addresses to update (leave empty for ALL)
- `GAS_LIMIT`: Gas limit for transactions (default: 500000)
- `BATCH_SIZE`: Number of assets to process concurrently (default: 5)
- `DRY_RUN`: Set to `true` to simulate without sending transactions
- `ALERT_ON_FAILURE`: Enable alerts on failure (default: false)
- `ALERT_WEBHOOK_URL`: Webhook URL for alerts

## Usage

### Start the Service

```bash
npm start
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Dry Run Mode (Test without transactions)

Set `DRY_RUN=true` in `.env`, then:

```bash
npm start
```

## API Endpoints

### Health Check
```bash
GET http://localhost:3007/health
```

Returns service health status.

### Get Status
```bash
GET http://localhost:3007/status
```

Returns detailed service status including:
- Update count
- Failure count
- Last update time
- Success rate
- Configuration

### Manual Trigger
```bash
POST http://localhost:3007/update
```

Triggers an immediate rate update (doesn't wait for next interval).

### Prometheus Metrics
```bash
GET http://localhost:3007/metrics
```

Returns metrics in Prometheus format.

### Stop Service
```bash
POST http://localhost:3007/stop
```

Gracefully stops the service.

### Start Service
```bash
POST http://localhost:3007/start
```

Starts the service if it was stopped.

## How It Works

1. **Initialization**: Connects to Pool contract via JSON-RPC
2. **Asset Discovery**: Gets list of assets (from config or Pool contract)
3. **Batch Processing**: Processes assets in configurable batch sizes
4. **Rate Update**: Calls `syncRatesState(asset)` for each asset
5. **Retry Logic**: Retries failed updates up to MAX_RETRIES times
6. **Monitoring**: Logs all updates and exposes metrics

## Transaction Flow

```
Rate Updater Service
        ↓
    syncRatesState(asset)
        ↓
    Pool Contract
        ↓
    Updates liquidity & borrow rates
        ↓
    Emits RatesUpdated event
```

## Monitoring

### Logs

The service uses Winston for logging. Logs are written to:
- Console (with colors)
- `rate-updater.log` file

Log levels: `debug`, `info`, `warn`, `error`

### Metrics

Prometheus metrics available at `/metrics`:
- `rate_updater_updates_total`: Total update cycles
- `rate_updater_failures_total`: Total failed cycles
- `rate_updater_running`: Service running status (1=running, 0=stopped)
- `rate_updater_update_interval_ms`: Update interval

### Alerts

If `ALERT_ON_FAILURE=true`, the service will POST to `ALERT_WEBHOOK_URL` on failures:

```json
{
  "title": "Rate update had failures",
  "timestamp": "2025-10-29T03:00:00.000Z",
  "data": {
    "successful": 4,
    "failed": 1,
    "results": [...]
  }
}
```

## Gas Estimation

Each `syncRatesState()` call costs approximately:
- Gas Used: ~100,000 - 300,000 gas
- Cost per Update: ~$0.01 - $0.05 (depending on gas price)
- Daily Cost (5 assets, 1 min intervals): ~$7 - $36/day

## Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name rate-updater

# Monitor
pm2 logs rate-updater

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Using Docker

```bash
# Build
docker build -t rate-updater-service .

# Run
docker run -d \
  --name rate-updater \
  --env-file .env \
  -p 3007:3007 \
  rate-updater-service
```

### Using systemd

Create `/etc/systemd/system/rate-updater.service`:

```ini
[Unit]
Description=Dera Rate Updater Service
After=network.target

[Service]
Type=simple
User=dera
WorkingDirectory=/path/to/rate-updater-service
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable rate-updater
sudo systemctl start rate-updater
sudo systemctl status rate-updater
```

## Troubleshooting

### Service won't start
- Check `.env` configuration
- Verify Pool contract address is correct
- Ensure RPC_URL is accessible
- Check private key has sufficient HBAR balance

### Updates failing
- Check gas limit (increase if needed)
- Verify Pool contract is not paused
- Check account has sufficient HBAR for gas
- Review logs for specific error messages

### High failure rate
- Increase `MAX_RETRIES`
- Increase `RETRY_DELAY_MS`
- Reduce `BATCH_SIZE` to avoid network congestion
- Check RPC endpoint stability

## Development

### Run Tests
```bash
npm test
```

### Check Logs
```bash
tail -f rate-updater.log
```

### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for verbose logging.

## Architecture

```
┌─────────────────────────────────┐
│   Rate Updater Service          │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Express API (Port 3007)   │ │
│  │  - Health checks           │ │
│  │  - Status endpoint         │ │
│  │  - Manual trigger          │ │
│  │  - Metrics (Prometheus)    │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Rate Updater Core         │ │
│  │  - Asset discovery         │ │
│  │  - Batch processing        │ │
│  │  - Transaction sending     │ │
│  │  - Retry logic             │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Interval Timer            │ │
│  │  (60s default)             │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘
           ↓
    Hedera JSON-RPC
           ↓
    Pool Contract
```

## Security Considerations

- Private key is stored in `.env` (never commit to git)
- Consider using Hedera account delegation for production
- Monitor gas costs to prevent excessive spending
- Set reasonable gas limits to prevent griefing
- Use alerts to detect failures quickly

## License

MIT
