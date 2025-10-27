// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPriceOracle
 * @author Dera Protocol
 * @notice Defines the basic interface for a Price oracle (Pyth Network integration)
 */
interface IPriceOracle {
  function getAssetPrice(address asset) external view returns (uint256);
  function setAssetPrice(address asset, uint256 price) external;
}
