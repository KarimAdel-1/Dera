// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IInitializableDeraSupplyToken} from '../../interfaces/IInitializableDeraSupplyToken.sol';
import {IInitializableDeraBorrowToken} from '../../interfaces/IInitializableDeraBorrowToken.sol';
import {Errors} from '../libraries/helpers/Errors.sol';

contract WorkingPoolConfigurator {
  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  IPool public immutable POOL;
  
  mapping(address => bool) public assetsInitialized;
  address[] public assetsList;

  event AssetInitialized(address indexed asset, address supplyToken, address borrowToken);

  modifier onlyAssetListingOrPoolAdmins() {
    IACLManager aclManager = IACLManager(ADDRESSES_PROVIDER.getACLManager());
    if (!aclManager.isAssetListingAdmin(msg.sender) && !aclManager.isPoolAdmin(msg.sender)) 
      revert Errors.CallerNotAssetListingOrPoolAdmin();
    _;
  }

  constructor(IPoolAddressesProvider provider) {
    ADDRESSES_PROVIDER = provider;
    POOL = IPool(provider.getPool());
  }

  function initHBAR(
    address supplyTokenImpl,
    address borrowTokenImpl
  ) external onlyAssetListingOrPoolAdmins {
    address asset = address(0); // HBAR
    
    if (assetsInitialized[asset]) revert("Asset already initialized");
    
    // Create proxies
    address supplyProxy = Clones.clone(supplyTokenImpl);
    address borrowProxy = Clones.clone(borrowTokenImpl);
    
    // Initialize tokens
    IInitializableDeraSupplyToken(supplyProxy).initialize(
      POOL, asset, 8, "Dera HBAR", "dHBAR", ""
    );
    
    IInitializableDeraBorrowToken(borrowProxy).initialize(
      POOL, asset, 8, "Variable Debt HBAR", "vdHBAR", ""
    );
    
    // Mark as initialized
    assetsInitialized[asset] = true;
    assetsList.push(asset);
    
    emit AssetInitialized(asset, supplyProxy, borrowProxy);
  }
  
  function getAssetsCount() external view returns (uint256) {
    return assetsList.length;
  }
}