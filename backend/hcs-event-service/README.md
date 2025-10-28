# Dera Protocol HCS Event Service

Off-chain service that streams Dera Protocol events to Hedera Consensus Service (HCS) topics for immutable, transparent event logging.

## What is HCS?

**Hedera Consensus Service (HCS)** provides:
- ⏱️ **Consensus Timestamps** - Fair ordering with nanosecond precision
- 🔒 **Immutability** - Events can never be altered or deleted
- 📊 **Transparency** - Publicly queryable via Mirror Nodes
- 💰 **Low Cost** - $0.0001 per message (10,000 events = $1)
- ⚡ **Fast Finality** - 3-5 second consensus

## Architecture

```
Smart Contract Events → Event Listener → Queue → HCS Topics → Mirror Nodes
```

### Flow

1. **DeraHCSEventStreamer.sol** emits `HCSEventQueued` events on-chain
2. **Event Listener** catches events via Ethers.js
3. **SQLite Queue** stores events with retry logic
4. **HCS Submitter** batches events and submits to HCS topics
5. **Mirror Nodes** index messages for public queries

## Features

- 🎯 **Event Listener** - Real-time monitoring of protocol events
- 💾 **Persistent Queue** - SQLite-backed with retry logic
- 📦 **Batch Processing** - Efficient submission of multiple events
- 🔄 **Retry Logic** - Exponential backoff for failed submissions
- 📊 **Mirror Node Client** - Verify submissions and query historical data
- 📈 **Metrics Tracking** - Success rates, pending events, throughput

## HCS Topics Structure

Each event type has its own HCS topic:

| Event Type | Topic ID | Description |
|------------|----------|-------------|
| **Supply** | 0.0.XXXXX | User supply operations |
| **Withdraw** | 0.0.XXXXY | User withdraw operations |
| **Borrow** | 0.0.XXXXZ | User borrow operations |
| **Repay** | 0.0.XXXXA | User repay operations |
| **Liquidation** | 0.0.XXXXB | Liquidation events |
| **Config** | 0.0.XXXXC | Protocol configuration changes |
| **Governance** | 0.0.XXXXD | Governance proposals and votes |

## Installation

```bash
cd backend/hcs-event-service
npm install
cp .env.example .env
```

## Configuration

Edit `.env` file:

```bash
# Hedera Network
NETWORK=testnet
RPC_URL=https://testnet.hashio.io/api
MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com

# Hedera Account (needs submit key for HCS topics)
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=YOUR_PRIVATE_KEY

# Contract Address
HCS_EVENT_STREAMER_ADDRESS=0x...

# Processing
BATCH_SIZE=10
PROCESS_INTERVAL_MS=5000
MAX_RETRIES=10

# Database
DB_PATH=./data/events.db
```

## Creating HCS Topics

Before running the service, create HCS topics using Hedera SDK:

```javascript
const { Client, TopicCreateTransaction, PrivateKey } = require('@hashgraph/sdk');

async function createTopics() {
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  // Create supply topic
  const supplyTopic = await new TopicCreateTransaction()
    .setMemo('Dera Protocol - Supply Events')
    .setSubmitKey(operatorKey.publicKey)
    .execute(client);

  const supplyReceipt = await supplyTopic.getReceipt(client);
  console.log('Supply Topic ID:', supplyReceipt.topicId.toString());

  // Repeat for other event types...
}
```

Save the topic IDs and configure them in `DeraHCSEventStreamer.sol`:

```solidity
await streamerContract.initializeTopics(
  supplyTopicId,    // e.g., 123456
  withdrawTopicId,  // e.g., 123457
  borrowTopicId,    // e.g., 123458
  repayTopicId,     // e.g., 123459
  liquidationTopicId, // e.g., 123460
  configTopicId,    // e.g., 123461
  governanceTopicId // e.g., 123462
);
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
pm2 logs dera-hcs-service
```

### Using Docker
```bash
docker-compose up -d
docker logs -f dera-hcs-service
```

## Service Output

```
═══════════════════════════════════════════════════════════
   DERA PROTOCOL HCS EVENT SERVICE
   Immutable event logging to Hedera Consensus Service
═══════════════════════════════════════════════════════════

[2025-10-28 10:00:00] INFO: Initializing HCS Event Service...
[2025-10-28 10:00:01] INFO: ✅ Hedera client initialized: testnet
[2025-10-28 10:00:01] INFO: ✅ Contract loaded: 0xABC...
[2025-10-28 10:00:01] INFO: ✅ Event queue initialized
[2025-10-28 10:00:01] INFO: 📊 Pending events in queue: 0
[2025-10-28 10:00:01] INFO: 🚀 Starting HCS Event Service...
[2025-10-28 10:00:01] INFO: 👂 Starting event listener...

[2025-10-28 10:05:30] INFO: 📥 New event received: SUPPLY
[2025-10-28 10:05:30] INFO: ✅ Event queued: SUPPLY (1 pending)
[2025-10-28 10:05:35] INFO: 📤 Processing 1 event(s)...
[2025-10-28 10:05:35] INFO: 📨 Submitting SUPPLY to HCS topic 123456...
[2025-10-28 10:05:37] INFO: ✅ HCS submission successful: SUPPLY
[2025-10-28 10:05:37] INFO:    Topic: 0.0.123456
[2025-10-28 10:05:37] INFO:    Sequence: 42

[2025-10-28 10:10:00] INFO: 📊 Metrics: {
  totalEventsReceived: 15,
  totalEventsSubmitted: 15,
  failedSubmissions: 0,
  pendingInQueue: 0,
  isRunning: true,
  successRate: "100.00%"
}
```

## Querying Events from Mirror Nodes

### Via REST API

```bash
# Get recent supply events
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.123456/messages?limit=10"

# Get specific message
curl "https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.123456/messages/42"
```

### Via Service API

```javascript
const service = new HCSEventService();
await service.initialize();

// Get recent events
const events = await service.mirrorNodeClient.getTopicMessages('0.0.123456', {
  limit: 100,
  order: 'desc'
});

console.log(events);
```

### Event Message Format

Each HCS message contains:

```json
{
  "eventType": "SUPPLY",
  "eventHash": "0x123...",
  "eventData": "0xabc...",
  "timestamp": 1698765432,
  "blockNumber": 12345,
  "transactionHash": "0x789..."
}
```

## Database Schema

### Events Table

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  topic_id TEXT NOT NULL,
  event_hash TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  transaction_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, submitted, failed
  retry_count INTEGER DEFAULT 0,
  hcs_sequence_number TEXT,
  error_message TEXT,
  created_at INTEGER,
  updated_at INTEGER
)
```

### Query Examples

```bash
# Check queue status
sqlite3 data/events.db "SELECT status, COUNT(*) FROM events GROUP BY status;"

# View pending events
sqlite3 data/events.db "SELECT * FROM events WHERE status='pending';"

# View failed events
sqlite3 data/events.db "SELECT * FROM events WHERE status='failed';"

# Get statistics
sqlite3 data/events.db "
  SELECT
    status,
    COUNT(*) as count,
    AVG(retry_count) as avg_retries
  FROM events
  GROUP BY status;
"
```

## Monitoring

### Health Check

The service is healthy when:
- ✅ Event listener is running
- ✅ Pending queue is processing
- ✅ Success rate > 95%
- ✅ No events stuck in retry loop

### Alerts

Set up alerts for:
- ❌ Service stopped unexpectedly
- ❌ Pending queue > 1000 events
- ❌ Success rate < 90%
- ❌ Events stuck with max retries

### Metrics

Key metrics to monitor:
- **totalEventsReceived** - Events detected from contract
- **totalEventsSubmitted** - Events successfully submitted to HCS
- **failedSubmissions** - Failed HCS submissions
- **pendingInQueue** - Events waiting to be submitted
- **successRate** - Percentage of successful submissions

## Troubleshooting

### Events not being detected

**Issue**: Service running but no events received

**Solutions**:
1. Check contract address in `.env`
2. Verify RPC connection: `curl $RPC_URL`
3. Check if contract is emitting events
4. Review event listener logs

### HCS submissions failing

**Issue**: Events queued but not submitted to HCS

**Solutions**:
1. Check Hedera account balance (needs HBAR for fees)
2. Verify operator ID and key are correct
3. Check topic IDs are valid
4. Ensure submit key matches operator key

### High pending queue

**Issue**: Queue growing faster than processing

**Solutions**:
1. Increase `BATCH_SIZE` in config
2. Decrease `PROCESS_INTERVAL_MS`
3. Check HCS rate limits
4. Verify Hedera network status

### Database locked errors

**Issue**: SQLite database locked

**Solutions**:
1. Ensure only one service instance running
2. Check file permissions on `data/` directory
3. Restart service to release locks

## Performance

### Throughput

- **Theoretical Max**: 10,000 HCS submissions/second (Hedera limit)
- **Practical Max**: ~100 events/second (with retries)
- **Typical Load**: 1-10 events/second

### Costs

**HCS Submission Costs**:
- Base fee: $0.0001 per message
- 10,000 events = $1.00
- 1,000,000 events = $100

**Comparison**:
- Storing events on-chain (EVM): ~$50,000 for 1M events
- Using HCS: $100 for 1M events
- **Savings: 99.8%**

## Use Cases

### 1. Audit Trail
All protocol operations immutably logged for:
- Regulatory compliance
- Security audits
- Dispute resolution

### 2. Analytics
Query historical data for:
- Total value locked (TVL)
- User behavior patterns
- Interest rate trends
- Liquidation statistics

### 3. Real-time Dashboards
Stream events to frontend for:
- Live activity feed
- Recent liquidations
- Top suppliers/borrowers
- Protocol metrics

### 4. Notifications
Monitor HCS topics for:
- User-specific events
- Large transactions
- Liquidation alerts
- Governance proposals

## Advanced Features

### Event Replay

Reprocess historical events:

```javascript
// Get all events from block X to block Y
const events = await queryHistoricalEvents(startBlock, endBlock);

for (const event of events) {
  await eventQueue.addEvent(event);
}
```

### Custom Indexing

Build custom indexes:

```javascript
// Index all liquidations by user
const liquidations = await mirrorNodeClient.getTopicMessages(liquidationTopicId);

const byUser = {};
for (const msg of liquidations) {
  const data = JSON.parse(Buffer.from(msg.message, 'base64'));
  byUser[data.borrower] = byUser[data.borrower] || [];
  byUser[data.borrower].push(data);
}
```

### Webhooks

Trigger webhooks on events:

```javascript
streamerContract.on('HCSEventQueued', async (topicId, eventHash, eventType) => {
  if (eventType === 'LIQUIDATION') {
    await axios.post(WEBHOOK_URL, { eventType, eventHash });
  }
});
```

## Security

### Access Control
- Service only needs **submit key** for HCS topics
- No admin privileges required
- Read-only access to contract events

### Data Privacy
- All HCS messages are **public**
- Do not submit sensitive data
- Event data already public on-chain

### Availability
- Service can be restarted anytime
- Historical events automatically replayed
- No data loss if service goes down

## Future Enhancements

- [ ] GraphQL API for querying events
- [ ] WebSocket streaming for real-time updates
- [ ] Custom event filters and subscriptions
- [ ] Export to external analytics platforms
- [ ] Integration with The Graph protocol
- [ ] Advanced retry strategies
- [ ] Event compression for large payloads

## License

MIT License

## Support

- GitHub Issues: Report bugs
- Discord: Community support
- Email: team@dera.fi

---

**🌟 HCS provides unprecedented transparency for DeFi protocols. All Dera Protocol events are publicly verifiable and immutably recorded on Hedera.**
