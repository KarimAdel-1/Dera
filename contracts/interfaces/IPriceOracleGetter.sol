// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPriceOracleGetter
 * @author Dera Protocol
 * @notice Interface for the Dera price oracle
 */
interface IPriceOracleGetter {
  function getAssetPrice(address asset) external view returns (uint256);
}
