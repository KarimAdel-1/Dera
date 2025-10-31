// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';

contract CloneFactory {
  function createClone(address implementation) external returns (address) {
    return Clones.clone(implementation);
  }
  
  function initializeClone(address proxy, bytes calldata initData) external returns (bool) {
    (bool success, ) = proxy.call(initData);
    return success;
  }
}