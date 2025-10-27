// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../dependencies/openzeppelin/contracts/IERC20.sol';

/**
 * @title IERC20WithPermit
 * @author Dera
 * @notice ERC20 with EIP-2612 permit function
 */
interface IERC20WithPermit is IERC20 {
  function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;
}
