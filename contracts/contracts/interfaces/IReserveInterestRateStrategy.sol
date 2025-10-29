// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

/**
 * @title IReserveInterestRateStrategy
 * @author Dera Protocol
 * @notice Basic interface for any rate strategy used by the Dera protocol
 */
interface IReserveInterestRateStrategy {
  function setInterestRateParams(address asset, bytes calldata rateData) external;
  function calculateInterestRates(DataTypes.CalculateInterestRatesParams memory params) external view returns (uint256, uint256);
}
