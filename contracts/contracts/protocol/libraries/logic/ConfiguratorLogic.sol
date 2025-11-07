// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../../../interfaces/IPool.sol';
import {IPoolConfigurator} from '../../../interfaces/IPoolConfigurator.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {IInitializableDeraSupplyToken} from '../../../interfaces/IInitializableDeraSupplyToken.sol';
import {IInitializableDeraBorrowToken} from '../../../interfaces/IInitializableDeraBorrowToken.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {Errors} from '../helpers/Errors.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';


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
  event ProxiesInitialized(address indexed asset, address indexed dToken, address variableDebtToken);
  event SupplyTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);
  event BorrowTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);

  function executeInitAsset(IPool pool, InitAssetInput calldata input) external {
    if (input.underlyingAssetDecimals == 0 || input.underlyingAssetDecimals > 30) revert Errors.InvalidDecimals();

    // Extract encoding to separate variables to reduce stack depth with viaIR
    bytes memory supplyTokenInitData = abi.encodeWithSelector(
      IInitializableDeraSupplyToken.initialize.selector,
      pool,
      input.underlyingAsset,
      input.underlyingAssetDecimals,
      input.supplyTokenName,
      input.supplyTokenSymbol,
      input.params
    );
    address dTokenProxyAddress = _initTokenWithProxy(input.supplyTokenImpl, supplyTokenInitData);

    bytes memory borrowTokenInitData = abi.encodeWithSelector(
      IInitializableDeraBorrowToken.initialize.selector,
      pool,
      input.underlyingAsset,
      input.underlyingAssetDecimals,
      input.variableDebtTokenName,
      input.variableDebtTokenSymbol,
      input.params
    );
    address variableDebtTokenProxyAddress = _initTokenWithProxy(input.variableDebtTokenImpl, borrowTokenInitData);

    // Do NOT call pool.initAsset or pool.setConfiguration here — deploying and initializing
    // token proxies is gas-heavy and when combined with pool registration in a single
    // transaction can exceed gas/stack limits on Hedera. Split the flow: callers should
    // call `finalizeInitAsset` separately to register the asset in the Pool.
    emit ProxiesInitialized(input.underlyingAsset, dTokenProxyAddress, variableDebtTokenProxyAddress);
    emit AssetInitialized(input.underlyingAsset, dTokenProxyAddress, variableDebtTokenProxyAddress, input.interestRateStrategyAddress);
  }

  function executeUpdateSupplyToken(IPool pool, UpdateSupplyTokenInput calldata input) external {
    address supplyTokenAddress = pool.getAssetData(input.asset).supplyTokenAddress;
    DataTypes.AssetConfigurationMap memory config = pool.getConfiguration(input.asset);
    (, , , uint256 decimals, ) = AssetConfiguration.getParams(config);

    bytes memory encodedCall = abi.encodeWithSelector(IInitializableDeraSupplyToken.initialize.selector, pool, input.asset, decimals, input.name, input.symbol, input.params);
    _upgradeTokenImplementation(supplyTokenAddress, input.implementation, encodedCall);

    emit SupplyTokenUpgraded(input.asset, supplyTokenAddress, input.implementation);
  }

  function executeUpdateBorrowToken(IPool pool, UpdateDebtTokenInput calldata input) external {
    address borrowTokenAddress = pool.getAssetData(input.asset).borrowTokenAddress;
    DataTypes.AssetConfigurationMap memory config = pool.getConfiguration(input.asset);
    (, , , uint256 decimals, ) = AssetConfiguration.getParams(config);

    bytes memory encodedCall = abi.encodeWithSelector(IInitializableDeraBorrowToken.initialize.selector, pool, input.asset, decimals, input.name, input.symbol, input.params);
    _upgradeTokenImplementation(borrowTokenAddress, input.implementation, encodedCall);

    emit BorrowTokenUpgraded(input.asset, borrowTokenAddress, input.implementation);
  }

  function _initTokenWithProxy(address implementation, bytes memory initParams) internal returns (address) {
    address proxy = Clones.clone(implementation);
    if (proxy == address(0)) revert Errors.ProxyCreationFailed();
    (bool success, ) = proxy.call(initParams);
    if (!success) revert Errors.InitializationFailed();
    return proxy;
  }

  function _upgradeTokenImplementation(address proxyAddress, address implementation, bytes memory initParams) internal {
    (bool success, ) = proxyAddress.call(abi.encodeWithSignature('upgradeToAndCall(address,bytes)', implementation, initParams));
    if (!success) revert Errors.UpgradeFailed();
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


