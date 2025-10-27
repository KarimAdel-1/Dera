// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {UserConfiguration} from '../libraries/configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';

/**
 * @title PoolStorage
 * @author DERA Protocol
 * @notice Storage layout for Pool contract on Hedera
 * @dev Defines all storage variables for upgradeable Pool implementation
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: All protocol state stored on-chain
 * - HFS (Hedera File Service): Storage layout documented in HFS for audits
 * - Mirror Nodes: Historical state changes queryable via REST API
 * 
 * INTEGRATION:
 * - Storage Slots: Fixed layout for proxy upgrades
 * - Gas Optimization: Packed structs, mappings over arrays
 * - Optimized Storage: Mappings for gas efficiency
 */
contract PoolStorage {
  uint256 public constant POOL_STORAGE_REVISION = 0x1;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  // Map of reserves and their data (underlyingAssetOfReserve => reserveData)
  mapping(address => DataTypes.ReserveData) internal _reserves;

  // Map of users address and their configuration data (userAddress => userConfiguration)
  mapping(address => DataTypes.UserConfigurationMap) internal _usersConfig;

  // List of reserves as a map (reserveId => reserve).
  // It is structured as a mapping for gas savings reasons, using the reserve id as index
  mapping(uint256 => address) internal _reservesList;

  // Maximum number of active reserves there have been in the protocol. It is the upper bound of the reserves list
  uint16 internal _reservesCount;

  // Emergency pause flag - can be toggled by EMERGENCY_ADMIN to halt all protocol operations
  bool internal _paused;

  function getRevision() external pure virtual returns (uint256) {
    return POOL_STORAGE_REVISION;
  }
}
