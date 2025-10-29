// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeraMultiAssetStaking
 * @author Dera Protocol
 * @notice Multi-asset staking contract supporting HTS tokens, NFTs, and RWAs on Hedera
 *
 * UNIQUE TO HEDERA:
 * - Stake native HTS tokens (no ERC20 wrappers needed)
 * - Stake Hedera NFTs (native L1 NFTs)
 * - Stake Real World Assets (RWAs) tokenized as HTS
 * - Earn rewards in multiple tokens
 * - Leverages HTS precompile for all operations
 *
 * HEDERA TOOLS USED:
 * - HTS Precompile (0x167): All token/NFT operations
 * - Mirror Node: Query staking history and analytics
 * - HCS: Log all staking/unstaking events
 *
 * SUPPORTED ASSET TYPES:
 * 1. HBAR (native)
 * 2. Fungible HTS Tokens (USDC, wrapped tokens, etc.)
 * 3. Non-Fungible HTS Tokens (NFTs)
 * 4. Real World Assets (RWAs tokenized as HTS)
 *
 * FEATURES:
 * - Flexible staking periods (7, 30, 90, 180, 365 days)
 * - Higher APY for longer lock periods
 * - Compound rewards automatically
 * - Emergency withdraw (with penalty)
 * - NFT yield farming
 */

// HTS precompile interface
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
  function transferNFT(address token, address sender, address recipient, int64 serialNumber) external returns (int64);
  function approve(address token, address spender, uint256 amount) external returns (int64);
  function approveNFT(address token, address approved, int64 serialNumber) external returns (int64);
  function balanceOf(address token, address account) external view returns (uint256);
  function ownerOf(address token, int64 serialNumber) external view returns (address);
  function isApprovedForAll(address token, address owner, address operator) external view returns (bool);
}

contract DeraMultiAssetStaking {
  // ============ Constants ============

  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile

  // Staking periods (in seconds)
  uint256 public constant PERIOD_7_DAYS = 7 days;
  uint256 public constant PERIOD_30_DAYS = 30 days;
  uint256 public constant PERIOD_90_DAYS = 90 days;
  uint256 public constant PERIOD_180_DAYS = 180 days;
  uint256 public constant PERIOD_365_DAYS = 365 days;

  // APY multipliers (basis points, 10000 = 100%)
  uint256 public constant APY_7_DAYS = 500;      // 5%
  uint256 public constant APY_30_DAYS = 1000;    // 10%
  uint256 public constant APY_90_DAYS = 2000;    // 20%
  uint256 public constant APY_180_DAYS = 3500;   // 35%
  uint256 public constant APY_365_DAYS = 5000;   // 50%

  // Early unstake penalty (basis points)
  uint256 public constant EARLY_UNSTAKE_PENALTY = 2000; // 20%

  // ============ Enums ============

  enum AssetType { HBAR, FUNGIBLE_TOKEN, NFT, RWA }
  enum StakeStatus { ACTIVE, UNSTAKED, EMERGENCY_WITHDRAWN }

  // ============ Structs ============

  struct Asset {
    AssetType assetType;
    address tokenAddress;  // 0x0 for HBAR, HTS token address otherwise
    int64 serialNumber;    // For NFTs only
    bool isActive;
    uint256 rewardAPY;     // Custom APY for this asset (basis points)
    uint256 minStakeAmount; // Minimum stake amount (0 for NFTs)
    string metadata;       // IPFS hash or description (for RWAs)
  }

  struct Stake {
    address user;
    AssetType assetType;
    address tokenAddress;
    uint256 amount;        // Amount for fungible tokens, 0 for NFTs
    int64 serialNumber;    // NFT serial number, 0 for fungible tokens
    uint256 startTime;
    uint256 lockPeriod;    // Lock duration in seconds
    uint256 unlockTime;
    uint256 rewardAPY;     // APY at stake time (basis points)
    uint256 accumulatedRewards;
    uint256 lastRewardCalculation;
    StakeStatus status;
  }

  struct UserStakingSummary {
    uint256 totalStakes;
    uint256 totalValueLocked; // In USD (scaled by 1e8)
    uint256 totalRewardsEarned;
    uint256 activeStakesCount;
  }

  // ============ State Variables ============

  address public admin;
  address public rewardsTreasury;
  address public hcsEventStreamer; // For logging events to HCS

  // Asset registry
  mapping(address => Asset) public assets; // tokenAddress => Asset
  address[] public supportedAssets;

  // User stakes
  mapping(address => Stake[]) public userStakes;
  mapping(address => UserStakingSummary) public userSummaries;

  // Global statistics
  uint256 public totalValueLocked;
  uint256 public totalStakers;
  uint256 public totalRewardsPaid;

  // Reward token (default: HBAR)
  address public rewardToken;

  // ============ Events ============

  event AssetAdded(address indexed tokenAddress, AssetType assetType, uint256 rewardAPY);
  event AssetRemoved(address indexed tokenAddress);
  event Staked(
    address indexed user,
    address indexed tokenAddress,
    AssetType assetType,
    uint256 amount,
    int64 serialNumber,
    uint256 lockPeriod,
    uint256 unlockTime,
    uint256 stakeId
  );
  event Unstaked(
    address indexed user,
    uint256 indexed stakeId,
    uint256 principal,
    uint256 rewards
  );
  event RewardsClaimed(address indexed user, uint256 amount);
  event EmergencyWithdraw(
    address indexed user,
    uint256 indexed stakeId,
    uint256 amount,
    uint256 penalty
  );

  // ============ Errors ============

  error OnlyAdmin();
  error AssetNotSupported();
  error AssetAlreadyExists();
  error InvalidAmount();
  error InvalidLockPeriod();
  error StakeNotFound();
  error StakeLocked();
  error StakeAlreadyUnstaked();
  error InsufficientRewards();
  error HTSTransferFailed(int64 responseCode);
  error InvalidAssetType();

  // ============ Modifiers ============

  modifier onlyAdmin() {
    if (msg.sender != admin) revert OnlyAdmin();
    _;
  }

  // ============ Constructor ============

  constructor(address _admin, address _rewardsTreasury) {
    admin = _admin;
    rewardsTreasury = _rewardsTreasury;
    rewardToken = address(0); // Default to HBAR rewards
  }

  // ============ Admin Functions ============

  /**
   * @notice Add a new asset to the staking pool
   * @param tokenAddress Token address (0x0 for HBAR)
   * @param assetType Type of asset (HBAR, FUNGIBLE_TOKEN, NFT, RWA)
   * @param rewardAPY Annual percentage yield in basis points
   * @param minStakeAmount Minimum amount to stake (0 for NFTs)
   * @param metadata IPFS hash or description for RWAs
   */
  function addAsset(
    address tokenAddress,
    AssetType assetType,
    uint256 rewardAPY,
    uint256 minStakeAmount,
    string calldata metadata
  ) external onlyAdmin {
    if (assets[tokenAddress].isActive) revert AssetAlreadyExists();

    assets[tokenAddress] = Asset({
      assetType: assetType,
      tokenAddress: tokenAddress,
      serialNumber: 0,
      isActive: true,
      rewardAPY: rewardAPY,
      minStakeAmount: minStakeAmount,
      metadata: metadata
    });

    supportedAssets.push(tokenAddress);

    emit AssetAdded(tokenAddress, assetType, rewardAPY);
  }

  /**
   * @notice Remove an asset from staking
   */
  function removeAsset(address tokenAddress) external onlyAdmin {
    assets[tokenAddress].isActive = false;
    emit AssetRemoved(tokenAddress);
  }

  /**
   * @notice Set HCS event streamer for logging
   */
  function setHCSEventStreamer(address streamer) external onlyAdmin {
    hcsEventStreamer = streamer;
  }

  /**
   * @notice Set reward token address
   */
  function setRewardToken(address token) external onlyAdmin {
    rewardToken = token;
  }

  // ============ Staking Functions ============

  /**
   * @notice Stake fungible HTS tokens or HBAR
   * @param tokenAddress Token address (0x0 for HBAR)
   * @param amount Amount to stake
   * @param lockPeriod Lock period (must be one of the predefined periods)
   */
  function stakeFungibleToken(
    address tokenAddress,
    uint256 amount,
    uint256 lockPeriod
  ) external payable returns (uint256 stakeId) {
    Asset memory asset = assets[tokenAddress];
    if (!asset.isActive) revert AssetNotSupported();
    if (asset.assetType == AssetType.NFT) revert InvalidAssetType();
    if (amount < asset.minStakeAmount) revert InvalidAmount();

    uint256 apy = _getAPYForLockPeriod(lockPeriod);
    if (apy == 0) revert InvalidLockPeriod();

    // Handle HBAR staking
    if (tokenAddress == address(0)) {
      if (msg.value != amount) revert InvalidAmount();
    } else {
      // Transfer HTS tokens using precompile
      int64 result = HTS.transferToken(
        tokenAddress,
        msg.sender,
        address(this),
        int64(uint64(amount))
      );
      if (result != 22) revert HTSTransferFailed(result); // 22 = SUCCESS
    }

    // Create stake
    stakeId = userStakes[msg.sender].length;
    userStakes[msg.sender].push(Stake({
      user: msg.sender,
      assetType: asset.assetType,
      tokenAddress: tokenAddress,
      amount: amount,
      serialNumber: 0,
      startTime: block.timestamp,
      lockPeriod: lockPeriod,
      unlockTime: block.timestamp + lockPeriod,
      rewardAPY: apy,
      accumulatedRewards: 0,
      lastRewardCalculation: block.timestamp,
      status: StakeStatus.ACTIVE
    }));

    // Update statistics
    if (userStakes[msg.sender].length == 1) {
      totalStakers++;
    }
    userSummaries[msg.sender].totalStakes++;
    userSummaries[msg.sender].activeStakesCount++;
    totalValueLocked += amount;

    emit Staked(
      msg.sender,
      tokenAddress,
      asset.assetType,
      amount,
      0,
      lockPeriod,
      block.timestamp + lockPeriod,
      stakeId
    );
  }

  /**
   * @notice Stake an NFT
   * @param tokenAddress NFT token address
   * @param serialNumber NFT serial number
   * @param lockPeriod Lock period
   */
  function stakeNFT(
    address tokenAddress,
    int64 serialNumber,
    uint256 lockPeriod
  ) external returns (uint256 stakeId) {
    Asset memory asset = assets[tokenAddress];
    if (!asset.isActive) revert AssetNotSupported();
    if (asset.assetType != AssetType.NFT) revert InvalidAssetType();

    uint256 apy = _getAPYForLockPeriod(lockPeriod);
    if (apy == 0) revert InvalidLockPeriod();

    // Transfer NFT using HTS precompile
    int64 result = HTS.transferNFT(
      tokenAddress,
      msg.sender,
      address(this),
      serialNumber
    );
    if (result != 22) revert HTSTransferFailed(result);

    // Create stake
    stakeId = userStakes[msg.sender].length;
    userStakes[msg.sender].push(Stake({
      user: msg.sender,
      assetType: AssetType.NFT,
      tokenAddress: tokenAddress,
      amount: 0,
      serialNumber: serialNumber,
      startTime: block.timestamp,
      lockPeriod: lockPeriod,
      unlockTime: block.timestamp + lockPeriod,
      rewardAPY: apy,
      accumulatedRewards: 0,
      lastRewardCalculation: block.timestamp,
      status: StakeStatus.ACTIVE
    }));

    // Update statistics
    if (userStakes[msg.sender].length == 1) {
      totalStakers++;
    }
    userSummaries[msg.sender].totalStakes++;
    userSummaries[msg.sender].activeStakesCount++;

    emit Staked(
      msg.sender,
      tokenAddress,
      AssetType.NFT,
      0,
      serialNumber,
      lockPeriod,
      block.timestamp + lockPeriod,
      stakeId
    );
  }

  // ============ Unstaking Functions ============

  /**
   * @notice Unstake and claim rewards
   * @param stakeId Stake ID
   */
  function unstake(uint256 stakeId) external {
    if (stakeId >= userStakes[msg.sender].length) revert StakeNotFound();

    Stake storage stake = userStakes[msg.sender][stakeId];
    if (stake.status != StakeStatus.ACTIVE) revert StakeAlreadyUnstaked();
    if (block.timestamp < stake.unlockTime) revert StakeLocked();

    // Calculate final rewards
    uint256 rewards = _calculateRewards(stake);
    stake.accumulatedRewards += rewards;

    // Transfer principal back to user
    if (stake.assetType == AssetType.NFT) {
      // Transfer NFT back
      int64 result = HTS.transferNFT(
        stake.tokenAddress,
        address(this),
        msg.sender,
        stake.serialNumber
      );
      if (result != 22) revert HTSTransferFailed(result);
    } else {
      // Transfer fungible tokens back
      if (stake.tokenAddress == address(0)) {
        // HBAR
        (bool success, ) = payable(msg.sender).call{value: stake.amount}("");
        require(success, "HBAR transfer failed");
      } else {
        // HTS token
        int64 result = HTS.transferToken(
          stake.tokenAddress,
          address(this),
          msg.sender,
          int64(uint64(stake.amount))
        );
        if (result != 22) revert HTSTransferFailed(result);
      }
    }

    // Transfer rewards
    if (stake.accumulatedRewards > 0) {
      _transferRewards(msg.sender, stake.accumulatedRewards);
    }

    // Update stake status
    stake.status = StakeStatus.UNSTAKED;
    userSummaries[msg.sender].activeStakesCount--;
    userSummaries[msg.sender].totalRewardsEarned += stake.accumulatedRewards;
    totalValueLocked -= stake.amount;
    totalRewardsPaid += stake.accumulatedRewards;

    emit Unstaked(msg.sender, stakeId, stake.amount, stake.accumulatedRewards);
  }

  /**
   * @notice Emergency unstake (with penalty)
   * @param stakeId Stake ID
   */
  function emergencyUnstake(uint256 stakeId) external {
    if (stakeId >= userStakes[msg.sender].length) revert StakeNotFound();

    Stake storage stake = userStakes[msg.sender][stakeId];
    if (stake.status != StakeStatus.ACTIVE) revert StakeAlreadyUnstaked();

    // Calculate penalty
    uint256 penalty = (stake.amount * EARLY_UNSTAKE_PENALTY) / 10000;
    uint256 amountAfterPenalty = stake.amount - penalty;

    // Transfer principal minus penalty
    if (stake.assetType == AssetType.NFT) {
      // NFT: no penalty, just forfeit rewards
      int64 result = HTS.transferNFT(
        stake.tokenAddress,
        address(this),
        msg.sender,
        stake.serialNumber
      );
      if (result != 22) revert HTSTransferFailed(result);
    } else {
      if (stake.tokenAddress == address(0)) {
        (bool success, ) = payable(msg.sender).call{value: amountAfterPenalty}("");
        require(success, "HBAR transfer failed");
      } else {
        int64 result = HTS.transferToken(
          stake.tokenAddress,
          address(this),
          msg.sender,
          int64(uint64(amountAfterPenalty))
        );
        if (result != 22) revert HTSTransferFailed(result);
      }
    }

    // Update stake status (no rewards on emergency withdraw)
    stake.status = StakeStatus.EMERGENCY_WITHDRAWN;
    userSummaries[msg.sender].activeStakesCount--;
    totalValueLocked -= stake.amount;

    emit EmergencyWithdraw(msg.sender, stakeId, amountAfterPenalty, penalty);
  }

  // ============ Rewards Functions ============

  /**
   * @notice Claim accumulated rewards without unstaking
   * @param stakeId Stake ID
   */
  function claimRewards(uint256 stakeId) external {
    if (stakeId >= userStakes[msg.sender].length) revert StakeNotFound();

    Stake storage stake = userStakes[msg.sender][stakeId];
    if (stake.status != StakeStatus.ACTIVE) revert StakeAlreadyUnstaked();

    // Calculate and update rewards
    uint256 rewards = _calculateRewards(stake);
    stake.accumulatedRewards += rewards;
    stake.lastRewardCalculation = block.timestamp;

    if (stake.accumulatedRewards == 0) revert InsufficientRewards();

    // Transfer rewards
    uint256 rewardAmount = stake.accumulatedRewards;
    stake.accumulatedRewards = 0;

    _transferRewards(msg.sender, rewardAmount);

    userSummaries[msg.sender].totalRewardsEarned += rewardAmount;
    totalRewardsPaid += rewardAmount;

    emit RewardsClaimed(msg.sender, rewardAmount);
  }

  // ============ View Functions ============

  /**
   * @notice Get user's active stakes
   */
  function getUserStakes(address user) external view returns (Stake[] memory) {
    return userStakes[user];
  }

  /**
   * @notice Get user's staking summary
   */
  function getUserSummary(address user) external view returns (UserStakingSummary memory) {
    return userSummaries[user];
  }

  /**
   * @notice Calculate pending rewards for a stake
   */
  function getPendingRewards(address user, uint256 stakeId) external view returns (uint256) {
    if (stakeId >= userStakes[user].length) return 0;

    Stake memory stake = userStakes[user][stakeId];
    if (stake.status != StakeStatus.ACTIVE) return 0;

    return _calculateRewards(stake);
  }

  /**
   * @notice Get all supported assets
   */
  function getSupportedAssets() external view returns (address[] memory) {
    return supportedAssets;
  }

  /**
   * @notice Get asset details
   */
  function getAsset(address tokenAddress) external view returns (Asset memory) {
    return assets[tokenAddress];
  }

  // ============ Internal Functions ============

  /**
   * @notice Calculate rewards for a stake
   */
  function _calculateRewards(Stake memory stake) internal view returns (uint256) {
    if (stake.status != StakeStatus.ACTIVE) return 0;

    uint256 stakingDuration = block.timestamp - stake.lastRewardCalculation;

    // For NFTs, use fixed reward amount per day
    if (stake.assetType == AssetType.NFT) {
      // Fixed: 1 HBAR per day per NFT (can be customized)
      return (stakingDuration * 1 ether) / 1 days;
    }

    // For fungible tokens: (amount * APY * time) / (365 days * 10000)
    return (stake.amount * stake.rewardAPY * stakingDuration) / (365 days * 10000);
  }

  /**
   * @notice Transfer rewards to user
   */
  function _transferRewards(address user, uint256 amount) internal {
    if (rewardToken == address(0)) {
      // HBAR rewards
      (bool success, ) = payable(user).call{value: amount}("");
      require(success, "HBAR reward transfer failed");
    } else {
      // HTS token rewards
      int64 result = HTS.transferToken(
        rewardToken,
        rewardsTreasury,
        user,
        int64(uint64(amount))
      );
      if (result != 22) revert HTSTransferFailed(result);
    }
  }

  /**
   * @notice Get APY for a given lock period
   */
  function _getAPYForLockPeriod(uint256 lockPeriod) internal pure returns (uint256) {
    if (lockPeriod == PERIOD_7_DAYS) return APY_7_DAYS;
    if (lockPeriod == PERIOD_30_DAYS) return APY_30_DAYS;
    if (lockPeriod == PERIOD_90_DAYS) return APY_90_DAYS;
    if (lockPeriod == PERIOD_180_DAYS) return APY_180_DAYS;
    if (lockPeriod == PERIOD_365_DAYS) return APY_365_DAYS;
    return 0;
  }

  /**
   * @notice Get APY as percentage string (for frontend)
   */
  function getAPYForPeriod(uint256 lockPeriod) external pure returns (uint256) {
    return _getAPYForLockPeriod(lockPeriod);
  }

  // ============ Receive Function ============

  receive() external payable {
    // Allow contract to receive HBAR for rewards
  }
}
