// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from './IPool.sol';

/**
 * @title IInitializableDeraBorrowToken
 * @author Dera Protocol
 * @notice Interface for the initialize function on DeraBorrowToken (DBT)
 */
interface IInitializableDeraBorrowToken {
  event Initialized(address indexed underlyingAsset, address indexed pool, address incentivesController, uint8 borrowTokenDecimals, string borrowTokenName, string borrowTokenSymbol, bytes params);

  function initialize(IPool pool, address underlyingAsset, uint8 borrowTokenDecimals, string memory borrowTokenName, string memory borrowTokenSymbol, bytes calldata params) external;
}
