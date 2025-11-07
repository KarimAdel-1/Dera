// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {AssetLogic} from './AssetLogic.sol';

library FixedPoolLogic {
  using SafeERC20 for IERC20;
  using TokenMath for uint256;
  using AssetLogic for DataTypes.PoolAssetData;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;

  function executeInitAsset(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.InitPoolAssetParams memory params
  ) external returns (bool) {
    // Allow HBAR (zero address) as native token
    if (params.asset != address(0) && !Address.isContract(params.asset)) revert Errors.NotContract();
    
    // Simple check - if asset has any data, it's already added
    if (poolAssets[params.asset].supplyTokenAddress != address(0)) revert Errors.AssetAlreadyAdded();
    
    // Initialize the asset
    poolAssets[params.asset].init(params.supplyTokenAddress, params.variableDebtAddress);
    
    // Find next available slot
    // NOTE: We cannot check assetsList[i] == address(0) because HBAR IS address(0)
    // Instead, check if the asset at that slot is uninitialized (supplyTokenAddress == 0)
    uint16 assetId = params.assetsCount;
    for (uint16 i = 0; i < params.assetsCount; i++) {
      address slotAsset = assetsList[i];
      // A slot is empty if the asset at that position has no supplyTokenAddress set
      if (poolAssets[slotAsset].supplyTokenAddress == address(0)) {
        assetId = i;
        break;
      }
    }
    
    // Check max assets limit
    if (assetId >= params.maxNumberAssets) revert Errors.NoMoreReservesAllowed();
    
    // Assign ID and add to list
    poolAssets[params.asset].id = assetId;
    assetsList[assetId] = params.asset;
    
    return assetId == params.assetsCount; // true if new slot, false if reused
  }
}