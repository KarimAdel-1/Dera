# Dera - Decentralized Lending Platform on Hedera

Dera is a comprehensive DeFi lending and borrowing platform built on the Hedera network, featuring multi-tier liquidity pools, HBAR staking integration, and a dynamic credit scoring system (iScore).

## Architecture Overview

The platform consists of four main layers:

### Layer 1: Smart Contracts (On-Chain)
- **LendingPool**: Manages lender deposits across three liquidity tiers
- **BorrowingContract**: Handles collateral, loans, repayments, and liquidations
- **PriceOracle**: Provides reliable HBAR/USD price feeds
- **LP Tokens**: Three ERC-20 tokens representing shares in each tier

### Layer 2: Backend Services (Off-Chain)
- **Proxy Account Manager**: Creates and manages Hedera accounts for staking
- **Price Oracle Service**: Fetches and updates HBAR/USD prices
- **Health Monitor**: Monitors loan health factors and triggers liquidations
- **iScore Calculator**: Maintains user credit scores
- **Event Listener**: Bridges blockchain events to backend actions

### Layer 3: Data Storage
- Supabase PostgreSQL database
- User profiles, loan records, pool statistics
- Encrypted private key storage

### Layer 4: Frontend Application
- Next.js application with TailwindCSS
- HashConnect wallet integration
- Real-time data display and transaction management

## Project Structure

```
Dera/
├── contracts/              # Smart contracts (Solidity)
│   ├── LendingPool.sol
│   ├── BorrowingContract.sol
│   ├── PriceOracle.sol
│   └── tokens/
│       ├── LPInstant.sol
│       ├── LPWarm.sol
│       └── LPCold.sol
├── backend/               # Backend services (Node.js)
│   ├── services/
│   │   ├── proxyAccountManager/
│   │   ├── priceOracleService/
│   │   ├── healthMonitor/
│   │   ├── iScoreCalculator/
│   │   └── eventListener/
│   └── database/
│       └── schema/
├── frontend/              # Next.js application
│   ├── pages/
│   ├── components/
│   └── utils/
└── docs/                  # Documentation
```

## Technology Stack

- **Smart Contracts**: Solidity 0.8.x, Hardhat
- **Backend**: Node.js 18+, Express.js, Hedera SDK
- **Frontend**: Next.js, React, TailwindCSS, HashConnect
- **Database**: Supabase (PostgreSQL)
- **Infrastructure**: Vercel (frontend)

## Key Features

### Three-Tier Liquidity System
1. **Tier 1 (Instant)**: 30% lendable, no lock period
2. **Tier 2 (Warm)**: 70% lendable, 30-day withdrawal notice
3. **Tier 3 (Cold)**: 100% lendable, 90-day lock period

### Dynamic iScore Credit System
Credit scores (300-1000) determine:
- Collateral ratios (130%-200%)
- Interest rates (5%-12% APR)
- Borrowing limits

### Staking Rewards Distribution
40% → Borrower | 30% → Protocol | 20% → Lenders | 10% → Insurance

### Automated Liquidations
Health factor monitoring with automatic liquidation when HF < 1.0

## Getting Started

### Prerequisites
- Node.js 18+
- Hedera testnet account
- Supabase account

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Deploy contracts to Hedera testnet
cd contracts
npm run deploy:testnet

# Start backend services
cd ../backend
npm run dev

# Start frontend
cd ../frontend
npm run dev
```

## Environment Variables

See `.env.example` for required configuration.

## Documentation

- [System Architecture](./docs/architecture.md)
- [Smart Contract Specifications](./docs/contracts.md)
- [Backend Services](./docs/backend.md)
- [API Reference](./docs/api.md)

## License

MIT

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
