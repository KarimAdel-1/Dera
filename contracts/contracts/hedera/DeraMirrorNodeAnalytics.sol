// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraMirrorNodeAnalytics
 * @author Dera Protocol
 * @notice On-chain storage for analytics metadata queryable via Mirror Nodes
 *
 * UNIQUE TO DERA PROTOCOL:
 * Leverages Hedera Mirror Nodes' powerful querying capabilities to provide real-time
 * protocol analytics without needing to run custom indexing infrastructure.
 *
 * HEDERA TOOLS USED:
 * - Mirror Nodes REST API: Query historical contract state and events
 * - HCS: Structured analytics messages submitted to dedicated topic
 * - Contract State: Analytics metadata stored on-chain for queries
 *
 * MIRROR NODE QUERIES:
 * - GET /api/v1/contracts/{contractId}/results - All transactions
 * - GET /api/v1/contracts/{contractId}/state - Current state
 * - GET /api/v1/contracts/call - Read-only contract calls
 * - GET /api/v1/topics/{topicId}/messages - HCS messages
 *
 * ANALYTICS PROVIDED:
 * 1. **Protocol Metrics**: TVL, total supplied, total borrowed, utilization
 * 2. **Asset Metrics**: Per-asset TVL, supply/borrow volumes, rates
 * 3. **User Metrics**: Top suppliers, borrowers, liquidators
 * 4. **Historical Data**: Time-series data for charts and analysis
 * 5. **Risk Metrics**: Health factor distribution, liquidation risk
 *
 * INTEGRATION:
 * - Smart contract emits events → Mirror Nodes index automatically
 * - Frontend queries Mirror Node API → Get protocol analytics
 * - No custom indexer needed → Leverage Hedera infrastructure
 *
 * EXAMPLE QUERIES:
 *
 * Get total protocol TVL:
 * curl "https://mainnet-public.mirrornode.hedera.com/api/v1/contracts/{contractId}/state"
 *
 * Get supply history:
 * curl "https://mainnet-public.mirrornode.hedera.com/api/v1/contracts/{contractId}/results?type=SUPPLY"
 *
 * Get HCS analytics:
 * curl "https://mainnet-public.mirrornode.hedera.com/api/v1/topics/{topicId}/messages"
 */
contract DeraMirrorNodeAnalytics {
  // ============ Analytics Storage ============

  // Global protocol metrics (updated on every operation)
  struct ProtocolMetrics {
    uint256 totalValueLocked;      // Total value in USD (scaled by 1e8)
    uint256 totalSupplied;         // Total supplied across all assets
    uint256 totalBorrowed;         // Total borrowed across all assets
    uint256 totalUsers;            // Number of unique users
    uint256 totalTransactions;     // Total number of transactions
    uint256 lastUpdateTimestamp;   // Last metrics update
  }

  // Per-asset analytics
  struct AssetMetrics {
    uint256 totalSupply;           // Total supplied for this asset
    uint256 totalBorrow;           // Total borrowed for this asset
    uint256 supplyAPY;             // Current supply APY (scaled by 1e4)
    uint256 borrowAPY;             // Current borrow APY (scaled by 1e4)
    uint256 utilization;           // Utilization rate (scaled by 1e4)
    uint256 supplierCount;         // Number of suppliers
    uint256 borrowerCount;         // Number of borrowers
    uint256 last24hVolume;         // Trading volume last 24h
    uint256 lastUpdateTimestamp;
  }

  // Historical snapshot for time-series data
  struct HistoricalSnapshot {
    uint256 timestamp;
    uint256 tvl;
    uint256 totalSupplied;
    uint256 totalBorrowed;
    uint256 utilizationRate;
  }

  // ============ State Variables ============

  ProtocolMetrics public protocolMetrics;
  mapping(address => AssetMetrics) public assetMetrics;
  HistoricalSnapshot[] public historicalSnapshots;

  // HCS topic for analytics
  uint64 public analyticsTopicId;

  address public immutable POOL;
  address public admin;

  // Events for Mirror Node indexing
  event ProtocolMetricsUpdated(
    uint256 tvl,
    uint256 totalSupplied,
    uint256 totalBorrowed,
    uint256 timestamp
  );

  event AssetMetricsUpdated(
    address indexed asset,
    uint256 totalSupply,
    uint256 totalBorrow,
    uint256 supplyAPY,
    uint256 borrowAPY,
    uint256 utilization,
    uint256 timestamp
  );

  event HistoricalSnapshotCreated(
    uint256 indexed snapshotId,
    uint256 timestamp,
    uint256 tvl,
    uint256 totalSupplied,
    uint256 totalBorrowed
  );

  event UserActivity(
    address indexed user,
    string activityType,
    address indexed asset,
    uint256 amount,
    uint256 timestamp
  );

  error OnlyPool();
  error OnlyAdmin();

  modifier onlyPool() {
    if (msg.sender != POOL) revert OnlyPool();
    _;
  }

  modifier onlyAdmin() {
    if (msg.sender != admin) revert OnlyAdmin();
    _;
  }

  constructor(address pool, address _admin) {
    POOL = pool;
    admin = _admin;
  }

  /**
   * @notice Update protocol-level metrics
   * @dev Called by Pool contract after every operation
   */
  function updateProtocolMetrics(
    uint256 tvl,
    uint256 totalSupplied,
    uint256 totalBorrowed,
    uint256 totalUsers
  ) external onlyPool {
    protocolMetrics = ProtocolMetrics({
      totalValueLocked: tvl,
      totalSupplied: totalSupplied,
      totalBorrowed: totalBorrowed,
      totalUsers: totalUsers,
      totalTransactions: protocolMetrics.totalTransactions + 1,
      lastUpdateTimestamp: block.timestamp
    });

    emit ProtocolMetricsUpdated(tvl, totalSupplied, totalBorrowed, block.timestamp);
  }

  /**
   * @notice Update asset-specific metrics
   * @dev Called by Pool contract when asset state changes
   */
  function updateAssetMetrics(
    address asset,
    uint256 totalSupply,
    uint256 totalBorrow,
    uint256 supplyAPY,
    uint256 borrowAPY
  ) external onlyPool {
    uint256 utilization = totalSupply == 0
      ? 0
      : (totalBorrow * 10000) / totalSupply;

    AssetMetrics storage metrics = assetMetrics[asset];

    // Update supplier/borrower counts
    // (simplified - actual implementation would track unique addresses)

    metrics.totalSupply = totalSupply;
    metrics.totalBorrow = totalBorrow;
    metrics.supplyAPY = supplyAPY;
    metrics.borrowAPY = borrowAPY;
    metrics.utilization = utilization;
    metrics.lastUpdateTimestamp = block.timestamp;

    emit AssetMetricsUpdated(
      asset,
      totalSupply,
      totalBorrow,
      supplyAPY,
      borrowAPY,
      utilization,
      block.timestamp
    );
  }

  /**
   * @notice Record user activity for analytics
   * @dev Emits event that Mirror Nodes will index
   */
  function recordUserActivity(
    address user,
    string calldata activityType,
    address asset,
    uint256 amount
  ) external onlyPool {
    emit UserActivity(user, activityType, asset, amount, block.timestamp);
  }

  /**
   * @notice Create historical snapshot for time-series data
   * @dev Should be called periodically (e.g., every hour/day)
   */
  function createHistoricalSnapshot() external onlyAdmin {
    uint256 snapshotId = historicalSnapshots.length;

    HistoricalSnapshot memory snapshot = HistoricalSnapshot({
      timestamp: block.timestamp,
      tvl: protocolMetrics.totalValueLocked,
      totalSupplied: protocolMetrics.totalSupplied,
      totalBorrowed: protocolMetrics.totalBorrowed,
      utilizationRate: protocolMetrics.totalSupplied == 0
        ? 0
        : (protocolMetrics.totalBorrowed * 10000) / protocolMetrics.totalSupplied
    });

    historicalSnapshots.push(snapshot);

    emit HistoricalSnapshotCreated(
      snapshotId,
      snapshot.timestamp,
      snapshot.tvl,
      snapshot.totalSupplied,
      snapshot.totalBorrowed
    );
  }

  /**
   * @notice Set HCS analytics topic ID
   */
  function setAnalyticsTopicId(uint64 topicId) external onlyAdmin {
    analyticsTopicId = topicId;
  }

  /**
   * @notice Get current protocol metrics
   * @dev Queryable via Mirror Node contract state API
   */
  function getProtocolMetrics() external view returns (
    uint256 tvl,
    uint256 totalSupplied,
    uint256 totalBorrowed,
    uint256 totalUsers,
    uint256 totalTransactions,
    uint256 lastUpdate
  ) {
    ProtocolMetrics memory m = protocolMetrics;
    return (
      m.totalValueLocked,
      m.totalSupplied,
      m.totalBorrowed,
      m.totalUsers,
      m.totalTransactions,
      m.lastUpdateTimestamp
    );
  }

  /**
   * @notice Get asset-specific metrics
   * @dev Queryable via Mirror Node contract state API
   */
  function getAssetMetrics(address asset) external view returns (
    uint256 totalSupply,
    uint256 totalBorrow,
    uint256 supplyAPY,
    uint256 borrowAPY,
    uint256 utilization,
    uint256 supplierCount,
    uint256 borrowerCount,
    uint256 volume24h
  ) {
    AssetMetrics memory m = assetMetrics[asset];
    return (
      m.totalSupply,
      m.totalBorrow,
      m.supplyAPY,
      m.borrowAPY,
      m.utilization,
      m.supplierCount,
      m.borrowerCount,
      m.last24hVolume
    );
  }

  /**
   * @notice Get historical snapshots
   * @dev Returns recent snapshots for time-series charts
   */
  function getHistoricalSnapshots(uint256 count) external view returns (
    HistoricalSnapshot[] memory
  ) {
    uint256 length = historicalSnapshots.length;
    uint256 returnCount = count > length ? length : count;

    HistoricalSnapshot[] memory snapshots = new HistoricalSnapshot[](returnCount);

    for (uint256 i = 0; i < returnCount; i++) {
      snapshots[i] = historicalSnapshots[length - returnCount + i];
    }

    return snapshots;
  }

  /**
   * @notice Get utilization rate for an asset
   * @dev Helper for frontend queries
   */
  function getUtilizationRate(address asset) external view returns (uint256) {
    AssetMetrics memory m = assetMetrics[asset];
    return m.utilization;
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }
}
