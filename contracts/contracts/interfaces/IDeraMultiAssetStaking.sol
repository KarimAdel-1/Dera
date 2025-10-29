// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IDeraMultiAssetStaking {
  enum AssetType { HBAR, FUNGIBLE_TOKEN, NFT, RWA }
  enum StakeStatus { ACTIVE, UNSTAKED, EMERGENCY_WITHDRAWN }

  struct Asset {
    AssetType assetType;
    address tokenAddress;
    int64 serialNumber;
    bool isActive;
    uint256 rewardAPY;
    uint256 minStakeAmount;
    string metadata;
  }

  struct Stake {
    address user;
    AssetType assetType;
    address tokenAddress;
    uint256 amount;
    int64 serialNumber;
    uint256 startTime;
    uint256 lockPeriod;
    uint256 unlockTime;
    uint256 rewardAPY;
    uint256 accumulatedRewards;
    uint256 lastRewardCalculation;
    StakeStatus status;
  }

  struct UserStakingSummary {
    uint256 totalStakes;
    uint256 totalValueLocked;
    uint256 totalRewardsEarned;
    uint256 activeStakesCount;
  }

  // Admin functions
  function addAsset(
    address tokenAddress,
    AssetType assetType,
    uint256 rewardAPY,
    uint256 minStakeAmount,
    string calldata metadata
  ) external;

  function removeAsset(address tokenAddress) external;
  function setHCSEventStreamer(address streamer) external;
  function setRewardToken(address token) external;

  // Staking functions
  function stakeFungibleToken(
    address tokenAddress,
    uint256 amount,
    uint256 lockPeriod
  ) external payable returns (uint256 stakeId);

  function stakeNFT(
    address tokenAddress,
    int64 serialNumber,
    uint256 lockPeriod
  ) external returns (uint256 stakeId);

  // Unstaking functions
  function unstake(uint256 stakeId) external;
  function emergencyUnstake(uint256 stakeId) external;
  function claimRewards(uint256 stakeId) external;

  // View functions
  function getUserStakes(address user) external view returns (Stake[] memory);
  function getUserSummary(address user) external view returns (UserStakingSummary memory);
  function getPendingRewards(address user, uint256 stakeId) external view returns (uint256);
  function getSupportedAssets() external view returns (address[] memory);
  function getAsset(address tokenAddress) external view returns (Asset memory);
  function getAPYForPeriod(uint256 lockPeriod) external pure returns (uint256);

  // Events
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
  event Unstaked(address indexed user, uint256 indexed stakeId, uint256 principal, uint256 rewards);
  event RewardsClaimed(address indexed user, uint256 amount);
  event EmergencyWithdraw(address indexed user, uint256 indexed stakeId, uint256 amount, uint256 penalty);
}
