// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from './IPool.sol';

/**
 * @title IInitializableDToken
 * @author Dera Protocol
 * @notice Interface for the initialize function on DToken
 */
interface IInitializableDToken {
  event Initialized(address indexed underlyingAsset, address indexed pool, address treasury, address incentivesController, uint8 dTokenDecimals, string dTokenName, string dTokenSymbol, bytes params);

  function initialize(IPool pool, address underlyingAsset, uint8 dTokenDecimals, string calldata dTokenName, string calldata dTokenSymbol, bytes calldata params) external;
}
