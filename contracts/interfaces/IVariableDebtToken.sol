// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IScaledBalanceToken} from './IScaledBalanceToken.sol';
import {IInitializableDebtToken} from './IInitializableDebtToken.sol';

/**
 * @title IVariableDebtToken
 * @author Dera Protocol
 * @notice Defines the basic interface for a variable debt token
 */
interface IVariableDebtToken is IScaledBalanceToken, IInitializableDebtToken {
  function mint(address user, address onBehalfOf, uint256 amount, uint256 scaledAmount, uint256 index) external returns (uint256);
  function burn(address from, uint256 scaledAmount, uint256 index) external returns (bool, uint256);
  function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
