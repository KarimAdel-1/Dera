# DERA PROTOCOL

**Decentralized Lending Platform with Multi-Tier Liquidity and Sustainable Yield on Hedera**

**Track:** Onchain Finance & RWA

**Hackathon Submission:** This project demonstrates comprehensive integration with Hedera services including HCS, HTS, Smart Contracts, and Node Staking to create a production-ready DeFi lending platform optimized for African markets.

---

## 📋 Table of Contents

- [Quick Links for Judges](#-quick-links-for-judges)
- [Project Overview](#-project-overview)
- [Hedera Integration Summary](#-hedera-integration-summary)
- [Quick Start (5 Minutes)](#-quick-start-5-minutes)
- [Deployment & Setup Instructions](#-deployment--setup-instructions)
- [Architecture](#-architecture)
- [Deployed Hedera IDs](#-deployed-hedera-ids)
- [Running Environment](#-running-environment)
- [Security & Credentials](#-security--credentials)
- [Testing the Protocol](#-testing-the-protocol)
- [Code Quality](#-code-quality)
- [Project Structure](#-project-structure)
- [Economic Model](#-economic-model)
- [Future Roadmap](#-future-roadmap)

---

## 🎯 Quick Links for Judges

**⚡ Super Fast Start:**
- **[JUDGE_QUICKSTART.md](./JUDGE_QUICKSTART.md)** - 3-step deployment guide with interactive setup
- **[INTERACTIVE_CREDENTIALS_SETUP.md](./INTERACTIVE_CREDENTIALS_SETUP.md)** - Details on automated credential management

**Essential Commands:**
```bash
npm run deploy:hackathon  # Interactive deployment with credential prompts (5-8 minutes)
cd frontend && npm run dev # Start frontend
```

---

## 🎯 Project Overview

**Dera Protocol** is a decentralized lending and borrowing platform built natively on Hedera that enables users to:

- **Supply assets** (HBAR, USDC, etc.) to earn interest
- **Borrow assets** against collateral at competitive rates
- **Earn dual yield** through DeFi interest + Hedera node staking rewards
- **Access transparent, immutable audit logs** via Hedera Consensus Service (HCS)
- **Benefit from low, predictable fees** (~$0.10 per transaction vs. $50+ on Ethereum)

### Why Hedera for Africa?

African markets require DeFi solutions with:
- **Predictable costs**: Hedera's fixed fees ($0.0001-$0.10) enable business planning
- **High throughput**: 10,000+ TPS supports mass adoption
- **Fast finality**: 3-5 second settlement for better UX
- **Energy efficiency**: Carbon-negative network aligns with sustainability goals

---

## 🚀 Hedera Integration Summary

Dera Protocol deeply integrates **four core Hedera services** to create a production-ready DeFi platform:

### 1. Hedera Consensus Service (HCS) - Immutable Event Logging

**Why HCS?**
We chose HCS for immutable logging of all critical protocol events because its predictable **$0.0001 fee per message** guarantees operational cost stability, which is essential for low-margin DeFi operations in African markets. Unlike traditional databases or Layer-1 logs that can be pruned or censored, HCS provides a verifiable, tamper-proof audit trail accessible via Mirror Nodes forever.

**Implementation:**
- **Contract:** `DeraHCSEventStreamer.sol` manages topic submissions on-chain
- **Backend Service:** `hcs-event-service` listens to events and batch-submits to HCS
- **Topics:** 5 dedicated topics for different event types

**Transaction Types Executed:**
- `TopicMessageSubmitTransaction` - Submit event data to HCS topics
- `TopicCreateTransaction` - Initialize event logging topics
- `TopicInfoQuery` - Verify topic metadata and admin keys

**Economic Justification:**
- **Cost per event:** $0.0001 (vs. $2-5 on Ethereum for event emission)
- **Annual cost for 1M events:** $100 (vs. $2M-5M on Ethereum)
- **Benefit:** Enables full auditability for regulatory compliance at negligible cost
- **African market fit:** Transparent operations build trust in emerging markets with weak institutional trust

**Key Features:**
- All supply, withdraw, borrow, repay, and liquidation events logged
- Queryable via Mirror Node REST API for analytics
- Immutable proof for dispute resolution and compliance
- Real-time event streaming to frontend for transparency

**Code Reference:** `contracts/contracts/hedera/DeraHCSEventStreamer.sol:1-150`, `backend/hcs-event-service/src/HCSEventService.js:1-300`

---

### 2. Hedera Token Service (HTS) - Native Multi-Asset Support

**Why HTS?**
We integrated HTS to leverage native token operations on Hedera because it provides **gasless token transfers** for users (only the protocol pays) and **atomic multi-asset transactions**. This is critical for African users who may struggle with high gas fees on other chains.

**Implementation:**
- **Contract Integration:** `Pool.sol` uses HTS precompile interface at `0x167`
- **Supported Assets:** HBAR (native), USDC, SAUCE, and any HTS tokens
- **Operations:** Supply, withdraw, borrow, repay with automatic balance management

**Transaction Types Executed:**
- `TokenAssociateTransaction` - Associate tokens with accounts
- `TokenTransferTransaction` - Execute multi-asset transfers
- `TokenCreateTransaction` - Create derivative tokens (dTokens)
- `AccountBalanceQuery` - Query token balances
- `TokenInfoQuery` - Fetch token metadata

**Economic Justification:**
- **Cost per transfer:** $0.001 (vs. $5-50 on Ethereum for ERC-20 transfers)
- **Gasless UX:** Users don't pay gas, protocol subsidizes via yield
- **Multi-asset efficiency:** Atomic swaps reduce failed transactions
- **African market fit:** Enables micro-transactions (<$1) which dominate African fintech

**Key Features:**
- Automatic token association via smart contract
- Multi-asset collateral support
- HTS token compatibility for local stablecoins
- Efficient batch operations

**Code Reference:** `contracts/contracts/protocol/pool/Pool.sol:200-450`

---

### 3. Hedera Smart Contract Service (EVM) - Core Protocol Logic

**Why Hedera EVM?**
We deployed on Hedera's EVM-compatible smart contract service because it provides **Ethereum tooling compatibility** (Hardhat, ethers.js) with **10x-100x lower costs** and **3-5 second finality**. For African users with unreliable internet, fast finality means fewer failed transactions.

**Implementation:**
- **Core Contracts:** 40+ Solidity contracts including Pool, Oracle, Staking
- **RPC Endpoint:** HashIO API (`https://testnet.hashio.io/api`)
- **Development Stack:** Hardhat, ethers.js v6, OpenZeppelin libraries

**Transaction Types Executed:**
- `ContractCreateTransaction` - Deploy smart contracts
- `ContractExecuteTransaction` - Execute contract functions
- `ContractCallQuery` - Read contract state
- `ContractUpdateTransaction` - Update contract logic (admin only)

**Economic Justification:**
- **Deploy cost:** ~$5-10 per contract (vs. $500-5,000 on Ethereum)
- **Transaction cost:** $0.05-0.10 (vs. $10-100 on Ethereum)
- **Total deployment cost:** ~$50 for full protocol (vs. $5,000+ on Ethereum)
- **African market fit:** Low barrier to entry for local developers to fork/extend

**Key Features:**
- Full Aave v3-inspired lending logic
- Dynamic interest rate models
- Multi-asset collateral management
- Liquidation protection mechanisms
- Integration with Pyth Oracle for price feeds

**Code Reference:** `contracts/contracts/protocol/pool/Pool.sol:1-1000`, `contracts/contracts/protocol/pool/PoolConfigurator.sol:1-500`

---

### 4. Hedera Node Staking - Dual Yield Mechanism

**Why Hedera Node Staking?**
We integrated node staking to provide **dual yield** (lending APY + staking rewards) because it increases capital efficiency without introducing additional smart contract risk. Staking rewards of **6-8% APY on HBAR** are distributed proportionally to lenders, boosting total yields to competitive levels (15-25% APY) while maintaining safety.

**Implementation:**
- **Contract:** `DeraNodeStaking.sol` manages accounting and reward distribution
- **Backend Service:** `node-staking-service` executes staking operations via Hedera SDK
- **Reward Flow:** Protocol stakes HBAR → Claims rewards → Distributes to suppliers

**Transaction Types Executed:**
- `AccountUpdateTransaction` - Set staking node ID for account
- `AccountBalanceQuery` - Check staking rewards
- `TransferTransaction` - Distribute rewards to lenders
- `AccountInfoQuery` - Verify staking configuration

**Economic Justification:**
- **Staking reward:** ~6-8% APY on staked HBAR (network reward)
- **Total lender APY:** Lending interest (5-15%) + Staking (6-8%) = 11-23% total
- **Competitive advantage:** Compound/Aave offer 3-8%, Dera offers 11-23%
- **African market fit:** Higher yields attract capital from regions with limited investment options
- **Sustainability:** No token emissions required, yields are organic

**Key Features:**
- Automated staking of idle HBAR reserves
- Proportional reward distribution to all HBAR suppliers
- On-chain accounting for full transparency
- Configurable node selection (supports all 39 Hedera nodes)
- Cron-based reward claiming and distribution

**Code Reference:** `contracts/contracts/hedera/DeraNodeStaking.sol:1-400`, `backend/node-staking-service/src/NodeStakingService.js:1-350`

---

### 5. Mirror Node API - Analytics and Historical Data

**Why Mirror Nodes?**
We leverage Hedera Mirror Nodes for off-chain analytics because they provide **free, public access** to full historical data without requiring node operation. This enables rich dashboards and user insights at zero cost.

**Implementation:**
- **Frontend Integration:** `hederaService.js` queries Mirror Node REST API
- **Backend Integration:** `MirrorNodeClient.js` for event verification
- **Endpoints Used:** `/api/v1/contracts`, `/api/v1/topics`, `/api/v1/transactions`

**Economic Justification:**
- **Cost:** $0 (public API, no API key required)
- **Benefit:** Full transaction history and analytics without indexer infrastructure
- **African market fit:** Zero operational cost for data queries enables free user dashboards

**Key Features:**
- Real-time transaction history
- HCS message retrieval and filtering
- Account balance tracking across all tokens
- Protocol TVL and volume analytics
- User portfolio dashboards

**Code Reference:** `frontend/services/hederaService.js:1-200`, `backend/hcs-event-service/src/MirrorNodeClient.js:1-150`

---

## ⚡ Quick Start (5 Minutes)

**For detailed step-by-step deployment instructions, see [JUDGE_QUICKSTART.md](./JUDGE_QUICKSTART.md)**

### TL;DR - Interactive Deployment

```bash
# Clone repository
git clone https://github.com/KarimAdel-1/Dera.git
cd Dera

# Run interactive deployment (prompts for credentials)
npm run deploy:hackathon
```

**The script will interactively prompt you for:**
1. Hedera credentials (Operator ID, Operator Key, Private Key)
2. Supabase credentials (URL, Anon Key, Service Key)
3. WalletConnect Project ID

**All environment files are created and filled automatically!**

```bash
# Start frontend
cd frontend && npm run dev
# Opens at http://localhost:3000
```

**Expected time:** 5-8 minutes total

**For troubleshooting and detailed instructions, see [JUDGE_QUICKSTART.md](./JUDGE_QUICKSTART.md)**

---

## 📖 Deployment & Setup Instructions

### Automated Interactive Deployment

The deployment process is now **fully automated** with **interactive credential prompts**:

```bash
npm run deploy:hackathon
```

**What happens:**
1. ✅ **Environment Setup:** Automatically creates all `.env` files from templates
2. 🔐 **Credential Prompts:** Interactively asks for:
   - Hedera credentials (3 prompts)
   - Supabase credentials (3 prompts)
   - WalletConnect Project ID (1 prompt)
3. ✅ **Credential Distribution:** Fills credentials in all 7+ environment files
4. 📦 **Dependencies:** Installs all npm packages
5. 🔨 **Compilation:** Compiles smart contracts
6. 🚀 **Deployment:** Deploys contracts to Hedera testnet
7. 📡 **HCS Setup:** Creates 5 HCS topics for events
8. ⚙️ **Asset Init:** Initializes supported assets
9. 🎨 **Frontend Config:** Updates frontend with contract addresses

**📝 Get credentials from:**
- **Hedera:** https://portal.hedera.com/ (create testnet account, get 100 HBAR)
- **Supabase:** https://app.supabase.com/ (create project, get API keys)
- **WalletConnect:** https://cloud.walletconnect.com/ (create project, get ID)

**Expected time:** 5-8 minutes total

**🔐 Judge Credentials:**
Test account credentials are provided in the **DoraHacks submission notes** for verification purposes. Simply enter them when prompted.

---

### Manual Step-by-Step (Advanced Users)

If you prefer manual control or need to debug, you can run each step individually:

#### Step 4: Deploy Smart Contracts

```bash
cd contracts
npm run deploy
```

**What gets deployed:**
1. PoolAddressesProvider (registry contract)
2. ACLManager (access control)
3. DeraOracle (price feeds)
4. DefaultReserveInterestRateStrategy (interest rate model)
5. Pool (core lending logic)
6. PoolConfigurator (admin functions)
7. DeraMultiAssetStaking (staking logic)
8. DeraMirrorNodeAnalytics (analytics contract)

**Expected time:** 3-5 minutes

**Output files:**
- `contracts/deployment-info.json` - All contract addresses
- `contracts/deployments/testnet/*.json` - Deployment artifacts

**Contract addresses** are automatically updated in:
- `frontend/.env.local`
- Backend service configurations

---

#### Step 5: Create HCS Topics

```bash
cd contracts
npm run deploy:hcs
```

**What gets created:**
- Supply events topic
- Withdraw events topic
- Borrow events topic
- Repay events topic
- Liquidation events topic

**Expected time:** 30 seconds

**Output files:**
- `contracts/hcs-topics.json` - All topic IDs

**Topic IDs** are automatically updated in:
- `frontend/.env.local`
- `backend/hcs-event-service/.env`

---

#### Step 6: Configure and Run Frontend

```bash
cd frontend

# Copy environment template if it doesn't exist
cp .env.example .env.local

# Start development server
npm run dev
```

**Environment variables** (auto-configured by deployment script):
```env
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_POOL_ADDRESS=0x... # From deployment-info.json
NEXT_PUBLIC_ORACLE_ADDRESS=0x...
NEXT_PUBLIC_ANALYTICS_ADDRESS=0x...
NEXT_PUBLIC_HCS_SUPPLY_TOPIC=0.0.xxxxx # From hcs-topics.json
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id # Get from cloud.walletconnect.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
# ... (all other addresses auto-populated)
```

**Note:** WalletConnect Project ID is required for HashPack wallet connection. Get one free at https://cloud.walletconnect.com/. Supabase credentials are optional for user session persistence.

**Frontend runs at:** `http://localhost:3000`

**Testing Features:**
- **Mock Mode:** Test all features without wallet connection
- **Live Mode:** Connect HashPack for real blockchain transactions
- All UI features work in both modes for easy testing

---

#### Step 7: Start Backend Services (Optional)

Backend services enhance the protocol with event logging, staking automation, and liquidation monitoring:

```bash
# HCS Event Service (submits events to HCS topics)
cd backend/hcs-event-service
cp .env.example .env
npm install
npm run dev  # Runs on port 3001

# Node Staking Service (manages staking rewards)
cd backend/node-staking-service
cp .env.example .env
npm install
npm run dev  # Runs on port 3003

# Liquidation Bot (monitors underwater positions)
cd backend/liquidation-bot
cp .env.example .env
npm install
npm run dev  # Runs in background
```

---

### Alternative: Quick Bash Script

For the fastest deployment experience:

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```

This script runs all steps 1-5 automatically with progress indicators.

---

## 🏗️ Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                              │
│                     (Next.js Frontend - Port 3000)                   │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Supply &   │  │   Borrow &   │  │   Staking    │              │
│  │   Withdraw   │  │    Repay     │  │  Dashboard   │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼ Wallet Connection (HashPack/Blade)
┌─────────────────────────────────────────────────────────────────────┐
│                    HEDERA NETWORK (TESTNET)                          │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              SMART CONTRACTS (EVM Layer)                        │ │
│  │                                                                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │   Pool   │  │  Oracle  │  │ Staking  │  │   HCS    │      │ │
│  │  │  (Core)  │  │  (Pyth)  │  │ Contract │  │ Streamer │      │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │ │
│  │       │             │             │             │              │ │
│  └───────┼─────────────┼─────────────┼─────────────┼──────────────┘ │
│          │             │             │             │                 │
│          ▼             ▼             ▼             ▼                 │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │              HEDERA NATIVE SERVICES                             │ │
│  │                                                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │ │
│  │  │     HTS      │  │     HCS      │  │     Node     │        │ │
│  │  │   (Tokens)   │  │  (Topics)    │  │   Staking    │        │ │
│  │  │              │  │              │  │              │        │ │
│  │  │ • HBAR       │  │ • Supply     │  │ • Consensus  │        │ │
│  │  │ • USDC       │  │ • Withdraw   │  │   Nodes      │        │ │
│  │  │ • dTokens    │  │ • Borrow     │  │ • 6-8% APY   │        │ │
│  │  │              │  │ • Repay      │  │ • Auto       │        │ │
│  │  │              │  │ • Liquidate  │  │   Rewards    │        │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │ │
│  │                                                                  │ │
│  └────────────────────────┬─────────────────────────────────────────┘ │
│                           │                                           │
│                           ▼                                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    MIRROR NODE API                              │ │
│  │         (https://testnet.mirrornode.hedera.com)                 │ │
│  │                                                                 │ │
│  │  • Query historical transactions                                │ │
│  │  • Read HCS messages                                            │ │
│  │  • Fetch account balances                                       │ │
│  │  • Protocol analytics                                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼ API Queries
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES (Node.js)                        │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  HCS Event   │  │     Node     │  │  Liquidation │              │
│  │   Service    │  │   Staking    │  │     Bot      │              │
│  │  (Port 3001) │  │  (Port 3003) │  │  (Cron Job)  │              │
│  │              │  │              │  │              │              │
│  │ • Listens to │  │ • Executes   │  │ • Monitors   │              │
│  │   events     │  │   staking    │  │   health     │              │
│  │ • Submits to │  │ • Claims     │  │   factors    │              │
│  │   HCS topics │  │   rewards    │  │ • Liquidates │              │
│  │ • Verifies   │  │ • Distributes│  │   positions  │              │
│  │   via Mirror │  │   to users   │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: User Supplies HBAR

```
1. User clicks "Supply 100 HBAR" in Frontend
                    │
                    ▼
2. Frontend calls Pool.supply(HBAR, 100, userAddress)
                    │
                    ▼
3. Pool Contract executes:
   a. Transfers 100 HBAR from user to Pool (via HTS precompile)
   b. Mints 100 dHBAR tokens to user (supply tokens)
   c. Updates interest rate model
   d. Emits Supply event
                    │
                    ▼
4. DeraHCSEventStreamer catches event
   → Formats event data
   → Emits HCSEvent with topic reference
                    │
                    ▼
5. HCS Event Service (backend) listens to HCSEvent
   → Batch queues event
   → Submits to HCS Topic (TopicMessageSubmitTransaction)
                    │
                    ▼
6. Node Staking Service detects new HBAR supply
   → Stakes portion of reserve with Hedera node
   → Records staking position on-chain
                    │
                    ▼
7. Mirror Node indexes:
   a. Contract execution transaction
   b. HCS message on topic
   c. Token balance updates
                    │
                    ▼
8. Frontend queries Mirror Node:
   → Displays updated balance
   → Shows transaction in history
   → Updates APY with staking rewards
```

---

## 🆔 Deployed Hedera IDs

### Testnet Deployment

All IDs below are from the reference deployment on Hedera Testnet. When you deploy, your IDs will be different and saved in `contracts/deployment-info.json`.

#### Smart Contract Addresses (EVM Format)

| Contract | Address | HashScan Link |
|----------|---------|---------------|
| Pool | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| PoolAddressesProvider | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| ACLManager | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| DeraOracle | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| MultiAssetStaking | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| HCSEventStreamer | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |
| MirrorNodeAnalytics | `0x...` | [View on HashScan](https://hashscan.io/testnet/contract/0x...) |

**📝 Note:** These addresses are auto-populated in `contracts/deployment-info.json` after running deployment.

#### HCS Topic IDs

| Topic | ID | HashScan Link |
|-------|-----|---------------|
| Supply Events | `0.0.xxxxx` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.xxxxx) |
| Withdraw Events | `0.0.xxxxx` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.xxxxx) |
| Borrow Events | `0.0.xxxxx` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.xxxxx) |
| Repay Events | `0.0.xxxxx` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.xxxxx) |
| Liquidation Events | `0.0.xxxxx` | [View on HashScan](https://hashscan.io/testnet/topic/0.0.xxxxx) |

**📝 Note:** These topic IDs are saved in `contracts/hcs-topics.json` after running `npm run deploy:hcs`.

#### HTS Token IDs (Testnet)

| Token | Token ID | Symbol | Decimals |
|-------|----------|--------|----------|
| USDC (Testnet) | `0.0.456858` | USDC | 6 |
| HBAR | Native | HBAR | 8 |

---

## 💻 Running Environment

After deployment, the following services will be running:

### Frontend (Required)

```bash
cd frontend
npm run dev
```

- **URL:** `http://localhost:3000`
- **Port:** 3000
- **Description:** Main user interface for supplying, borrowing, staking
- **Tech Stack:** Next.js 15, React 18, TailwindCSS, ethers.js v6

**Pages:**
- `/` - Landing page
- `/connect` - wallet connect page 
- `/dashboard` - User portfolio and Dashboard

### Backend Services (Optional but Recommended)

#### 1. HCS Event Service
```bash
cd backend/hcs-event-service
npm run dev
```

- **Port:** 3001
- **Description:** Listens to contract events and submits to HCS topics
- **Status Endpoint:** `http://localhost:3001/health`
- **Purpose:** Immutable event logging

#### 2. Node Staking Service
```bash
cd backend/node-staking-service
npm run dev
```

- **Port:** 3003
- **Description:** Manages Hedera node staking and reward distribution
- **Cron:** Runs every 24 hours to claim and distribute rewards
- **Purpose:** Dual yield mechanism

#### 3. Liquidation Bot
```bash
cd backend/liquidation-bot
npm run dev
```

- **Port:** N/A (background cron job)
- **Description:** Monitors positions and executes liquidations
- **Interval:** Every 60 seconds
- **Purpose:** Protocol health and bad debt prevention

### Running All Services Together

```bash
# Option 1: Use npm script (requires concurrently)
npm run dev

# Option 2: Manual (multiple terminals)
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend/hcs-event-service && npm run dev

# Terminal 3
cd backend/node-staking-service && npm run dev
```

### Expected Resource Usage

- **CPU:** 10-20% (M1 Mac / Ryzen 5 equivalent)
- **RAM:** 1-2 GB total for all services
- **Disk:** 500 MB (node_modules + compiled contracts)
- **Network:** <1 MB/min (polling + API calls)

---

## 🔐 Security & Credentials

### Security Best Practices

**⚠️ CRITICAL: DO NOT commit private keys, seed phrases, or credentials to version control.**

#### Example Configuration Files

We provide `.env.example` templates showing the **structure** of required variables without sensitive values:

```env
# contracts/.env.example
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY_IN_DER_FORMAT
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_IN_HEX_FORMAT

# frontend/.env.example
NEXT_PUBLIC_HEDERA_NETWORK=testnet
NEXT_PUBLIC_POOL_ADDRESS=<populated_after_deployment>
```

**📝 Judges: Copy `.env.example` to `.env` and fill in your credentials.**

#### Judge Credentials (Hackathon Submission Only)

For hackathon judges and mentors to verify the deployment, **test credentials are provided separately in the DoraHacks submission notes field**, not in this repository.

**⚠️ These credentials:**
- Are ONLY for Hedera Testnet (not mainnet)
- Have limited HBAR (~100) for testing purposes
- Will be rotated after the hackathon ends
- Are safe to use for judging and evaluation

---

## 🧪 Testing the Protocol

### Quick Test Flow (2 minutes)

**UI Testing Mode (No Wallet Required):**

1. **Start Frontend**
   - Open `http://localhost:3000`
   - Navigate to Dashboard → Dera Protocol tab

2. **Test Supply Feature**
   - Click "Supply" on any asset (HBAR, USDC, SAUCE)
   - Enter amount (e.g., 10 HBAR)
   - Click "Supply" - transaction simulates instantly
   - View updated balance in "Your Positions" tab

3. **Test Borrow Feature**
   - Click "Borrow" on any asset
   - Enter borrow amount
   - Click "Borrow" - transaction simulates instantly
   - View borrowed amount in "Your Positions" tab

4. **Test Collateral Toggle**
   - Go to "Your Positions" tab
   - Toggle "Use as Collateral" on supplied assets
   - See collateral status update instantly

5. **View Transaction History**
   - All mock transactions appear in transaction history
   - Each shows status "success (mock)"

**Live Testing with Wallet (Optional):**

1. **Connect HashPack Wallet**
   - Click "Connect Wallet" button
   - Approve HashPack connection
   - Get test HBAR from [Hedera Portal](https://portal.hedera.com/)

2. **Execute Real Transactions**
   - Supply/Borrow with real blockchain transactions
   - Transactions cost ~$0.05-0.10 on Hedera Testnet
   - View on HashScan explorer

3. **Check HCS Events**
   - Navigate to "HCS Events" tab
   - View immutable event logs from HCS topics
   - Click HashScan links to verify on-chain

---

## 🎨 Code Quality

### Linting and Formatting

**Contracts:**
- Solidity 0.8.19 with strict compiler warnings
- OpenZeppelin library standards
- NatSpec documentation on all public functions
- Gas optimization patterns

**Frontend:**
- ESLint with Next.js recommended rules
- Prettier for consistent formatting
- React best practices

**Backend:**
- ESLint with Node.js rules
- Error handling with Winston logger
- Async/await patterns
- Comprehensive try-catch blocks

### Code Organization

**Clear Function Names:**
```solidity
// Good examples from Pool.sol
function supply(address asset, uint256 amount, address onBehalfOf) external;
function withdraw(address asset, uint256 amount, address to) external returns (uint256);
function borrow(address asset, uint256 amount, uint256 interestRateMode) external;
```

**Consistent Styling:**
- 2-space indentation
- camelCase for variables
- PascalCase for contracts/interfaces
- UPPER_SNAKE_CASE for constants

### Auditability

**Key Files for Judges to Review:**

1. **Core Protocol Logic:**
   - `contracts/contracts/protocol/pool/Pool.sol` (main lending/borrowing logic)
   - `contracts/contracts/protocol/pool/PoolConfigurator.sol` (admin functions)

2. **Hedera Integration:**
   - `contracts/contracts/hedera/DeraHCSEventStreamer.sol` (HCS event logging)
   - `contracts/contracts/hedera/DeraNodeStaking.sol` (node staking logic)

3. **Backend Services:**
   - `backend/hcs-event-service/src/HCSEventService.js` (HCS submission logic)
   - `backend/node-staking-service/src/NodeStakingService.js` (staking automation)

4. **Frontend:**
   - `frontend/services/deraProtocolService.js` (contract interaction)
   - `frontend/services/hederaService.js` (Mirror Node queries)

---

## 📁 Project Structure

```
dera-protocol/
├── contracts/                  # Smart contracts
│   ├── contracts/
│   │   ├── hedera/             # Hedera-specific contracts
│   │   │   ├── DeraHCSEventStreamer.sol
│   │   │   ├── DeraNodeStaking.sol
│   │   │   └── DeraMirrorNodeAnalytics.sol
│   │   ├── protocol/           # Core protocol contracts
│   │   │   ├── pool/
│   │   │   │   ├── Pool.sol
│   │   │   │   └── PoolConfigurator.sol
│   │   │   └── tokenization/
│   │   └── helpers/            # Helper contracts
│   ├── scripts/                # Deployment scripts
│   │   ├── deploy-complete.js
│   │   └── create-hcs-topics.js
│   └── test/                   # Contract tests
│
├── frontend/                   # Next.js frontend
│   ├── app/                    # Next.js 15 app directory
│   ├── components/             # React components
│   ├── services/               # Contract interaction services
│   └── abis/                   # Contract ABIs (auto-generated)
│
├── backend/                    # Backend services
│   ├── hcs-event-service/      # HCS event logging
│   ├── node-staking-service/   # Node staking automation
│   ├── liquidation-bot/        # Liquidation monitoring
│   └── monitoring-service/     # Health checks
│
├── deploy-hackathon.js         # Main deployment script
├── quick-deploy.sh             # Quick deployment script
├── package.json                # Root package.json (monorepo)
└── README.md                   # This file
```

---

## 💰 Economic Model

### Interest Rate Model

Dera uses a **dual-slope interest rate model** optimized for capital efficiency:

```
Utilization Rate (U) = Total Borrows / Total Liquidity

Borrow APY:
- If U < 80%: APY = Base Rate + (U × Slope1)
- If U ≥ 80%: APY = Base Rate + (0.8 × Slope1) + ((U - 0.8) × Slope2)

Supply APY:
- Supply APY = Borrow APY × Utilization Rate × (1 - Reserve Factor)
```

**Example Parameters (HBAR):**
- Base Rate: 0%
- Slope1: 4%
- Slope2: 100%
- Optimal Utilization: 80%
- Reserve Factor: 10%

### Fee Structure

| Action | Cost on Dera (Hedera) | Cost on Ethereum |
|--------|----------------------|------------------|
| Supply | $0.05 | $20-100 |
| Withdraw | $0.05 | $20-100 |
| Borrow | $0.10 | $50-150 |
| Repay | $0.10 | $50-150 |
| Liquidation | $0.15 | $100-300 |
| **Total (5 txs)** | **$0.45** | **$240-800** |

**Why This Matters for Africa:**
- Average transaction value in African fintech: $10-50
- On Ethereum: Gas fees = 40-200% of transaction value ❌
- On Hedera: Gas fees = 0.1-1% of transaction value ✅

---

## 🚀 Future Roadmap

### Phase 1: Launch (Current)
- ✅ Core lending/borrowing protocol
- ✅ HCS event logging
- ✅ Node staking dual yield
- ✅ Multi-asset support
- ✅ Frontend dashboard

### Phase 2: Enhanced Features (Q2 2025)
- [ ] Flash loans for arbitrage
- [ ] Credit delegation
- [ ] Isolation mode
- [ ] Mobile app

### Phase 3: Ecosystem Integration (Q3 2025)
- [ ] African payment gateway integration
- [ ] Fiat on/off ramps
- [ ] Governance token
- [ ] DAO governance

### Phase 4: Mainnet Launch (Q4 2025)
- [ ] Security audit
- [ ] Mainnet deployment
- [ ] Liquidity mining
- [ ] Protocol partnerships

---

## 📞 Support & Links

### Hedera Resources
- **Hedera Portal:** [https://portal.hedera.com](https://portal.hedera.com) (get test HBAR)
- **HashScan Explorer:** [https://hashscan.io](https://hashscan.io)
- **HashPack Wallet:** [https://www.hashpack.app](https://www.hashpack.app)

### Troubleshooting

**Issue:** Deployment fails with "insufficient HBAR"
- **Solution:** Ensure your account has at least 100 HBAR. Request from faucet at portal.hedera.com

**Issue:** Frontend doesn't connect to wallet
- **Solution:** Ensure HashPack extension is installed and unlocked. Add WalletConnect Project ID to `frontend/.env.local` (get free from https://cloud.walletconnect.com/). Try refreshing the page.
- **Alternative:** Use mock mode to test UI without wallet connection.

**Issue:** HCS topic creation fails
- **Solution:** Check that HEDERA_OPERATOR_KEY is correct. Try running `npm run deploy:hcs` again.

---

## 📜 License

This project is licensed under the MIT License.

---

## 🏆 Hackathon Judges

Thank you for reviewing our submission! We've put significant effort into:

1. **Deep Hedera Integration:** Native HCS, HTS, and node staking
2. **Production-Ready Code:** Comprehensive tests, clean architecture
3. **Real-World Use Case:** Solving actual problems for African DeFi
4. **Complete Deployment:** One-command deployment for easy testing
5. **Transparency:** Full audit trail via HCS

**Test our protocol in under 10 minutes:**

```bash
git clone <repo-url>
cd dera-protocol
cp contracts/.env.example contracts/.env
# Add test credentials from DoraHacks submission notes
npm run deploy:hackathon
cd frontend && npm run dev
# Visit http://localhost:3000
```

---

**Built with ❤️ for Hedera and the African DeFi ecosystem**

🌍 Bringing sustainable, low-cost DeFi to Africa, powered by Hedera.
