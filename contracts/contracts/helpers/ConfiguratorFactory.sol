// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {DeraPoolConfigurator} from '../protocol/pool/DeraPoolConfigurator.sol';

contract ConfiguratorFactory {
  event ConfiguratorDeployed(address indexed configurator, bytes32 salt);

  function deployConfigurator(bytes32 salt) external returns (address) {
    DeraPoolConfigurator configurator = new DeraPoolConfigurator{salt: salt}();
    emit ConfiguratorDeployed(address(configurator), salt);
    return address(configurator);
  }

  function computeAddress(bytes32 salt) external view returns (address) {
    bytes memory bytecode = type(DeraPoolConfigurator).creationCode;
    bytes32 hash = keccak256(
      abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(bytecode))
    );
    return address(uint160(uint256(hash)));
  }
}
