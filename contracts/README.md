# Dera Smart Contracts

Smart contracts for the Dera decentralized lending platform on Hedera.

## Prerequisites

- Node.js 18+
- Hedera testnet account
- Testnet HBAR for gas fees

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory (one level up from this `contracts` folder):

```bash
cd ..
cp .env.example .env
```

Edit `.env` and add your Hedera testnet credentials:

```bash
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxx  # Your testnet account ID
HEDERA_PRIVATE_KEY=302e020100300506032b657004220420xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Get Hedera Testnet Credentials

1. Visit [Hedera Portal](https://portal.hedera.com/)
2. Create a testnet account
3. Get free testnet HBAR from the faucet
4. Copy your Account ID and Private Key

**Important:** Your private key should be in DER-encoded format (starts with `302e020100300506032b6570042204`) or as a raw 64-character hex string.

## Deployment

### Deploy to Hedera Testnet

```bash
npm run deploy:testnet
```

This will:
1. Deploy all 6 contracts (LPInstant, LPWarm, LPCold, PriceOracle, LendingPool, BorrowingContract)
2. Set up connections between contracts
3. Save deployment addresses to `deployments/testnet-latest.json`
4. Display contract addresses for your `.env` file

### Deploy to Hedera Mainnet

```bash
npm run deploy:mainnet
```

**Warning:** Ensure you have real HBAR for mainnet deployment!

## Testing

```bash
npm test
```

## Contracts Overview

### LendingPool
Manages lender deposits across three tiers:
- **Tier 1 (Instant)**: 30% lendable, no lock
- **Tier 2 (Warm)**: 70% lendable, 30-day notice
- **Tier 3 (Cold)**: 100% lendable, 90-day lock

### BorrowingContract
Handles borrowing with:
- Dynamic collateral ratios (130%-200%) based on iScore
- Interest rates (5%-12% APR) adjusted by credit score
- Automated liquidations when health factor < 1.0

### PriceOracle
Provides HBAR/USD price feed with:
- Circuit breaker protection (20% max change)
- Staleness detection (15 minutes)
- 8 decimal precision

### LP Tokens
Three non-transferable ERC-20 tokens representing shares:
- dLP-Instant (Tier 1)
- dLP-Warm (Tier 2)
- dLP-Cold (Tier 3)

## After Deployment

After successful deployment, update your `.env` file with the deployed contract addresses:

```bash
LENDING_POOL_ADDRESS=0.0.xxxxx
BORROWING_CONTRACT_ADDRESS=0.0.xxxxx
PRICE_ORACLE_ADDRESS=0.0.xxxxx
LP_INSTANT_TOKEN_ADDRESS=0.0.xxxxx
LP_WARM_TOKEN_ADDRESS=0.0.xxxxx
LP_COLD_TOKEN_ADDRESS=0.0.xxxxx
```

These addresses will be displayed at the end of deployment and saved to `deployments/testnet-latest.json`.

## Troubleshooting

### "No private key configured"
- Make sure you have a `.env` file in the root directory (not in `contracts/`)
- Verify `HEDERA_PRIVATE_KEY` is set correctly

### "Private key too long"
- This error has been fixed in the latest version
- Your private key should work in DER format or raw hex

### Compilation errors
- Run `npm run clean` then `npm run compile`
- Ensure you're using the latest code from the repository

## Documentation

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hedera Documentation](https://docs.hedera.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
