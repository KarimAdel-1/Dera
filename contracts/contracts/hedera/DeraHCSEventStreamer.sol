// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraHCSEventStreamer
 * @author Dera Protocol
 * @notice Real-time event streaming to Hedera Consensus Service (HCS)
 *
 * UNIQUE TO DERA PROTOCOL:
 * This contract provides transparent, immutable event logging via HCS that cannot be replicated
 * on any other blockchain. All protocol events are streamed to dedicated HCS topics for:
 * - Real-time analytics dashboards
 * - Transparent audit trails
 * - Off-chain indexing services
 * - Regulatory compliance reporting
 *
 * HEDERA TOOLS USED:
 * - HCS (Hedera Consensus Service): Submit messages to topics for consensus timestamps
 * - HCS Topics: Dedicated topics for each event type (supply, borrow, liquidation, etc.)
 * - Mirror Nodes: Historical HCS messages queryable via REST API
 *
 * INTEGRATION:
 * - Pool contract emits events → DeraHCSEventStreamer → HCS topics
 * - Off-chain service listens to events → Formats data → Submits to HCS
 * - Mirror Nodes index HCS messages → Queryable via GET /api/v1/topics/{topicId}/messages
 *
 * HCS TOPICS STRUCTURE:
 * - Topic 0.0.X: Supply events
 * - Topic 0.0.Y: Withdraw events
 * - Topic 0.0.Z: Borrow events
 * - Topic 0.0.A: Repay events
 * - Topic 0.0.B: Liquidation events
 * - Topic 0.0.C: Protocol configuration changes
 */
contract DeraHCSEventStreamer {
  // HCS topic IDs (format: 0.0.topicId as uint64)
  uint64 public supplyTopicId;
  uint64 public withdrawTopicId;
  uint64 public borrowTopicId;
  uint64 public repayTopicId;
  uint64 public liquidationTopicId;
  uint64 public configTopicId;
  uint64 public governanceTopicId;

  address public immutable POOL;
  address public admin;

  // Event metadata for HCS submission
  struct EventMetadata {
    uint64 topicId;
    uint256 timestamp;
    bytes32 eventHash;
    bool submitted;
  }

  // Track which events have been submitted to HCS
  mapping(bytes32 => EventMetadata) public eventSubmissions;

  // Events emitted for off-chain HCS relay service
  event HCSEventQueued(
    uint64 indexed topicId,
    bytes32 indexed eventHash,
    string eventType,
    bytes eventData
  );

  event HCSTopicUpdated(string indexed eventType, uint64 oldTopicId, uint64 newTopicId);
  event HCSSubmissionConfirmed(bytes32 indexed eventHash, uint64 topicId, uint256 timestamp);

  error OnlyPool();
  error OnlyAdmin();
  error EventAlreadySubmitted();
  error InvalidTopicId();

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
   * @notice Initialize HCS topic IDs
   * @dev Topics must be created via Hedera SDK before setting IDs
   * @param _supplyTopicId HCS topic for supply events
   * @param _withdrawTopicId HCS topic for withdraw events
   * @param _borrowTopicId HCS topic for borrow events
   * @param _repayTopicId HCS topic for repay events
   * @param _liquidationTopicId HCS topic for liquidation events
   * @param _configTopicId HCS topic for config changes
   */
  function initializeTopics(
    uint64 _supplyTopicId,
    uint64 _withdrawTopicId,
    uint64 _borrowTopicId,
    uint64 _repayTopicId,
    uint64 _liquidationTopicId,
    uint64 _configTopicId,
    uint64 _governanceTopicId
  ) external onlyAdmin {
    if (_supplyTopicId == 0) revert InvalidTopicId();

    supplyTopicId = _supplyTopicId;
    withdrawTopicId = _withdrawTopicId;
    borrowTopicId = _borrowTopicId;
    repayTopicId = _repayTopicId;
    liquidationTopicId = _liquidationTopicId;
    configTopicId = _configTopicId;
    governanceTopicId = _governanceTopicId;
  }

  /**
   * @notice Queue supply event for HCS submission
   * @dev Called by Pool contract on every supply operation
   */
  function queueSupplyEvent(
    address user,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external onlyPool {
    bytes memory eventData = abi.encode(
      block.timestamp,
      block.number,
      user,
      asset,
      amount,
      onBehalfOf,
      referralCode
    );

    bytes32 eventHash = keccak256(eventData);

    eventSubmissions[eventHash] = EventMetadata({
      topicId: supplyTopicId,
      timestamp: block.timestamp,
      eventHash: eventHash,
      submitted: false
    });

    emit HCSEventQueued(supplyTopicId, eventHash, "SUPPLY", eventData);
  }

  /**
   * @notice Queue borrow event for HCS submission
   */
  function queueBorrowEvent(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint16 referralCode
  ) external onlyPool {
    bytes memory eventData = abi.encode(
      block.timestamp,
      block.number,
      user,
      asset,
      amount,
      interestRateMode,
      onBehalfOf,
      referralCode
    );

    bytes32 eventHash = keccak256(eventData);

    eventSubmissions[eventHash] = EventMetadata({
      topicId: borrowTopicId,
      timestamp: block.timestamp,
      eventHash: eventHash,
      submitted: false
    });

    emit HCSEventQueued(borrowTopicId, eventHash, "BORROW", eventData);
  }

  /**
   * @notice Queue liquidation event for HCS submission
   */
  function queueLiquidationEvent(
    address liquidator,
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral,
    bool receiveSupplyToken
  ) external onlyPool {
    bytes memory eventData = abi.encode(
      block.timestamp,
      block.number,
      liquidator,
      borrower,
      collateralAsset,
      debtAsset,
      debtToCover,
      liquidatedCollateral,
      receiveSupplyToken
    );

    bytes32 eventHash = keccak256(eventData);

    eventSubmissions[eventHash] = EventMetadata({
      topicId: liquidationTopicId,
      timestamp: block.timestamp,
      eventHash: eventHash,
      submitted: false
    });

    emit HCSEventQueued(liquidationTopicId, eventHash, "LIQUIDATION", eventData);
  }

  /**
   * @notice Confirm HCS submission (called by off-chain relay service)
   * @dev This creates an on-chain record that the event was submitted to HCS
   */
  function confirmHCSSubmission(bytes32 eventHash) external onlyAdmin {
    EventMetadata storage metadata = eventSubmissions[eventHash];
    if (metadata.submitted) revert EventAlreadySubmitted();

    metadata.submitted = true;

    emit HCSSubmissionConfirmed(eventHash, metadata.topicId, metadata.timestamp);
  }

  /**
   * @notice Update HCS topic ID for an event type
   * @dev Allows migration to new HCS topics if needed
   */
  function updateTopicId(string calldata eventType, uint64 newTopicId) external onlyAdmin {
    if (newTopicId == 0) revert InvalidTopicId();

    bytes32 eventTypeHash = keccak256(bytes(eventType));
    uint64 oldTopicId;

    if (eventTypeHash == keccak256("SUPPLY")) {
      oldTopicId = supplyTopicId;
      supplyTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("WITHDRAW")) {
      oldTopicId = withdrawTopicId;
      withdrawTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("BORROW")) {
      oldTopicId = borrowTopicId;
      borrowTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("REPAY")) {
      oldTopicId = repayTopicId;
      repayTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("LIQUIDATION")) {
      oldTopicId = liquidationTopicId;
      liquidationTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("CONFIG")) {
      oldTopicId = configTopicId;
      configTopicId = newTopicId;
    } else if (eventTypeHash == keccak256("GOVERNANCE")) {
      oldTopicId = governanceTopicId;
      governanceTopicId = newTopicId;
    }

    emit HCSTopicUpdated(eventType, oldTopicId, newTopicId);
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }

  /**
   * @notice Get event submission status
   */
  function getEventStatus(bytes32 eventHash) external view returns (
    uint64 topicId,
    uint256 timestamp,
    bool submitted
  ) {
    EventMetadata memory metadata = eventSubmissions[eventHash];
    return (metadata.topicId, metadata.timestamp, metadata.submitted);
  }
}
