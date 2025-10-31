// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IInitializableDeraSupplyToken} from '../../interfaces/IInitializableDeraSupplyToken.sol';
import {IInitializableDeraBorrowToken} from '../../interfaces/IInitializableDeraBorrowToken.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

contract ProductionPoolConfigurator {
  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  IPool public immutable POOL;
  
  mapping(address => address) public supplyTokens;
  mapping(address => address) public borrowTokens;
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

  function initHBAR(address supplyTokenImpl, address borrowTokenImpl) external onlyAssetListingOrPoolAdmins {
    _initAsset(supplyTokenImpl, borrowTokenImpl, address(0), 8, "Dera HBAR", "dHBAR", "Variable Debt HBAR", "vdHBAR");
  }
  
  function initUSDC(address supplyTokenImpl, address borrowTokenImpl) external onlyAssetListingOrPoolAdmins {
    _initAsset(supplyTokenImpl, borrowTokenImpl, 0x000000000000000000000000000000000006f89a, 6, "Dera USDC", "dUSDC", "Variable Debt USDC", "vdUSDC");
  }
  
  function initSAUCE(address supplyTokenImpl, address borrowTokenImpl) external onlyAssetListingOrPoolAdmins {
    _initAsset(supplyTokenImpl, borrowTokenImpl, 0x00000000000000000000000000000000000b2aD5, 6, "Dera SAUCE", "dSAUCE", "Variable Debt SAUCE", "vdSAUCE");
  }
  
  function _initAsset(
    address supplyTokenImpl,
    address borrowTokenImpl,
    address underlyingAsset,
    uint8 decimals,
    string memory supplyName,
    string memory supplySymbol,
    string memory borrowName,
    string memory borrowSymbol
  ) internal {
    if (supplyTokens[underlyingAsset] != address(0)) revert("Asset already initialized");
    
    address supplyProxy = Clones.clone(supplyTokenImpl);
    address borrowProxy = Clones.clone(borrowTokenImpl);
    
    IInitializableDeraSupplyToken(supplyProxy).initialize(
      POOL, underlyingAsset, decimals, supplyName, supplySymbol, ""
    );
    
    IInitializableDeraBorrowToken(borrowProxy).initialize(
      POOL, underlyingAsset, decimals, borrowName, borrowSymbol, ""
    );
    
    supplyTokens[underlyingAsset] = supplyProxy;
    borrowTokens[underlyingAsset] = borrowProxy;
    assetsList.push(underlyingAsset);
    
    emit AssetInitialized(underlyingAsset, supplyProxy, borrowProxy);
  }
  
  function getAssetsCount() external view returns (uint256) {
    return assetsList.length;
  }
  
  function getSupplyToken(address asset) external view returns (address) {
    return supplyTokens[asset];
  }
  
  function getBorrowToken(address asset) external view returns (address) {
    return borrowTokens[asset];
  }
}