// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {WadRayMath} from '../math/WadRayMath.sol';

/**
 * @title TokenMath
 * @author DERA Protocol
 * @notice Scaled balance calculations for interest-bearing tokens on Hedera
 * @dev Conservative rounding protects protocol and users from precision loss
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: All calculations performed on-chain
 * - Ray Precision: 1e27 for high-precision interest accrual
 * 
 * TOKEN TYPES:
 * - DToken (Deposit Token): Interest-bearing tokens for suppliers
 *   Example: Deposit 100 USDC → Get 100 dUSDC (earns interest)
 * - VariableDebtToken: Debt tokens for borrowers
 *   Example: Borrow 50 USDC → Get 50 variableDebtUSDC (accrues interest)
 * 
 * ROUNDING STRATEGY:
 * - DToken Mint: Floor (user gets slightly less, protocol protected)
 * - DToken Burn: Ceil (user pays slightly more, protocol protected)
 * - DToken Transfer: Ceil (sender pays slightly more, receiver protected)
 * - VariableDebtToken Mint: Ceil (user borrows slightly more, protocol protected)
 * - VariableDebtToken Burn: Floor (user repays slightly less, protocol protected)
 * 
 * FORMULAS:
 * - actualBalance = scaledBalance × index (Floor for assets, Ceil for debt)
 * - scaledAmount = actualAmount / index (Floor for burns, Ceil for mints)
 * 
 * CONSERVATIVE ROUNDING:
 * - Always rounds in favor of protocol solvency
 * - Prevents dust accumulation from rounding errors
 * - Ensures protocol remains fully collateralized
 * 
 */
library TokenMath {
  using WadRayMath for uint256;

  // ============ DToken (Deposit Token) Functions ============
  
  /**
   * @notice Calculate scaled amount for DToken mint (supply)
   * @dev Floor rounding: User gets slightly less, protocol protected
   */
  function getDTokenMintScaledAmount(uint256 amount, uint256 liquidityIndex) internal pure returns (uint256) {
    return amount.rayDivFloor(liquidityIndex);
  }

  /**
   * @notice Calculate scaled amount for DToken burn (withdraw)
   * @dev Ceil rounding: User pays slightly more, protocol protected
   */
  function getDTokenBurnScaledAmount(uint256 amount, uint256 liquidityIndex) internal pure returns (uint256) {
    return amount.rayDivCeil(liquidityIndex);
  }

  /**
   * @notice Calculate scaled amount for DToken transfer
   * @dev Ceil rounding: Sender pays slightly more, receiver protected
   */
  function getDTokenTransferScaledAmount(uint256 amount, uint256 liquidityIndex) internal pure returns (uint256) {
    return amount.rayDivCeil(liquidityIndex);
  }

  /**
   * @notice Calculate actual balance from scaled balance for DToken
   * @dev Floor rounding: Conservative for protocol
   */
  function getDTokenBalance(uint256 scaledAmount, uint256 liquidityIndex) internal pure returns (uint256) {
    return scaledAmount.rayMulFloor(liquidityIndex);
  }

  // ============ VariableDebtToken Functions ============
  
  /**
   * @notice Calculate scaled amount for VariableDebtToken mint (borrow)
   * @dev Ceil rounding: User borrows slightly more, protocol protected
   */
  function getVariableDebtTokenMintScaledAmount(uint256 amount, uint256 variableBorrowIndex) internal pure returns (uint256) {
    return amount.rayDivCeil(variableBorrowIndex);
  }

  /**
   * @notice Calculate scaled amount for VariableDebtToken burn (repay)
   * @dev Floor rounding: User repays slightly less, protocol protected
   */
  function getVariableDebtTokenBurnScaledAmount(uint256 amount, uint256 variableBorrowIndex) internal pure returns (uint256) {
    return amount.rayDivFloor(variableBorrowIndex);
  }

  /**
   * @notice Calculate actual debt from scaled debt for VariableDebtToken
   * @dev Ceil rounding: Conservative for protocol (debt rounded up)
   */
  function getVariableDebtTokenBalance(uint256 scaledAmount, uint256 variableBorrowIndex) internal pure returns (uint256) {
    return scaledAmount.rayMulCeil(variableBorrowIndex);
  }
}
