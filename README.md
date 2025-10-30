# Dera Protocol - Hedera DeFi Platform

**Hedera-native decentralized lending and staking protocol with multi-asset support**

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- Hedera testnet account with 50+ HBAR
- [Get testnet account](https://portal.hedera.com)

### One-Command Deployment
```bash
npm run deploy
```

This will:
1. Set up environment (interactive)
2. Install dependencies
3. Deploy contracts to Hedera testnet
4. Create HCS topics
5. Configure frontend
6. Build application

### Manual Deployment
```bash
# 1. Setup environment
npm run setup

# 2. Deploy contracts
npm run deploy:quick

# 3. Create HCS topics
npm run deploy:hcs

# 4. Start frontend
cd frontend && npm run dev
```

## 📋 What Gets Deployed

### Smart Contracts
- **Pool** - Main lending/borrowing logic
- **Oracle** - Price feeds
- **Multi-Asset Staking** - Stake HBAR, HTS tokens, NFTs
- **Analytics** - Protocol metrics
- **Access Control** - Permissions management

### HCS Topics
- Supply, Withdraw, Borrow, Repay, Liquidation events

### Frontend
- Next.js application with HashPack wallet integration
- Real-time protocol dashboard
- Multi-asset staking interface

## 🔍 Verify Deployment

```bash
cd contracts
npx hardhat run scripts/verify-deployment.js --network testnet
```

## 🌐 Access Your Deployment

After successful deployment:
1. **Frontend:** `http://localhost:3000`
2. **Contracts:** Check `contracts/deployment-info.json`
3. **HCS Topics:** Check `contracts/hcs-topics.json`
4. **HashScan:** View contracts and topics on HashScan

## 📚 Documentation

- **[Complete Deployment Guide](./DEVELOPER_DEPLOYMENT_GUIDE.md)** - Detailed step-by-step instructions
- **[Quick Deployment Guide](./QUICK_DEPLOYMENT_GUIDE.md)** - Fast deployment reference
- **[Architecture Overview](./DEPLOYMENT_GUIDE.md)** - System architecture and integration status

## 🛠️ Development

```bash
# Install all dependencies
npm run install:all

# Run tests
npm run test

# Start development servers
npm run dev
```

## 🔧 Troubleshooting

### Common Issues

**"Insufficient HBAR"**
- Ensure your account has 50+ HBAR
- Check balance: `https://hashscan.io/testnet/account/YOUR_ACCOUNT_ID`

**"Contract deployment failed"**
- Verify private key and account ID
- Check network connectivity
- Run: `npm run deploy:quick` to retry

**"Frontend won't start"**
- Check `frontend/.env.local` has contract addresses
- Run: `cd frontend && npm run build`

## 📊 Features

### ✅ Fully Integrated
- **Lending & Borrowing** - Supply/withdraw/borrow/repay with real-time rates
- **Multi-Asset Staking** - Stake HBAR, HTS tokens, NFTs with tiered APY
- **Wallet Integration** - HashPack via WalletConnect
- **HCS Events** - Real-time event logging and history
- **Analytics** - Protocol metrics and TVL tracking

### 🔄 Optional Services
- HCS Event Service - Real-time WebSocket feeds
- Liquidation Bot - Automated position monitoring
- Rate Updater - APY rate management

## 🌍 Networks

- **Testnet** - Default deployment target
- **Mainnet** - Production ready (update environment variables)

## 📈 Architecture

```
Frontend (Next.js) → Smart Contracts → Hedera Services
     ↓                    ↓              ↓
- Dashboard          - Pool Logic    - HTS Tokens
- Staking UI         - Oracle        - HCS Topics  
- Wallet Connect     - Analytics     - Mirror Node
```

## 🎯 Success Criteria

Your deployment is successful when:
- [ ] All contracts deployed to Hedera testnet
- [ ] HCS topics created and visible on HashScan
- [ ] Frontend loads at `http://localhost:3000`
- [ ] HashPack wallet connects
- [ ] Can supply/borrow assets
- [ ] Events logged to HCS topics

## 🆘 Support

1. Check [troubleshooting section](#-troubleshooting)
2. Review deployment logs in `contracts/deployment-info.json`
3. Verify environment variables are set correctly
4. Check HashScan for transaction status

---

**🎉 Ready to deploy Dera Protocol on Hedera!**

Run `npm run deploy` to get started.