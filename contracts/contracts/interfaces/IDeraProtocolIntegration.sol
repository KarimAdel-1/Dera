// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IDeraProtocolIntegration
 * @author Dera Protocol
 * @notice Interface for unified protocol integration layer
 */
interface IDeraProtocolIntegration {
  /**
   * @notice Handle supply operation
   * @param user Address of user supplying
   * @param asset Address of asset being supplied
   * @param amount Amount being supplied
   * @param onBehalfOf Address receiving dTokens
   * @param referralCode Referral code
   */
  function handleSupply(
    address user,
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @notice Handle withdraw operation
   * @param user Address of user withdrawing
   * @param asset Address of asset being withdrawn
   * @param amount Amount being withdrawn
   * @param to Address receiving tokens
   */
  function handleWithdraw(
    address user,
    address asset,
    uint256 amount,
    address to
  ) external;

  /**
   * @notice Handle borrow operation
   * @param user Address of user borrowing
   * @param asset Address of asset being borrowed
   * @param amount Amount being borrowed
   * @param interestRateMode Interest rate mode
   * @param onBehalfOf Address receiving borrowed tokens
   * @param referralCode Referral code
   */
  function handleBorrow(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @notice Handle repay operation
   * @param user Address of user repaying
   * @param asset Address of asset being repaid
   * @param amount Amount being repaid
   * @param interestRateMode Interest rate mode
   * @param onBehalfOf Address whose debt is being repaid
   */
  function handleRepay(
    address user,
    address asset,
    uint256 amount,
    uint256 interestRateMode,
    address onBehalfOf
  ) external;

  /**
   * @notice Handle liquidation operation
   * @param liquidator Address of liquidator
   * @param borrower Address of borrower being liquidated
   * @param collateralAsset Collateral asset address
   * @param debtAsset Debt asset address
   * @param debtToCover Amount of debt to cover
   * @param liquidatedCollateral Amount of collateral liquidated
   */
  function handleLiquidation(
    address liquidator,
    address borrower,
    address collateralAsset,
    address debtAsset,
    uint256 debtToCover,
    uint256 liquidatedCollateral
  ) external;
}
