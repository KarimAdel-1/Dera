// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../../../interfaces/IPool.sol';
import {IPoolConfigurator} from '../../../interfaces/IPoolConfigurator.sol';
import {IInitializableDeraSupplyToken} from '../../../interfaces/IInitializableDeraSupplyToken.sol';
import {IInitializableDebtToken} from '../../../interfaces/IInitializableDebtToken.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {IERC20} from '../../../interfaces/IERC20.sol';

/**
 * @title ConfiguratorLogic
 * @author Dera Protocol
 * @notice Logic for reserve initialization and token upgrades on Hedera
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Reserve configuration stored in contract storage
 * - Proxy Pattern: Minimal proxy for DToken and VariableDebtToken deployment
 * 
 * INTEGRATION:
 * - Reserve Init: Creates DToken and VariableDebtToken proxies for each reserve
 * - Token Upgrades: Upgradeable implementation pattern for token contracts
 * - Configuration: Bitmap-based reserve configuration (decimals, active, paused, frozen)
 */
library ConfiguratorLogic {
  struct InitAssetInput {
    address supplyTokenImpl;
    address variableDebtTokenImpl;
    address underlyingAsset;
    address interestRateStrategyAddress;
    uint8 underlyingAssetDecimals;
    string supplyTokenName;
    string supplyTokenSymbol;
    string variableDebtTokenName;
    string variableDebtTokenSymbol;
    bytes params;
  }

  struct UpdateSupplyTokenInput {
    address asset;
    address implementation;
    string name;
    string symbol;
    bytes params;
  }

  struct UpdateDebtTokenInput {
    address asset;
    address implementation;
    string name;
    string symbol;
    bytes params;
  }

  event AssetInitialized(address indexed asset, address indexed dToken, address variableDebtToken, address interestRateStrategyAddress);
  event SupplyTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);
  event BorrowTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);

  function executeInitAsset(IPool pool, InitAssetInput calldata input) external {
    require(input.underlyingAssetDecimals > 5, 'INVALID_DECIMALS');

    address dTokenProxyAddress = _initTokenWithProxy(input.supplyTokenImpl, abi.encodeWithSelector(IInitializableDeraSupplyToken.initialize.selector, pool, input.underlyingAsset, input.underlyingAssetDecimals, input.supplyTokenName, input.supplyTokenSymbol, input.params));
    address variableDebtTokenProxyAddress = _initTokenWithProxy(input.variableDebtTokenImpl, abi.encodeWithSelector(IInitializableDebtToken.initialize.selector, pool, input.underlyingAsset, input.underlyingAssetDecimals, input.variableDebtTokenName, input.variableDebtTokenSymbol, input.params));

    pool.initAsset(input.underlyingAsset, dTokenProxyAddress, variableDebtTokenProxyAddress, input.interestRateStrategyAddress);

    DataTypes.AssetConfigurationMap memory currentConfig;
    currentConfig.data = 0;
    currentConfig = _setDecimals(currentConfig, input.underlyingAssetDecimals);
    currentConfig = _setActive(currentConfig, true);
    currentConfig = _setPaused(currentConfig, false);
    currentConfig = _setFrozen(currentConfig, false);

    pool.setConfiguration(input.underlyingAsset, currentConfig);

    emit AssetInitialized(input.underlyingAsset, dTokenProxyAddress, variableDebtTokenProxyAddress, input.interestRateStrategyAddress);
  }

  function executeUpdateSupplyToken(IPool pool, UpdateSupplyTokenInput calldata input) external {
    address supplyTokenAddress = pool.getAssetData(input.asset).supplyTokenAddress;
    uint256 decimals = pool.getConfiguration(input.asset).getDecimals();

    bytes memory encodedCall = abi.encodeWithSelector(IInitializableDeraSupplyToken.initialize.selector, pool, input.asset, decimals, input.name, input.symbol, input.params);
    _upgradeTokenImplementation(supplyTokenAddress, input.implementation, encodedCall);

    emit SupplyTokenUpgraded(input.asset, supplyTokenAddress, input.implementation);
  }

  function executeUpdateBorrowToken(IPool pool, UpdateDebtTokenInput calldata input) external {
    address borrowTokenAddress = pool.getAssetData(input.asset).borrowTokenAddress;
    uint256 decimals = pool.getConfiguration(input.asset).getDecimals();

    bytes memory encodedCall = abi.encodeWithSelector(IInitializableDebtToken.initialize.selector, pool, input.asset, decimals, input.name, input.symbol, input.params);
    _upgradeTokenImplementation(borrowTokenAddress, input.implementation, encodedCall);

    emit BorrowTokenUpgraded(input.asset, borrowTokenAddress, input.implementation);
  }

  function _initTokenWithProxy(address implementation, bytes memory initParams) internal returns (address) {
    bytes memory bytecode = abi.encodePacked(type(MinimalProxy).creationCode, abi.encode(implementation));
    address proxy;
    assembly {
      proxy := create(0, add(bytecode, 32), mload(bytecode))
    }
    require(proxy != address(0), 'PROXY_CREATION_FAILED');
    (bool success, ) = proxy.call(initParams);
    require(success, 'INITIALIZATION_FAILED');
    return proxy;
  }

  function _upgradeTokenImplementation(address proxyAddress, address implementation, bytes memory initParams) internal {
    (bool success, ) = proxyAddress.call(abi.encodeWithSignature('upgradeToAndCall(address,bytes)', implementation, initParams));
    require(success, 'UPGRADE_FAILED');
  }

  function _setDecimals(DataTypes.AssetConfigurationMap memory config, uint256 decimals) internal pure returns (DataTypes.AssetConfigurationMap memory) {
    config.data = (config.data & ~(uint256(0xFF))) | decimals;
    return config;
  }

  function _setActive(DataTypes.AssetConfigurationMap memory config, bool active) internal pure returns (DataTypes.AssetConfigurationMap memory) {
    config.data = (config.data & ~(uint256(1) << 56)) | (uint256(active ? 1 : 0) << 56);
    return config;
  }

  function _setPaused(DataTypes.AssetConfigurationMap memory config, bool paused) internal pure returns (DataTypes.AssetConfigurationMap memory) {
    config.data = (config.data & ~(uint256(1) << 60)) | (uint256(paused ? 1 : 0) << 60);
    return config;
  }

  function _setFrozen(DataTypes.AssetConfigurationMap memory config, bool frozen) internal pure returns (DataTypes.AssetConfigurationMap memory) {
    config.data = (config.data & ~(uint256(1) << 57)) | (uint256(frozen ? 1 : 0) << 57);
    return config;
  }
}

contract MinimalProxy {
  address public immutable implementation;

  constructor(address _implementation) {
    implementation = _implementation;
  }

  fallback() external payable {
    address impl = implementation;
    assembly {
      calldatacopy(0, 0, calldatasize())
      let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
      returndatacopy(0, 0, returndatasize())
      switch result
      case 0 { revert(0, returndatasize()) }
      default { return(0, returndatasize()) }
    }
  }
}
