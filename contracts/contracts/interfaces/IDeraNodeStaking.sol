// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDeraNodeStaking
 * @author Dera Protocol
 * @notice Interface for Hedera node staking rewards management
 */
interface IDeraNodeStaking {
  /**
   * @notice Deposit protocol fees as staking rewards
   * @param amount Amount of HBAR to deposit
   */
  function depositRewards(uint256 amount) external payable;

  /**
   * @notice Record staking rewards earned from Hedera nodes
   * @param nodeId Hedera node ID
   * @param amount Amount of rewards earned
   */
  function recordStakingRewards(
    uint64 nodeId,
    uint256 amount
  ) external;

  /**
   * @notice Get total staked amount with specific node
   * @param nodeId Hedera node ID
   * @return Total amount staked
   */
  function getStakedAmount(uint64 nodeId) external view returns (uint256);

  /**
   * @notice Get total rewards earned
   * @return Total rewards in HBAR
   */
  function getTotalRewards() external view returns (uint256);

  /**
   * @notice Get user's share of staking rewards
   * @param user User address
   * @return Reward share amount
   */
  function getUserRewardShare(address user) external view returns (uint256);

  /**
   * @notice Claim accumulated staking rewards
   */
  function claimRewards() external;
}
