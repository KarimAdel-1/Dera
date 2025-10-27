// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../interfaces/IERC20.sol';

interface IRevenueSplitter {
  error InvalidPercentSplit();

  function RECIPIENT_A() external view returns (address payable);
  function RECIPIENT_B() external view returns (address payable);
  function SPLIT_PERCENTAGE_RECIPIENT_A() external view returns (uint16);
  function splitRevenue(IERC20[] memory tokens) external;
  function splitNativeRevenue() external;
}
