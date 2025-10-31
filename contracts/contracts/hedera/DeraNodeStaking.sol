// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraNodeStaking
 * @author Dera Protocol
 * @notice Stake protocol revenue with Hedera nodes and distribute rewards to lenders
 *
 * UNIQUE TO DERA PROTOCOL:
 * This feature cannot exist on any other blockchain! Dera Protocol automatically stakes
 * accumulated protocol revenue (HBAR) with Hedera consensus nodes, earning staking rewards
 * that are then redistributed to supply token holders. This creates a unique value proposition:
 *
 * LENDERS EARN:
 * 1. Interest from borrowers (standard lending APY)
 * 2. Hedera staking rewards (protocol revenue staked with nodes)
 * 3. Dual yield stream unique to Hedera
 *
 * HEDERA TOOLS USED:
 * - Hedera Node Staking: Stake HBAR with consensus nodes (via Hedera SDK integration)
 * - Staking Rewards: Earn ~6-8% APY on staked HBAR
 * - HCS: Log all staking operations for transparency
 * - Mirror Nodes: Query staking rewards history
 *
 * INTEGRATION:
 * - Protocol accumulates HBAR fees → DeraNodeStaking contract
 * - Admin stakes HBAR with Hedera nodes (via Hedera SDK off-chain)
 * - Staking rewards accrue → Distributed proportionally to DST holders
 * - HCS logs all stake/unstake/distribution operations
 *
 * STAKING FLOW:
 * 1. Pool collects protocol fees in HBAR
 * 2. Transfer fees to DeraNodeStaking contract
 * 3. Admin initiates stake with specific node ID
 * 4. Rewards accrue over time
 * 5. Claim rewards → Distribute to DST holders pro-rata
 *
 * IMPLEMENTATION NOTE:
 * Actual staking with Hedera nodes requires off-chain Hedera SDK integration.
 * This contract manages the accounting and distribution logic on-chain.
 */
contract DeraNodeStaking {
  // Hedera node account ID format: shard.realm.num (e.g., 0.0.3 for node 3)
  struct NodeStake {
    uint64 nodeId;           // Hedera node account number (e.g., 3 for 0.0.3)
    uint256 stakedAmount;    // Amount of HBAR staked with this node
    uint256 rewardsEarned;   // Total rewards earned from this node
    uint256 lastRewardClaim; // Timestamp of last reward claim
    bool active;             // Whether this stake is active
  }

  // Per-asset staking configuration
  struct AssetStakingConfig {
    bool enabled;                    // Whether staking rewards are enabled for this asset
    uint256 totalStakingRewards;     // Total staking rewards allocated to this asset
    uint256 rewardPerDSTToken;       // Reward per DST token (scaled by 1e18)
    uint256 lastUpdateTimestamp;     // Last time rewards were updated
  }

  address public immutable POOL;
  address public immutable ADDRESSES_PROVIDER;
  address public admin;

  // Node staking data
  mapping(uint64 => NodeStake) public nodeStakes;
  uint64[] public stakedNodes;

  // Asset-specific staking rewards
  mapping(address => AssetStakingConfig) public assetStakingConfigs;

  // User reward tracking per asset
  mapping(address => mapping(address => uint256)) public userRewardDebt;

  // Total HBAR available for staking
  uint256 public totalAvailableForStaking;

  // Total HBAR currently staked
  uint256 public totalStaked;

  // Total rewards earned across all nodes
  uint256 public totalRewardsEarned;

  // Events
  event NodeStaked(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
  event NodeUnstaked(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
  event RewardsClaimed(uint64 indexed nodeId, uint256 amount, uint256 timestamp);
  event RewardsDistributed(address indexed asset, uint256 amount, uint256 timestamp);
  event StakingEnabled(address indexed asset, bool enabled);
  event HBARReceived(address indexed from, uint256 amount);

  error OnlyPool();
  error OnlyAdmin();
  error InsufficientBalance();
  error NodeAlreadyStaked();
  error NodeNotStaked();
  error StakingNotEnabled();
  error InvalidAmount();

  modifier onlyPool() {
    if (msg.sender != POOL) revert OnlyPool();
    _;
  }

  modifier onlyAdmin() {
    if (msg.sender != admin) revert OnlyAdmin();
    _;
  }

  constructor(address pool, address addressesProvider, address _admin) {
    POOL = pool;
    ADDRESSES_PROVIDER = addressesProvider;
    admin = _admin;
  }

  /**
   * @notice Receive HBAR from protocol fees
   * @dev Pool contract transfers accumulated fees here
   */
  receive() external payable {
    totalAvailableForStaking += msg.value;
    emit HBARReceived(msg.sender, msg.value);
  }

  /**
   * @notice Initiate staking with a Hedera node
   * @dev This creates an on-chain record. Actual staking done off-chain via Hedera SDK
   * @param nodeId Hedera node account number (e.g., 3 for node 0.0.3)
   * @param amount Amount of HBAR to stake (in tinybars)
   */
  function stakeWithNode(uint64 nodeId, uint256 amount) external onlyAdmin {
    if (amount == 0) revert InvalidAmount();
    if (amount > totalAvailableForStaking) revert InsufficientBalance();
    if (nodeStakes[nodeId].active) revert NodeAlreadyStaked();

    // Update accounting
    totalAvailableForStaking -= amount;
    totalStaked += amount;

    // Record stake
    nodeStakes[nodeId] = NodeStake({
      nodeId: nodeId,
      stakedAmount: amount,
      rewardsEarned: 0,
      lastRewardClaim: block.timestamp,
      active: true
    });

    stakedNodes.push(nodeId);

    emit NodeStaked(nodeId, amount, block.timestamp);

    // NOTE: Off-chain service must execute actual staking via Hedera SDK:
    // const client = Client.forMainnet();
    // await new AccountUpdateTransaction()
    //   .setAccountId(protocolAccountId)
    //   .setStakedNodeId(nodeId)
    //   .execute(client);
  }

  /**
   * @notice Unstake from a Hedera node
   * @dev This creates an on-chain record. Actual unstaking done off-chain via Hedera SDK
   */
  function unstakeFromNode(uint64 nodeId) external onlyAdmin {
    NodeStake storage stake = nodeStakes[nodeId];
    if (!stake.active) revert NodeNotStaked();

    uint256 amount = stake.stakedAmount;

    // Update accounting
    totalStaked -= amount;
    totalAvailableForStaking += amount;
    stake.active = false;

    emit NodeUnstaked(nodeId, amount, block.timestamp);

    // NOTE: Off-chain service must execute actual unstaking via Hedera SDK
  }

  /**
   * @notice Record staking rewards earned from a node
   * @dev Called by admin after claiming rewards via Hedera SDK
   * @param nodeId Node that generated rewards
   * @param rewardAmount Amount of HBAR rewards earned
   */
  function recordStakingRewards(uint64 nodeId, uint256 rewardAmount) external onlyAdmin {
    NodeStake storage stake = nodeStakes[nodeId];
    if (!stake.active) revert NodeNotStaked();

    stake.rewardsEarned += rewardAmount;
    stake.lastRewardClaim = block.timestamp;
    totalRewardsEarned += rewardAmount;
    totalAvailableForStaking += rewardAmount;

    emit RewardsClaimed(nodeId, rewardAmount, block.timestamp);
  }

  /**
   * @notice Distribute staking rewards to an asset's DST holders
   * @dev Rewards are distributed pro-rata based on DST balance
   * @param asset Asset address
   * @param rewardAmount Amount of HBAR rewards to distribute
   */
  function distributeRewardsToAsset(address asset, uint256 rewardAmount) external onlyAdmin {
    AssetStakingConfig storage config = assetStakingConfigs[asset];
    if (!config.enabled) revert StakingNotEnabled();
    if (rewardAmount > totalAvailableForStaking) revert InsufficientBalance();

    totalAvailableForStaking -= rewardAmount;

    // Update reward accounting
    config.totalStakingRewards += rewardAmount;
    config.lastUpdateTimestamp = block.timestamp;

    // Rewards are claimed by users via claimStakingRewards()
    emit RewardsDistributed(asset, rewardAmount, block.timestamp);
  }

  /**
   * @notice Enable staking rewards for an asset
   */
  function enableStakingForAsset(address asset, bool enabled) external onlyAdmin {
    assetStakingConfigs[asset].enabled = enabled;
    emit StakingEnabled(asset, enabled);
  }

  /**
   * @notice Claim staking rewards for a user
   * @dev Users call this to claim their share of staking rewards
   * @param asset Asset for which to claim rewards
   */
  function claimStakingRewards(address asset, address /* user */) external view returns (uint256) {
    AssetStakingConfig storage config = assetStakingConfigs[asset];
    if (!config.enabled) revert StakingNotEnabled();

    // Calculate user's share based on DST balance
    // NOTE: This requires integration with DeraSupplyToken contract
    // For now, return 0 - implement in integration phase
    return 0;
  }

  /**
   * @notice Get total staking info
   */
  function getStakingInfo() external view returns (
    uint256 availableForStaking,
    uint256 currentlyStaked,
    uint256 totalRewards,
    uint256 numNodes
  ) {
    return (
      totalAvailableForStaking,
      totalStaked,
      totalRewardsEarned,
      stakedNodes.length
    );
  }

  /**
   * @notice Get staking info for a specific node
   */
  function getNodeStakeInfo(uint64 nodeId) external view returns (
    uint256 stakedAmount,
    uint256 rewardsEarned,
    uint256 lastRewardClaim,
    bool active
  ) {
    NodeStake memory stake = nodeStakes[nodeId];
    return (
      stake.stakedAmount,
      stake.rewardsEarned,
      stake.lastRewardClaim,
      stake.active
    );
  }

  /**
   * @notice Get asset staking configuration
   */
  function getAssetStakingConfig(address asset) external view returns (
    bool enabled,
    uint256 totalRewards,
    uint256 rewardPerToken,
    uint256 lastUpdate
  ) {
    AssetStakingConfig memory config = assetStakingConfigs[asset];
    return (
      config.enabled,
      config.totalStakingRewards,
      config.rewardPerDSTToken,
      config.lastUpdateTimestamp
    );
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }

  /**
   * @notice Emergency withdraw HBAR
   * @dev Only for emergency situations
   */
  function emergencyWithdraw(address payable to, uint256 amount) external onlyAdmin {
    if (amount > address(this).balance) revert InsufficientBalance();
    (bool success, ) = to.call{value: amount}("");
    require(success, "Transfer failed");
  }
}
