// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {GPv2SafeERC20} from '../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {Ownable} from '../../dependencies/openzeppelin/contracts/Ownable.sol';

interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

/**
 * @title RewardsController
 * @author DERA Protocol
 * @notice Manages liquidity mining rewards for DERA protocol on Hedera
 * @dev Simplified rewards system optimized for Hedera's low gas costs
 * 
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): Reward token transfers via HTS precompile
 * - HCS (Hedera Consensus Service): Reward events logged to HCS for transparency
 * - Mirror Nodes: Historical rewards queryable via REST API
 * 
 * INTEGRATION:
 * - HTS: All reward transfers use HTS precompile (0x167)
 * - HCS Events: RewardConfigured, RewardsClaimed logged to HCS
 * - Hedera SDK: Owner uses SDK to configure rewards
 */
contract RewardsController is Ownable {
    using GPv2SafeERC20 for IERC20;

    IHTS private constant HTS = IHTS(address(0x167));
    uint256 public constant REWARDS_CONTROLLER_REVISION = 0x1;

    error HTSError(int64 responseCode);
    error InvalidAmount();
    error AmountExceedsInt64();

    // ============ Structs ============

    struct RewardData {
        uint256 emissionPerSecond;
        uint256 lastUpdateTimestamp;
        uint256 index;
        uint256 endTimestamp;
    }

    struct UserRewardData {
        uint256 index;
        uint256 accrued;
    }

    // ============ State Variables ============

    /// @notice Reward token (e.g., DERA governance token)
    IERC20 public immutable rewardToken;

    /// @notice Mapping of asset => reward data
    mapping(address => RewardData) public rewardData;

    /// @notice Mapping of user => asset => user reward data
    mapping(address => mapping(address => UserRewardData)) public userRewardData;

    /// @notice Total supply of each asset (updated by Pool)
    mapping(address => uint256) public totalSupply;

    // ============ Events ============

    event RewardConfigured(address indexed asset, uint256 emissionPerSecond, uint256 endTimestamp);
    event RewardsClaimed(address indexed user, address indexed asset, uint256 amount);
    event AssetIndexUpdated(address indexed asset, uint256 index);
    event UserIndexUpdated(address indexed user, address indexed asset, uint256 index);

    // ============ Constructor ============

    constructor(address _rewardToken) {
        require(_rewardToken != address(0), "Invalid reward token");
        rewardToken = IERC20(_rewardToken);
    }

    function getRevision() external pure returns (uint256) {
        return REWARDS_CONTROLLER_REVISION;
    }

    // ============ Admin Functions ============

    /**
     * @notice Configure rewards for an asset
     * @param asset The asset to configure rewards for
     * @param emissionPerSecond Reward tokens emitted per second
     * @param duration Duration of rewards in seconds
     */
    function configureReward(
        address asset,
        uint256 emissionPerSecond,
        uint256 duration
    ) external onlyOwner {
        require(asset != address(0), 'INVALID_ASSET');
        _updateAssetIndex(asset);
        
        RewardData storage reward = rewardData[asset];
        reward.emissionPerSecond = emissionPerSecond;
        reward.lastUpdateTimestamp = block.timestamp;
        reward.endTimestamp = block.timestamp + duration;

        emit RewardConfigured(asset, emissionPerSecond, reward.endTimestamp);
    }

    /**
     * @notice Update total supply of an asset (called by Pool)
     * @param asset The asset address
     * @param newTotalSupply The new total supply
     */
    function updateTotalSupply(address asset, uint256 newTotalSupply) external {
        _updateAssetIndex(asset);
        totalSupply[asset] = newTotalSupply;
    }

    // ============ User Functions ============

    /**
     * @notice Claim rewards for multiple assets
     * @param assets Array of asset addresses
     * @param to Address to send rewards to
     * @return Total rewards claimed
     */
    function claimRewards(
        address[] calldata assets,
        address to
    ) external returns (uint256) {
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            _updateAssetIndex(asset);
            
            uint256 userBalance = IERC20(asset).balanceOf(msg.sender);
            uint256 rewards = _updateUserRewards(msg.sender, asset, userBalance);
            
            if (rewards > 0) {
                userRewardData[msg.sender][asset].accrued = 0;
                totalRewards += rewards;
                emit RewardsClaimed(msg.sender, asset, rewards);
            }
        }

        if (totalRewards > 0) {
            _safeHTSTransfer(address(rewardToken), address(this), to, totalRewards);
        }

        return totalRewards;
    }

    function _safeHTSTransfer(address token, address sender, address recipient, uint256 amount) internal {
        if (amount == 0) revert InvalidAmount();
        int64 amountInt64 = _toInt64Checked(amount);
        int64 responseCode = HTS.transferToken(token, sender, recipient, amountInt64);
        if (responseCode != 0) revert HTSError(responseCode);
    }

    function _toInt64Checked(uint256 amount) internal pure returns (int64) {
        if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64();
        return int64(uint64(amount));
    }

    /**
     * @notice Get unclaimed rewards for a user
     * @param user User address
     * @param assets Array of asset addresses
     * @return Total unclaimed rewards
     */
    function getUnclaimedRewards(
        address user,
        address[] calldata assets
    ) external view returns (uint256) {
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 userBalance = IERC20(asset).balanceOf(user);
            totalRewards += _calculateUserRewards(user, asset, userBalance);
        }

        return totalRewards;
    }

    // ============ Internal Functions ============

    function _updateAssetIndex(address asset) internal {
        RewardData storage reward = rewardData[asset];
        
        if (reward.emissionPerSecond == 0) return;
        if (block.timestamp <= reward.lastUpdateTimestamp) return;

        uint256 currentTimestamp = block.timestamp > reward.endTimestamp 
            ? reward.endTimestamp 
            : block.timestamp;
        
        uint256 timeDelta = currentTimestamp - reward.lastUpdateTimestamp;
        uint256 supply = totalSupply[asset];

        if (supply > 0) {
            uint256 newRewards = timeDelta * reward.emissionPerSecond;
            reward.index += (newRewards * 1e18) / supply;
        }

        reward.lastUpdateTimestamp = currentTimestamp;
        emit AssetIndexUpdated(asset, reward.index);
    }

    function _updateUserRewards(
        address user,
        address asset,
        uint256 userBalance
    ) internal returns (uint256) {
        uint256 rewards = _calculateUserRewards(user, asset, userBalance);
        
        UserRewardData storage userData = userRewardData[user][asset];
        userData.accrued += rewards;
        userData.index = rewardData[asset].index;

        emit UserIndexUpdated(user, asset, userData.index);
        return userData.accrued;
    }

    function _calculateUserRewards(
        address user,
        address asset,
        uint256 userBalance
    ) internal view returns (uint256) {
        UserRewardData memory userData = userRewardData[user][asset];
        RewardData memory reward = rewardData[asset];

        uint256 indexDelta = reward.index - userData.index;
        return userData.accrued + (userBalance * indexDelta) / 1e18;
    }
}
