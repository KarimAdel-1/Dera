// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IPool} from "../interfaces/IPool.sol";
import {IInitializableDeraSupplyToken} from "../interfaces/IInitializableDeraSupplyToken.sol";
import {IInitializableDeraBorrowToken} from "../interfaces/IInitializableDeraBorrowToken.sol";
import {DataTypes} from "../protocol/libraries/types/DataTypes.sol";
import {AssetConfiguration} from "../protocol/libraries/configuration/AssetConfiguration.sol";

interface IPoolExt is IPool {
  function RESERVE_INTEREST_RATE_STRATEGY() external view returns (address);
}

contract ConfiguratorDebugger {
  using AssetConfiguration for DataTypes.AssetConfigurationMap;

  event Step(string step, address addr, bytes data);
  event BoolStep(string step, bool ok, bytes data);

  // Auxiliary helpers for stepwise debugging
  function cloneSupplyImpl(address supplyImpl) external returns (address) {
    address dToken = Clones.clone(supplyImpl);
    emit Step('clonedSupply', dToken, abi.encodePacked(supplyImpl));
    return dToken;
  }

  function initSupplyProxy(address proxy, address poolAddr, address underlying, uint8 decimals, bytes calldata params) external {
    bytes memory initSupply = abi.encodeWithSelector(
      IInitializableDeraSupplyToken.initialize.selector,
      IPool(poolAddr),
      underlying,
      decimals,
      string(abi.encodePacked('dToken')),
      string(abi.encodePacked('d')),
      params
    );
    (bool sOk, bytes memory sRet) = proxy.call(initSupply);
    emit BoolStep('initSupply', sOk, sRet);
    require(sOk, 'initSupply failed');
  }

  function cloneBorrowImpl(address borrowImpl) external returns (address) {
    address vToken = Clones.clone(borrowImpl);
    emit Step('clonedBorrow', vToken, abi.encodePacked(borrowImpl));
    return vToken;
  }

  function initBorrowProxy(address proxy, address poolAddr, address underlying, uint8 decimals, bytes calldata params) external {
    bytes memory initBorrow = abi.encodeWithSelector(
      IInitializableDeraBorrowToken.initialize.selector,
      IPool(poolAddr),
      underlying,
      decimals,
      string(abi.encodePacked('vToken')),
      string(abi.encodePacked('v')),
      params
    );
    (bool bOk, bytes memory bRet) = proxy.call(initBorrow);
    emit BoolStep('initBorrow', bOk, bRet);
    require(bOk, 'initBorrow failed');
  }

  function callPoolInitAsset(address poolAddr, address underlying, address dToken, address vToken) external {
    IPool pool = IPool(poolAddr);
    try pool.initAsset(underlying, dToken, vToken) {
      emit Step('pool.initAsset', poolAddr, abi.encodePacked(underlying, dToken, vToken));
    } catch (bytes memory err) {
      emit Step('pool.initAsset_failed', poolAddr, err);
      revert('pool.initAsset failed');
    }
  }

  function callPoolSetConfiguration(address poolAddr, address underlying, uint8 decimals) external {
    IPool pool = IPool(poolAddr);
    DataTypes.AssetConfigurationMap memory config;
    config.data = 0;
    AssetConfiguration.setDecimals(config, decimals);
    AssetConfiguration.setActive(config, true);
    AssetConfiguration.setPaused(config, false);
    AssetConfiguration.setFrozen(config, false);
    try pool.setConfiguration(underlying, config) {
      emit Step('pool.setConfiguration', poolAddr, abi.encodePacked(underlying));
    } catch (bytes memory err2) {
      emit Step('pool.setConfiguration_failed', poolAddr, err2);
      revert('pool.setConfiguration failed');
    }
  }

  function debugInitAsset(
    address poolAddr,
    address supplyImpl,
    address borrowImpl,
    address underlying,
    uint8 decimals,
    bytes calldata params
  ) external {
    IPoolExt pool = IPoolExt(poolAddr);
    address strategy = pool.RESERVE_INTEREST_RATE_STRATEGY();

    // 1) Clone supply token impl and initialize within a narrow scope to avoid stack overflow
    address dToken;
    {
      dToken = Clones.clone(supplyImpl);
      emit Step('clonedSupply', dToken, abi.encodePacked(supplyImpl));

      bytes memory initSupply = abi.encodeWithSelector(
        IInitializableDeraSupplyToken.initialize.selector,
        pool,
        underlying,
        decimals,
        string(abi.encodePacked('dToken')),
        string(abi.encodePacked('d')),
        params
      );
      (bool sOk, bytes memory sRet) = dToken.call(initSupply);
      emit BoolStep('initSupply', sOk, sRet);
      require(sOk, 'initSupply failed');
    }

    // 2) Clone borrow token impl and initialize in its own scope
    address vToken;
    {
      vToken = Clones.clone(borrowImpl);
      emit Step('clonedBorrow', vToken, abi.encodePacked(borrowImpl));

      bytes memory initBorrow = abi.encodeWithSelector(
        IInitializableDeraBorrowToken.initialize.selector,
        pool,
        underlying,
        decimals,
        string(abi.encodePacked('vToken')),
        string(abi.encodePacked('v')),
        params
      );
      (bool bOk, bytes memory bRet) = vToken.call(initBorrow);
      emit BoolStep('initBorrow', bOk, bRet);
      require(bOk, 'initBorrow failed');
    }

    // 5) Call pool.initAsset
    try pool.initAsset(underlying, dToken, vToken) {
      emit Step('pool.initAsset', poolAddr, abi.encodePacked(underlying, dToken, vToken));
    } catch (bytes memory err) {
      emit Step('pool.initAsset_failed', poolAddr, err);
      revert('pool.initAsset failed');
    }

    // 6) Build configuration and call setConfiguration
  DataTypes.AssetConfigurationMap memory config;
  config.data = 0;
  AssetConfiguration.setDecimals(config, decimals);
  AssetConfiguration.setActive(config, true);
  AssetConfiguration.setPaused(config, false);
  AssetConfiguration.setFrozen(config, false);

    try pool.setConfiguration(underlying, config) {
      emit Step('pool.setConfiguration', poolAddr, abi.encodePacked(underlying));
    } catch (bytes memory err2) {
      emit Step('pool.setConfiguration_failed', poolAddr, err2);
      revert('pool.setConfiguration failed');
    }
  }
}
