// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDeraMirrorNodeAnalytics
 * @author Dera Protocol
 * @notice Interface for on-chain analytics storage
 */
interface IDeraMirrorNodeAnalytics {
  /**
   * @notice Record supply event
   * @param asset Asset address
   * @param amount Amount supplied
   * @param user User address
   */
  function recordSupply(
    address asset,
    uint256 amount,
    address user
  ) external;

  /**
   * @notice Record withdraw event
   * @param asset Asset address
   * @param amount Amount withdrawn
   * @param user User address
   */
  function recordWithdraw(
    address asset,
    uint256 amount,
    address user
  ) external;

  /**
   * @notice Record borrow event
   * @param asset Asset address
   * @param amount Amount borrowed
   * @param user User address
   */
  function recordBorrow(
    address asset,
    uint256 amount,
    address user
  ) external;

  /**
   * @notice Record repay event
   * @param asset Asset address
   * @param amount Amount repaid
   * @param user User address
   */
  function recordRepay(
    address asset,
    uint256 amount,
    address user
  ) external;

  /**
   * @notice Record liquidation event
   * @param collateralAsset Collateral asset address
   * @param debtAsset Debt asset address
   * @param debtToCover Amount of debt covered
   * @param liquidatedCollateral Amount of collateral liquidated
   * @param liquidator Liquidator address
   * @param borrower Borrower address
   */
  function recordLiquidation(
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral,
    address liquidator,
    address borrower
  ) external;

  /**
   * @notice Update protocol metrics
   * @param totalSupply Total supplied across all assets
   * @param totalBorrow Total borrowed across all assets
   * @param activeUsers Number of active users
   */
  function updateProtocolMetrics(
    uint256 totalSupply,
    uint256 totalBorrow,
    uint256 activeUsers
  ) external;
}
