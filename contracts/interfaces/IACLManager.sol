// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from './IPoolAddressesProvider.sol';

/**
 * @title IACLManager
 * @author Dera Protocol
 * @notice Defines the basic interface for the ACL Manager (simplified, no governance)
 */
interface IACLManager {
  function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);
  function POOL_ADMIN_ROLE() external view returns (bytes32);
  function EMERGENCY_ADMIN_ROLE() external view returns (bytes32);
  function RISK_ADMIN_ROLE() external view returns (bytes32);
  function ASSET_LISTING_ADMIN_ROLE() external view returns (bytes32);
  function setRoleAdmin(bytes32 role, bytes32 adminRole) external;
  function addPoolAdmin(address admin) external;
  function removePoolAdmin(address admin) external;
  function isPoolAdmin(address admin) external view returns (bool);
  function addEmergencyAdmin(address admin) external;
  function removeEmergencyAdmin(address admin) external;
  function isEmergencyAdmin(address admin) external view returns (bool);
  function addRiskAdmin(address admin) external;
  function removeRiskAdmin(address admin) external;
  function isRiskAdmin(address admin) external view returns (bool);
  function addAssetListingAdmin(address admin) external;
  function removeAssetListingAdmin(address admin) external;
  function isAssetListingAdmin(address admin) external view returns (bool);
}
