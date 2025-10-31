// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IInitializableDeraSupplyToken} from '../../interfaces/IInitializableDeraSupplyToken.sol';
import {IInitializableDeraBorrowToken} from '../../interfaces/IInitializableDeraBorrowToken.sol';
import {Errors} from '../libraries/helpers/Errors.sol';

contract DirectPoolConfigurator {
  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  IPool public immutable POOL;

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

  function initAssetDirect(
    address supplyTokenImpl,
    address borrowTokenImpl,
    address underlyingAsset
  ) external onlyAssetListingOrPoolAdmins {
    
    // Create proxies
    address supplyProxy = Clones.clone(supplyTokenImpl);
    address borrowProxy = Clones.clone(borrowTokenImpl);
    
    // Initialize supply token
    IInitializableDeraSupplyToken(supplyProxy).initialize(
      POOL,
      underlyingAsset,
      8,
      "Dera HBAR",
      "dHBAR",
      ""
    );
    
    // Initialize borrow token
    IInitializableDeraBorrowToken(borrowProxy).initialize(
      POOL,
      underlyingAsset,
      8,
      "Variable Debt HBAR",
      "vdHBAR",
      ""
    );
    
    // Initialize asset in pool - THIS IS WHERE IT MIGHT FAIL
    POOL.initAsset(underlyingAsset, supplyProxy, borrowProxy);
  }
}