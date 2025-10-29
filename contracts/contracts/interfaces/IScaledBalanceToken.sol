// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IScaledBalanceToken
 * @author Dera Protocol
 * @notice Defines the basic interface for a scaled-balance token
 */
interface IScaledBalanceToken {
  event Mint(address indexed caller, address indexed onBehalfOf, uint256 value, uint256 balanceIncrease, uint256 index);
  event Burn(address indexed from, address indexed target, uint256 value, uint256 balanceIncrease, uint256 index);

  function scaledBalanceOf(address user) external view returns (uint256);
  function getScaledUserBalanceAndSupply(address user) external view returns (uint256, uint256);
  function scaledTotalSupply() external view returns (uint256);
  function getPreviousIndex(address user) external view returns (uint256);
}
