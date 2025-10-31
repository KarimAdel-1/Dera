# Dera Protocol Backend Services

This directory contains all backend services that enhance the Dera Protocol with additional functionality beyond the core smart contracts.

## Quick Start

1. **Setup all services:**
   ```bash
   npm run setup:backend
   ```

2. **Start all services:**
   ```bash
   npm run start:backend:all
   ```

3. **Or start core services only:**
   ```bash
   npm run start:backend:core
   ```

## Services Overview

### 🔸 HCS Event Service (Port 3001)
**Purpose:** Logs all protocol events to Hedera Consensus Service topics for immutable audit trails.

**What it does:**
- Listens to Pool contract events (Supply, Withdraw, Borrow, Repay, Liquidation)
- Batches events and submits to HCS topics
- Provides REST API for event queries
- Verifies event integrity via Mirror Node

**Key Features:**
- Immutable event logging at $0.0001 per event
- Real-time event streaming
- Batch processing for efficiency
- Mirror Node verification

### 🔸 Node Staking Service (Port 3003)
**Purpose:** Automates Hedera node staking to provide dual yield to HBAR suppliers.

**What it does:**
- Stakes idle HBAR reserves with Hedera consensus nodes
- Claims staking rewards automatically (daily)
- Distributes rewards proportionally to HBAR suppliers
- Manages staking positions and accounting

**Key Features:**
- 6-8% additional APY from node staking
- Automated reward distribution
- Configurable node selection
- On-chain accounting transparency

### 🔸 Liquidation Bot (Background)
**Purpose:** Monitors user positions and executes liquidations to protect protocol health.

**What it does:**
- Continuously monitors all borrowing positions
- Calculates health factors using oracle prices
- Executes liquidations when positions become risky
- Prevents bad debt accumulation

**Key Features:**
- Real-time position monitoring
- Automated liquidation execution
- Configurable health factor thresholds
- Gas-efficient liquidation strategies

### 🔸 Monitoring Service (Port 3004)
**Purpose:** Provides system health monitoring and alerting for all services.

**What it does:**
- Health checks for all backend services
- Protocol metrics collection
- System performance monitoring
- Alert notifications for issues

**Key Features:**
- Service uptime monitoring
- Performance metrics dashboard
- Automated alerting
- System health reports

### 🔸 Rate Limiting Service (Port 3005)
**Purpose:** Provides API rate limiting and DDoS protection.

**What it does:**
- Rate limits API requests per user/IP
- Prevents abuse and spam
- Protects backend services from overload
- Provides fair usage policies

**Key Features:**
- Configurable rate limits
- Redis-based rate limiting
- IP-based and user-based limits
- DDoS protection

## Service Dependencies

```
Frontend (3000)
    ↓
Pool Contract (Hedera)
    ↓
HCS Event Service (3001) ← Monitoring Service (3004)
    ↓
HCS Topics (Hedera)

Pool Contract (Hedera)
    ↓
Node Staking Service (3003) ← Monitoring Service (3004)
    ↓
Hedera Node Staking

Pool Contract (Hedera)
    ↓
Liquidation Bot (Background) ← Monitoring Service (3004)
    ↓
Pool.liquidate() calls
```

## Configuration

Each service has its own `.env` file created by the setup script:

- `hcs-event-service/.env` - HCS topics, contract addresses
- `node-staking-service/.env` - Staking configuration, node selection
- `liquidation-bot/.env` - Liquidation thresholds, monitoring intervals
- `monitoring-service/.env` - Service URLs, check intervals
- `rate-limiting-service/.env` - Rate limits, Redis configuration

## Development

### Start individual services:
```bash
npm run start:hcs         # HCS Event Service
npm run start:staking     # Node Staking Service
npm run start:liquidation # Liquidation Bot
npm run start:monitoring  # Monitoring Service
```

### Install dependencies for all services:
```bash
npm run install:backend:all
```

### Service Health Checks:
- HCS Event Service: `http://localhost:3001/health`
- Node Staking Service: `http://localhost:3003/health`
- Monitoring Service: `http://localhost:3004/health`
- Rate Limiting Service: `http://localhost:3005/health`

## Production Deployment

For production deployment, consider:

1. **Docker Deployment:**
   Each service includes a `Dockerfile` and `docker-compose.yml`

2. **PM2 Process Management:**
   Each service includes `ecosystem.config.js` for PM2

3. **Environment Variables:**
   Use proper secrets management for production keys

4. **Monitoring:**
   Set up proper logging and monitoring infrastructure

5. **Scaling:**
   Services can be horizontally scaled as needed

## Troubleshooting

### Common Issues:

1. **Service won't start:**
   - Check if contracts are deployed (`deployment-info.json` exists)
   - Verify environment variables are set correctly
   - Ensure required ports are available

2. **HCS Event Service errors:**
   - Verify HCS topics exist (`hcs-topics.json`)
   - Check Hedera account has sufficient HBAR
   - Validate operator keys are correct

3. **Node Staking Service errors:**
   - Ensure staking contract is deployed
   - Check node ID is valid (0-38)
   - Verify account has minimum staking balance

4. **Liquidation Bot not working:**
   - Check oracle prices are updating
   - Verify liquidation thresholds are reasonable
   - Ensure bot account has gas for transactions

### Logs:

Each service logs to console and can be configured with different log levels:
- `LOG_LEVEL=debug` - Detailed debugging
- `LOG_LEVEL=info` - General information (default)
- `LOG_LEVEL=warn` - Warnings only
- `LOG_LEVEL=error` - Errors only

## Architecture Benefits

The backend services provide several key benefits:

1. **Enhanced User Experience:**
   - Real-time event notifications
   - Automatic reward distribution
   - Position monitoring and alerts

2. **Protocol Security:**
   - Automated liquidations prevent bad debt
   - Continuous health monitoring
   - Rate limiting prevents abuse

3. **Operational Efficiency:**
   - Automated staking maximizes yields
   - Batch processing reduces costs
   - Monitoring prevents downtime

4. **Compliance & Auditability:**
   - Immutable event logs via HCS
   - Complete transaction history
   - Regulatory compliance support

5. **Scalability:**
   - Microservices architecture
   - Horizontal scaling capability
   - Load balancing support