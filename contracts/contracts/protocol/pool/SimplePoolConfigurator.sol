// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {ConfiguratorLogic} from '../libraries/logic/ConfiguratorLogic.sol';
import {ConfiguratorInputTypes} from '../libraries/types/ConfiguratorInputTypes.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import {Errors} from '../libraries/helpers/Errors.sol';

contract SimplePoolConfigurator {
  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  IPool public immutable POOL;

  event AssetInterestRateDataChanged(address indexed asset, address strategy, bytes data);

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

  function initAssets(ConfiguratorInputTypes.InitAssetInput[] calldata input) external onlyAssetListingOrPoolAdmins {
    address interestRateStrategyAddress = POOL.RESERVE_INTEREST_RATE_STRATEGY();
    
    uint256 len = input.length;
    for (uint256 i; i < len; ) {
      uint8 decimals = 18;
      
      try IERC20Metadata(input[i].underlyingAsset).decimals() returns (uint8 d) {
        decimals = d;
      } catch {
        if (input[i].params.length > 0) {
          decimals = uint8(input[i].params[0]);
        }
      }
      
      ConfiguratorLogic.executeInitAsset(POOL, ConfiguratorLogic.InitAssetInput({
        supplyTokenImpl: input[i].supplyTokenImpl,
        variableDebtTokenImpl: input[i].variableDebtTokenImpl,
        underlyingAsset: input[i].underlyingAsset,
        interestRateStrategyAddress: interestRateStrategyAddress,
        underlyingAssetDecimals: decimals,
        supplyTokenName: input[i].supplyTokenName,
        supplyTokenSymbol: input[i].supplyTokenSymbol,
        variableDebtTokenName: input[i].variableDebtTokenName,
        variableDebtTokenSymbol: input[i].variableDebtTokenSymbol,
        params: input[i].params
      }));
      
      emit AssetInterestRateDataChanged(input[i].underlyingAsset, interestRateStrategyAddress, "");
      unchecked { ++i; }
    }
  }
}