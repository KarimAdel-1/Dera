// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from './IPool.sol';

/**
 * @title IInitializableDebtToken
 * @author Dera Protocol
 * @notice Interface for the initialize function common between debt tokens
 */
interface IInitializableDebtToken {
  event Initialized(address indexed underlyingAsset, address indexed pool, address incentivesController, uint8 debtTokenDecimals, string debtTokenName, string debtTokenSymbol, bytes params);

  function initialize(IPool pool, address underlyingAsset, uint8 debtTokenDecimals, string memory debtTokenName, string memory debtTokenSymbol, bytes calldata params) external;
}
