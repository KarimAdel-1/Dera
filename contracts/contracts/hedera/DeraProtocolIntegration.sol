// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraProtocolIntegration
 * @author Dera Protocol
 * @notice Unified integration layer connecting Pool with all Hedera-exclusive features
 *
 * INTEGRATION ARCHITECTURE:
 *
 * Pool Contract
 *     ↓
 * DeraProtocolIntegration (this contract)
 *     ↓
 *     ├─→ DeraHCSEventStreamer (event logging)
 *     ├─→ DeraNodeStaking (fee staking)
 *     ├─→ DeraMirrorNodeAnalytics (metrics)
 *     └─→ DeraInterestRateModel (rates)
 *
 * RESPONSIBILITIES:
 * - Route protocol events to HCS streamer
 * - Transfer protocol fees to node staking contract
 * - Update analytics on every operation
 * - Coordinate between all Hedera features
 * - Provide unified interface for Pool contract
 *
 * HEDERA-EXCLUSIVE:
 * This integration layer only makes sense on Hedera because it connects
 * features that cannot exist on any other blockchain.
 */
contract DeraProtocolIntegration {
  // ============ Integration Contracts ============

  address public immutable POOL;
  address public hcsEventStreamer;
  address public nodeStakingContract;
  address public analyticsContract;
  address public admin;

  // ============ Events ============

  event IntegrationContractUpdated(string indexed contractType, address oldAddress, address newAddress);
  event ProtocolFeeRouted(address indexed asset, uint256 amount, address destination);
  event EventStreamed(string indexed eventType, bytes32 indexed eventHash);
  event AnalyticsUpdated(string indexed metricType, uint256 value);

  // ============ Errors ============

  error OnlyPool();
  error OnlyAdmin();
  error InvalidAddress();

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

  // ============ Integration Setup ============

  /**
   * @notice Set HCS Event Streamer contract address
   */
  function setHCSEventStreamer(address streamer) external onlyAdmin {
    if (streamer == address(0)) revert InvalidAddress();
    address old = hcsEventStreamer;
    hcsEventStreamer = streamer;
    emit IntegrationContractUpdated("HCS_STREAMER", old, streamer);
  }

  /**
   * @notice Set Node Staking contract address
   */
  function setNodeStakingContract(address staking) external onlyAdmin {
    if (staking == address(0)) revert InvalidAddress();
    address old = nodeStakingContract;
    nodeStakingContract = staking;
    emit IntegrationContractUpdated("NODE_STAKING", old, staking);
  }

  /**
   * @notice Set Analytics contract address
   */
  function setAnalyticsContract(address analytics) external onlyAdmin {
    if (analytics == address(0)) revert InvalidAddress();
    address old = analyticsContract;
    analyticsContract = analytics;
    emit IntegrationContractUpdated("ANALYTICS", old, analytics);
  }

  // ============ Supply Integration ============

  /**
   * @notice Handle supply operation integration
   * @dev Called by Pool after every supply operation
   */
  function handleSupply(
    address user,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external onlyPool {
    // 1. Stream event to HCS
    if (hcsEventStreamer != address(0)) {
      _streamSupplyEvent(user, asset, amount, onBehalfOf, referralCode);
    }

    // 2. Update analytics
    if (analyticsContract != address(0)) {
      _updateAnalyticsForSupply(asset, amount);
    }

    // 3. Record user activity
    if (analyticsContract != address(0)) {
      _recordUserActivity(user, "SUPPLY", asset, amount);
    }
  }

  /**
   * @notice Handle borrow operation integration
   * @dev Called by Pool after every borrow operation
   */
  function handleBorrow(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint16 referralCode
  ) external onlyPool {
    // 1. Stream event to HCS
    if (hcsEventStreamer != address(0)) {
      _streamBorrowEvent(user, asset, amount, interestRateMode, onBehalfOf, referralCode);
    }

    // 2. Update analytics
    if (analyticsContract != address(0)) {
      _updateAnalyticsForBorrow(asset, amount);
    }

    // 3. Record user activity
    if (analyticsContract != address(0)) {
      _recordUserActivity(user, "BORROW", asset, amount);
    }
  }

  /**
   * @notice Handle liquidation operation integration
   */
  function handleLiquidation(
    address liquidator,
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral,
    bool receiveSupplyToken
  ) external onlyPool {
    // 1. Stream event to HCS
    if (hcsEventStreamer != address(0)) {
      _streamLiquidationEvent(
        liquidator,
        borrower,
        collateralAsset,
        debtAsset,
        debtToCover,
        liquidatedCollateral,
        receiveSupplyToken
      );
    }

    // 2. Record liquidation in analytics
    if (analyticsContract != address(0)) {
      _recordUserActivity(liquidator, "LIQUIDATION", debtAsset, debtToCover);
    }
  }

  /**
   * @notice Route protocol fees to node staking contract
   * @dev Called by Pool when fees are collected
   */
  function routeProtocolFees(address asset, uint256 feeAmount) external onlyPool {
    if (nodeStakingContract == address(0)) return;
    if (feeAmount == 0) return;

    // Transfer fees to staking contract
    // NOTE: Actual transfer would happen in Pool, this just coordinates

    emit ProtocolFeeRouted(asset, feeAmount, nodeStakingContract);
  }

  /**
   * @notice Update protocol-level analytics
   * @dev Called periodically by Pool or admin
   */
  function updateProtocolAnalytics(
    uint256 tvl,
    uint256 totalSupplied,
    uint256 totalBorrowed,
    uint256 totalUsers
  ) external onlyPool {
    if (analyticsContract == address(0)) return;

    // Call analytics contract
    (bool success, ) = analyticsContract.call(
      abi.encodeWithSignature(
        "updateProtocolMetrics(uint256,uint256,uint256,uint256)",
        tvl,
        totalSupplied,
        totalBorrowed,
        totalUsers
      )
    );

    if (success) {
      emit AnalyticsUpdated("PROTOCOL_METRICS", tvl);
    }
  }

  // ============ Internal Helper Functions ============

  function _streamSupplyEvent(
    address user,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) internal {
    (bool success, ) = hcsEventStreamer.call(
      abi.encodeWithSignature(
        "queueSupplyEvent(address,address,uint256,address,uint16)",
        user,
        asset,
        amount,
        onBehalfOf,
        referralCode
      )
    );

    if (success) {
      bytes32 eventHash = keccak256(abi.encode(user, asset, amount, block.timestamp));
      emit EventStreamed("SUPPLY", eventHash);
    }
  }

  function _streamBorrowEvent(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint16 referralCode
  ) internal {
    (bool success, ) = hcsEventStreamer.call(
      abi.encodeWithSignature(
        "queueBorrowEvent(address,address,uint256,uint256,address,uint16)",
        user,
        asset,
        amount,
        interestRateMode,
        onBehalfOf,
        referralCode
      )
    );

    if (success) {
      bytes32 eventHash = keccak256(abi.encode(user, asset, amount, block.timestamp));
      emit EventStreamed("BORROW", eventHash);
    }
  }

  function _streamLiquidationEvent(
    address liquidator,
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral,
    bool receiveSupplyToken
  ) internal {
    (bool success, ) = hcsEventStreamer.call(
      abi.encodeWithSignature(
        "queueLiquidationEvent(address,address,address,address,uint256,uint256,bool)",
        liquidator,
        borrower,
        collateralAsset,
        debtAsset,
        debtToCover,
        liquidatedCollateral,
        receiveSupplyToken
      )
    );

    if (success) {
      bytes32 eventHash = keccak256(abi.encode(liquidator, borrower, debtToCover, block.timestamp));
      emit EventStreamed("LIQUIDATION", eventHash);
    }
  }

  function _updateAnalyticsForSupply(address asset, uint256 amount) internal {
    // Update asset-specific metrics
    (bool success, ) = analyticsContract.call(
      abi.encodeWithSignature(
        "recordUserActivity(address,string,address,uint256)",
        msg.sender,
        "SUPPLY",
        asset,
        amount
      )
    );

    if (success) {
      emit AnalyticsUpdated("ASSET_SUPPLY", amount);
    }
  }

  function _updateAnalyticsForBorrow(address asset, uint256 amount) internal {
    (bool success, ) = analyticsContract.call(
      abi.encodeWithSignature(
        "recordUserActivity(address,string,address,uint256)",
        msg.sender,
        "BORROW",
        asset,
        amount
      )
    );

    if (success) {
      emit AnalyticsUpdated("ASSET_BORROW", amount);
    }
  }

  function _recordUserActivity(
    address user,
    string memory activityType,
    address asset,
    uint256 amount
  ) internal {
    (bool success, ) = analyticsContract.call(
      abi.encodeWithSignature(
        "recordUserActivity(address,string,address,uint256)",
        user,
        activityType,
        asset,
        amount
      )
    );

    if (success) {
      emit AnalyticsUpdated("USER_ACTIVITY", amount);
    }
  }

  // ============ View Functions ============

  /**
   * @notice Get all integration contract addresses
   */
  function getIntegrationContracts() external view returns (
    address hcsStreamer,
    address nodeStaking,
    address analytics
  ) {
    return (hcsEventStreamer, nodeStakingContract, analyticsContract);
  }

  /**
   * @notice Check if feature is enabled
   */
  function isFeatureEnabled(string calldata feature) external view returns (bool) {
    bytes32 featureHash = keccak256(bytes(feature));

    if (featureHash == keccak256("HCS_STREAMING")) {
      return hcsEventStreamer != address(0);
    } else if (featureHash == keccak256("NODE_STAKING")) {
      return nodeStakingContract != address(0);
    } else if (featureHash == keccak256("ANALYTICS")) {
      return analyticsContract != address(0);
    }

    return false;
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }
}
