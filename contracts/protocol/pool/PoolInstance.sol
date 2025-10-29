// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Pool} from './Pool.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';

/**
 * @title PoolInstance
 * @author Dera Protocol
 * @notice Concrete implementation of Pool contract for Hedera deployment
 * @dev Implements the initialize function for upgradeable proxy pattern
 */
contract PoolInstance is Pool {
  uint256 public constant POOL_INSTANCE_REVISION = 0x1;

  constructor(
    IPoolAddressesProvider provider,
    IReserveInterestRateStrategy interestRateStrategy
  ) Pool(provider, interestRateStrategy) {}

  /**
   * @notice Initialize the Pool contract
   * @dev Called only once during proxy initialization
   * @param provider Address of PoolAddressesProvider
   */
  function initialize(IPoolAddressesProvider provider) external override initializer {
    require(address(provider) == address(ADDRESSES_PROVIDER), "Invalid provider");

    // Emit event for tracking initialization
    emit PoolUpgraded(POOL_REVISION());
  }

  /**
   * @notice Get the revision number of this pool instance
   * @return The revision number
   */
  function getRevision() external pure override returns (uint256) {
    return POOL_INSTANCE_REVISION;
  }
}
