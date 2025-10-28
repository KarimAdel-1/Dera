// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from './IPool.sol';

/**
 * @title IInitializableDeraSupplyToken
 * @author Dera Protocol
 * @notice Interface for the initialize function on DeraSupplyToken (DST)
 */
interface IInitializableDeraSupplyToken {
  event Initialized(address indexed underlyingAsset, address indexed pool, address treasury, address incentivesController, uint8 supplyTokenDecimals, string supplyTokenName, string supplyTokenSymbol, bytes params);

  function initialize(IPool pool, address underlyingAsset, uint8 supplyTokenDecimals, string calldata supplyTokenName, string calldata supplyTokenSymbol, bytes calldata params) external;
}
