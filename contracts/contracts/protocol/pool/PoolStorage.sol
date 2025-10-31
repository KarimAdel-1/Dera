// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {UserConfiguration} from '../libraries/configuration/UserConfiguration.sol';
import {AssetConfiguration} from '../libraries/configuration/AssetConfiguration.sol';
import {AssetLogic} from '../libraries/logic/AssetLogic.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';

/**
 * @title PoolStorage
 * @author Dera Protocol
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
 *
 * DERA PROTOCOL:
 * - Unique architecture: Pool assets instead of reserves
 * - HTS-native token management
 */
contract PoolStorage {
  uint256 public constant POOL_STORAGE_REVISION = 0x1;
  using AssetLogic for DataTypes.PoolAssetData;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  // Map of pool assets and their data (underlyingAsset => poolAssetData)
  mapping(address => DataTypes.PoolAssetData) internal _poolAssets;

  // Map of user addresses and their configuration data (userAddress => userConfiguration)
  mapping(address => DataTypes.UserConfigurationMap) internal _usersConfig;

  // List of assets as a map (assetId => assetAddress).
  // Structured as a mapping for gas savings, using the asset id as index
  mapping(uint256 => address) internal _assetsList;

  // Maximum number of active assets in the protocol. Upper bound of the assets list
  uint16 internal _assetsCount;

  // Emergency pause flag - can be toggled by EMERGENCY_ADMIN to halt all protocol operations
  bool internal _paused;

  // ============ Phase 2: Hedera-Exclusive Integration ============

  // HCS Event Streamer for immutable event logging
  address public hcsEventStreamer;

  // Protocol Integration for unified Hedera integration layer
  address public protocolIntegration;

  // Node Staking contract for protocol revenue staking
  address public nodeStakingContract;

  // Mirror Node Analytics for on-chain metrics
  address public analyticsContract;

  // Dera Interest Rate Model (can be set per-asset or globally)
  address public defaultInterestRateModel;

  // Treasury (Collector contract) for protocol fee management
  address public treasury;

  // ============ User Registry for Liquidation Monitoring ============

  // Array of all registered users (users who have supplied or borrowed)
  address[] internal _users;

  // Mapping to check if a user is registered (for gas-efficient lookups)
  mapping(address => bool) internal _isRegisteredUser;

  function getRevision() internal pure virtual returns (uint256) {
    return POOL_STORAGE_REVISION;
  }
}
