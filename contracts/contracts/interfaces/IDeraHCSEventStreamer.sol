// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDeraHCSEventStreamer
 * @author Dera Protocol
 * @notice Interface for Hedera Consensus Service (HCS) Event Streamer
 */
interface IDeraHCSEventStreamer {
  /**
   * @notice Queue supply event for HCS submission
   */
  function queueSupplyEvent(
    address user,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @notice Queue withdraw event for HCS submission
   */
  function queueWithdrawEvent(
    address user,
    address asset,
    uint256 amount,
    address to
  ) external;

  /**
   * @notice Queue borrow event for HCS submission
   */
  function queueBorrowEvent(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @notice Queue repay event for HCS submission
   */
  function queueRepayEvent(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf
  ) external;

  /**
   * @notice Queue liquidation event for HCS submission
   */
  function queueLiquidationEvent(
    address liquidator,
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral,
    bool receiveSupplyToken
  ) external;
}
