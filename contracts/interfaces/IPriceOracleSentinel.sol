// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IPriceOracleSentinel
 * @author Dera Protocol
 * @notice Defines the basic interface for the PriceOracleSentinel
 */
interface IPriceOracleSentinel {
  function isBorrowAllowed() external view returns (bool);
  function isLiquidationAllowed() external view returns (bool);
}
