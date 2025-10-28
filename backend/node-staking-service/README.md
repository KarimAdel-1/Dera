# Dera Protocol Node Staking Service

Automated service that stakes protocol HBAR with Hedera consensus nodes and distributes dual yield to lenders.

## 💎 What is Dual Yield?

**Unique to Dera Protocol on Hedera!**

Lenders earn TWO sources of yield simultaneously:

1. **Lending APY** - Interest paid by borrowers (standard DeFi)
2. **Staking APY** - Hedera node staking rewards (~6-8% on HBAR)

This is IMPOSSIBLE on any other blockchain!

### How It Works

```
1. Protocol accumulates HBAR fees
   ↓
2. Service stakes HBAR with Hedera nodes
   ↓
3. Staking rewards accrue daily (~6-8% APY)
   ↓
4. Service claims rewards automatically
   ↓
5. Rewards distributed to DST (DeraSupplyToken) holders
   ↓
6. Lenders receive: Lending APY + Staking APY
```

## Architecture

### On-Chain (DeraNodeStaking.sol)
- Receives HBAR fees from protocol
- Tracks stake amounts per node
- Records staking rewards
- Manages distribution to lenders
- Per-asset staking configuration

### Off-Chain (This Service)
- Executes actual staking via Hedera SDK
- Claims rewards daily
- Records rewards on-chain
- Automates distribution
- Monitors staking performance

## Features

- 🔐 **Automated Staking** - Stakes HBAR with Hedera nodes via SDK
- 🎁 **Daily Reward Claiming** - Claims staking rewards automatically
- 💸 **Automated Distribution** - Distributes rewards to lenders
- 📊 **Performance Tracking** - Monitors APY and total rewards
- ⏰ **Cron Scheduling** - Configurable reward claiming and distribution
- 📈 **Metrics Dashboard** - Real-time staking statistics

## Installation

```bash
cd backend/node-staking-service
npm install
cp .env.example .env
```

## Configuration

Edit `.env` file:

```bash
# Hedera Account (must have admin permissions on contract)
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# Admin wallet (for contract calls)
ADMIN_PRIVATE_KEY=0x...

# Contract Address
NODE_STAKING_CONTRACT_ADDRESS=0x...

# Staking Node (choose a Hedera consensus node)
DEFAULT_NODE_ID=3  # Node 0.0.3

# Staking Parameters
MIN_STAKE_AMOUNT=1000           # Minimum HBAR to trigger staking
ESTIMATED_APY=700               # 7% APY

# Schedules (cron format)
REWARD_CLAIM_CRON=0 0 * * *     # Daily at midnight
DISTRIBUTION_CRON=0 12 * * *    # Daily at noon

# Assets to distribute to
DISTRIBUTION_ASSETS=0xAsset1,0xAsset2
```

## Hedera Nodes

Choose a Hedera consensus node to stake with:

| Node ID | Entity | Location |
|---------|--------|----------|
| 0.0.3 | Hedera | US East |
| 0.0.4 | Hedera | US West |
| 0.0.5 | IBM | Various |
| 0.0.6 | Google | Various |
| 0.0.7 | Boeing | US |
| 0.0.8 | Deutsche Telekom | Germany |
| 0.0.9 | DLA Piper | UK |

Full list: https://hashscan.io/mainnet/nodes

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
pm2 logs dera-staking-service
```

### Using Docker
```bash
docker-compose up -d
docker logs -f dera-staking-service
```

## Service Output

```
═══════════════════════════════════════════════════════════
   DERA PROTOCOL NODE STAKING SERVICE
   Automated HBAR staking for dual yield distribution
═══════════════════════════════════════════════════════════

💎 DUAL YIELD FOR LENDERS:
   1. Lending APY - Interest from borrowers
   2. Staking APY - Hedera node rewards (~6-8%)

[10:00:00] INFO: Initializing Node Staking Service...
[10:00:01] INFO: ✅ Hedera client initialized: testnet
[10:00:01] INFO:    Operator Account: 0.0.123456
[10:00:01] INFO: ✅ Contract loaded: 0xABC...

[10:00:02] INFO: 📊 Current Staking State:
[10:00:02] INFO:    Available for Staking: 5000.0 HBAR
[10:00:02] INFO:    Currently Staked: 10000.0 HBAR
[10:00:02] INFO:    Total Rewards: 150.5 HBAR
[10:00:02] INFO:    Staked Nodes: 1

[10:00:03] INFO: 🚀 Starting Node Staking Service...
[10:00:03] INFO: 👂 Starting event listeners...
[10:00:03] INFO: ⏰ Scheduling reward claiming...
[10:00:03] INFO:    Frequency: 0 0 * * * (daily at midnight)

# When new stake is initiated via contract
[12:00:00] INFO: 📥 NodeStaked event: Node 3, Amount: 5000.0 HBAR
[12:00:01] INFO: 🔐 Executing stake with node 3...
[12:00:02] INFO: ✅ Successfully staked with node 3

# Daily reward claiming
[00:00:00] INFO: 🎁 Automated reward claiming triggered
[00:00:01] INFO: 🎁 Claiming staking rewards...
[00:00:02] INFO: 💰 Current account balance: 10150.5 HBAR
[00:00:02] INFO: 📊 Estimated daily rewards: 1.95 HBAR
[00:00:03] INFO: 📝 Recording 1.95 HBAR rewards for node 3...
[00:00:04] INFO: ✅ Rewards recorded on-chain

# Daily reward distribution
[12:00:00] INFO: 💸 Automated reward distribution triggered
[12:00:01] INFO: 💸 Distributing rewards to lenders...
[12:00:02] INFO: 💰 Distributing 0.195 HBAR to 0xAsset1
[12:00:03] INFO: ✅ Rewards distributed to 0xAsset1

# Metrics
[10:05:00] INFO: 📊 Current Metrics: {
  totalStakedHBAR: "10000.0",
  totalRewardsHBAR: "150.5",
  totalDistributedHBAR: "145.0",
  currentAPY: 7,
  activeStakes: 1,
  operationsCount: 25
}
```

## How Staking Works

### 1. Initiate Staking (Admin)

Call contract function to stake HBAR:

```javascript
// Via ethers.js or directly on Hashscan
await stakingContract.stakeWithNode(
  3,                              // Node ID (0.0.3)
  ethers.parseEther("5000")      // 5000 HBAR
);
```

### 2. Service Executes Staking

Service listens to `NodeStaked` event and executes:

```javascript
// Via Hedera SDK
const transaction = new AccountUpdateTransaction()
  .setAccountId(operatorId)
  .setStakedNodeId(3);

await transaction.execute(client);
```

### 3. Rewards Accrue

Hedera automatically adds staking rewards to account balance daily.

### 4. Service Claims Rewards

Every 24 hours:
- Check account balance
- Calculate new rewards
- Record rewards on-chain via `recordStakingRewards()`

### 5. Service Distributes Rewards

Daily at noon:
- Get available rewards from contract
- Call `distributeRewardsToAsset()` for each asset
- Rewards become claimable by DST holders

### 6. Lenders Claim Rewards

DST holders call `claimStakingRewards()` to receive their share.

## Reward Calculation

**Daily Rewards Formula:**
```
Daily Rewards = (Staked Amount × APY) / 365

Example:
- Staked: 10,000 HBAR
- APY: 7%
- Daily Rewards = (10,000 × 0.07) / 365 = 1.92 HBAR/day
```

**Lender Share:**
```
Your Share = (Your DST Balance / Total DST Supply) × Total Rewards

Example:
- Your DST Balance: 1,000
- Total DST Supply: 100,000
- Total Rewards: 100 HBAR
- Your Share = (1,000 / 100,000) × 100 = 1 HBAR
```

## Monitoring

### Metrics Tracked
- `totalStaked` - Total HBAR staked across all nodes
- `totalRewardsClaimed` - Cumulative rewards claimed
- `totalDistributed` - Cumulative rewards distributed to lenders
- `currentAPY` - Current staking APY
- `activeStakes` - Number of active node stakes
- `operationsCount` - Total operations performed

### Health Indicators
- ✅ Service running
- ✅ Daily rewards claimed
- ✅ Daily distribution completed
- ✅ No failed transactions

### Alerts

Set up alerts for:
- ❌ Service stopped
- ❌ Reward claiming failed
- ❌ Distribution failed
- ❌ APY dropped significantly

## Troubleshooting

### Staking not executing

**Issue**: NodeStaked event received but no SDK execution

**Solutions**:
1. Check Hedera account balance (needs HBAR for fees)
2. Verify operator ID and key are correct
3. Check node ID is valid (0-28 for mainnet)
4. Review error logs in `logs/error.log`

### Rewards not claimed

**Issue**: Daily cron not triggering

**Solutions**:
1. Check cron syntax in config
2. Verify service is running
3. Check system time/timezone
4. Manually trigger: `await service.claimAllRewards()`

### Distribution failing

**Issue**: `distributeRewardsToAsset()` reverts

**Solutions**:
1. Check asset has staking enabled: `enableStakingForAsset()`
2. Verify sufficient rewards available
3. Check admin permissions
4. Review contract events

## Staking Rewards APY

**Historical Hedera Staking APY:**
- 2024 Q1: ~6.5%
- 2024 Q2: ~7.2%
- 2024 Q3: ~6.8%
- 2024 Q4: ~7.1%

**Factors Affecting APY:**
- Network transaction volume
- Total HBAR staked
- Validator performance
- Network fees

## Security Considerations

### Access Control
- Service needs admin role on `DeraNodeStaking` contract
- Operator account must have staking permissions
- Private keys stored in environment variables

### Fund Safety
- HBAR remains in protocol control
- Unstaking returns funds to contract
- Emergency withdraw function available
- Admin can unstake at any time

### Operational Security
- Run service on secure server
- Monitor for unauthorized access
- Rotate keys periodically
- Use hardware wallet for admin key

## Performance Optimization

### Efficient Reward Distribution

Instead of distributing daily, batch weekly:

```bash
DISTRIBUTION_CRON=0 12 * * 0  # Weekly on Sunday
```

### Gas Optimization

Claim rewards less frequently if amounts are small:

```bash
REWARD_CLAIM_CRON=0 0 */3 * *  # Every 3 days
```

### Multiple Nodes

Distribute stake across nodes for redundancy:

```javascript
await stakeWithNode(3, parseEther("3000"));
await stakeWithNode(5, parseEther("3000"));
await stakeWithNode(7, parseEther("4000"));
```

## Use Cases

### 1. Enhanced Lender Returns
DST holders earn lending APY + staking APY simultaneously.

### 2. Protocol Revenue Optimization
Protocol fees generate additional yield instead of sitting idle.

### 3. Competitive Advantage
Unique value proposition not available on other chains.

### 4. Node Support
Protocol supports Hedera network decentralization.

## Future Enhancements

- [ ] Auto-rebalancing across multiple nodes
- [ ] APY prediction based on historical data
- [ ] Reward boost campaigns
- [ ] Integration with governance for node selection
- [ ] Advanced reward distribution strategies
- [ ] Mobile app notifications for reward claims

## FAQ

**Q: Can I choose which node to stake with?**
A: Yes, configure `DEFAULT_NODE_ID` in `.env` or call `stakeWithNode(nodeId)` for specific nodes.

**Q: What happens if a node goes offline?**
A: Hedera automatically handles this. You can unstake and restake with a different node.

**Q: Are rewards guaranteed?**
A: Staking rewards depend on network activity. Historical range: 6-8% APY.

**Q: Can I unstake immediately?**
A: Yes, call `unstakeFromNode(nodeId)` at any time. No lock-up period.

**Q: How are rewards distributed to lenders?**
A: Pro-rata based on DST balance. Each lender's share = (their DST / total DST) × rewards.

**Q: Do I need to claim rewards manually?**
A: Lenders claim via `claimStakingRewards()`. Service handles distribution automatically.

## License

MIT License

## Support

- GitHub Issues: Report bugs
- Discord: Community support
- Email: team@dera.fi

---

**🌟 Dual yield is a game-changer for DeFi lending. Only possible on Hedera!**
