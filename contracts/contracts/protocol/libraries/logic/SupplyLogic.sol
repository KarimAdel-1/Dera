// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {Errors} from '../helpers/Errors.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {AssetLogic} from './AssetLogic.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {TokenMath} from '../helpers/TokenMath.sol';

// HTS precompile interface for native Hedera token operations
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

/**
 * @title SupplyLogic library
 * @author Dera Protocol
 * @notice Implements the base logic for supply/withdraw using HTS (Hedera Token Service)
 */
library SupplyLogic {
  using AssetLogic for DataTypes.AssetState;
  using AssetLogic for DataTypes.PoolAssetData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using TokenMath for uint256;
  using PercentageMath for uint256;

  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile address

  // Custom errors for HTS operations
  error HTSTransferFailed(int64 responseCode);
  error AmountExceedsInt64();
  error HBARTransferFailed();

  function executeSupply(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteSupplyParams memory params
  ) external {
    DataTypes.PoolAssetData storage asset = poolAssets[params.asset];
    DataTypes.AssetState memory assetState = asset.cache();

    asset.updateState(assetState);
    uint256 scaledAmount = params.amount.getSupplyTokenMintScaledAmount(assetState.nextLiquidityIndex);

    ValidationLogic.validateSupply(assetState, asset, scaledAmount, params.onBehalfOf);

    // Transfer underlying asset from user to dToken contract via HTS.
    // For native HBAR (asset == address(0)) the funds are sent via msg.value to the Pool
    if (params.asset != address(0)) {
      // CRITICAL: User must be associated with the HTS token before this call
      _safeHTSTransferFrom(params.asset, params.user, assetState.supplyTokenAddress, params.amount);
    } else {
      // For HBAR, forward the received msg.value to the dToken contract
      (bool success, ) = payable(assetState.supplyTokenAddress).call{value: params.amount}("");
      if (!success) revert("HBAR transfer to dToken failed");
    }

    asset.updateInterestRatesAndVirtualBalance(
      assetState,
      params.asset,
      params.amount,
      0,
      params.interestRateStrategyAddress
    );

    bool isFirstSupply = IDeraSupplyToken(assetState.supplyTokenAddress).mint(
      params.user,
      params.onBehalfOf,
      scaledAmount,
      assetState.nextLiquidityIndex
    );

    if (isFirstSupply) {
      if (
        ValidationLogic.validateAutomaticUseAsCollateral(
          params.user,
          poolAssets,
          assetsList,
          userConfig,
          assetState.assetConfiguration,
          assetState.supplyTokenAddress
        )
      ) {
        userConfig.setUsingAsCollateral(asset.id, params.asset, params.onBehalfOf, true);
      }
    }

    // Event will be emitted by Pool contract
  }

  function executeWithdraw(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteWithdrawParams memory params
  ) external returns (uint256) {
    DataTypes.PoolAssetData storage asset = poolAssets[params.asset];
    DataTypes.AssetState memory assetState = asset.cache();

    if (params.to == assetState.supplyTokenAddress) revert Errors.WithdrawToSupplyToken();

    asset.updateState(assetState);

    uint256 scaledUserBalance = IDeraSupplyToken(assetState.supplyTokenAddress).scaledBalanceOf(params.user);

    uint256 amountToWithdraw;
    uint256 scaledAmountToWithdraw;
    if (params.amount == type(uint256).max) {
      scaledAmountToWithdraw = scaledUserBalance;
      amountToWithdraw = scaledUserBalance.getSupplyTokenBalance(assetState.nextLiquidityIndex);
    } else {
      scaledAmountToWithdraw = params.amount.getSupplyTokenBurnScaledAmount(assetState.nextLiquidityIndex);
      amountToWithdraw = params.amount;
    }

    ValidationLogic.validateWithdraw(assetState, scaledAmountToWithdraw, scaledUserBalance);

    asset.updateInterestRatesAndVirtualBalance(
      assetState,
      params.asset,
      0,
      amountToWithdraw,
      params.interestRateStrategyAddress
    );

    bool zeroBalanceAfterBurn = IDeraSupplyToken(assetState.supplyTokenAddress).burn({
      from: params.user,
      receiverOfUnderlying: params.to,
      amount: amountToWithdraw,
      scaledAmount: scaledAmountToWithdraw,
      index: assetState.nextLiquidityIndex
    });

    if (userConfig.isUsingAsCollateral(asset.id)) {
      if (zeroBalanceAfterBurn) {
        userConfig.setUsingAsCollateral(asset.id, params.asset, params.user, false);
      }
      if (userConfig.isBorrowingAny()) {
        ValidationLogic.validateHFAndLtvzero(
          poolAssets,
          assetsList,
          userConfig,
          params.asset,
          params.user,
          params.oracle
        );
      }
    }

    // Event will be emitted by Pool contract

    return amountToWithdraw;
  }

  function executeFinalizeTransfer(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    DataTypes.FinalizeTransferParams memory params
  ) external {
    DataTypes.PoolAssetData storage asset = poolAssets[params.asset];

    ValidationLogic.validateTransfer(asset);

    uint256 reserveId = asset.id;

    if (params.from != params.to && params.scaledAmount != 0) {
      DataTypes.UserConfigurationMap storage fromConfig = usersConfig[params.from];

      if (fromConfig.isUsingAsCollateral(reserveId)) {
        if (params.scaledBalanceFromBefore == params.scaledAmount) {
          fromConfig.setUsingAsCollateral(reserveId, params.asset, params.from, false);
        }
        if (fromConfig.isBorrowingAny()) {
          ValidationLogic.validateHFAndLtvzero(
            poolAssets,
            assetsList,
            usersConfig[params.from],
            params.asset,
            params.from,
            params.oracle
          );
        }
      }

      if (params.scaledBalanceToBefore == 0) {
        DataTypes.UserConfigurationMap storage toConfig = usersConfig[params.to];
        if (
          ValidationLogic.validateAutomaticUseAsCollateral(
            params.from,
            poolAssets,
            assetsList,
            toConfig,
            asset.configuration,
            asset.supplyTokenAddress
          )
        ) {
          toConfig.setUsingAsCollateral(reserveId, params.asset, params.to, true);
        }
      }
    }
  }

  function executeUseAssetAsCollateral(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    
    DataTypes.UserConfigurationMap storage userConfig,
    address user,
    address asset,
    bool useAsCollateral,
    address priceOracle
  ) external {
    DataTypes.PoolAssetData storage assetData = poolAssets[asset];
    DataTypes.AssetConfigurationMap memory reserveConfigCached = assetData.configuration;

    ValidationLogic.validateSetUseAssetAsCollateral(reserveConfigCached);

    if (useAsCollateral == userConfig.isUsingAsCollateral(assetData.id)) return;

    if (useAsCollateral) {
      if (IDeraSupplyToken(assetData.supplyTokenAddress).scaledBalanceOf(user) == 0) revert Errors.UnderlyingBalanceZero();
      if (!ValidationLogic.validateUseAsCollateral(poolAssets, assetsList, userConfig, reserveConfigCached)) revert Errors.LtvValidationFailed();
      userConfig.setUsingAsCollateral(assetData.id, asset, user, true);
    } else {
      userConfig.setUsingAsCollateral(assetData.id, asset, user, false);
      ValidationLogic.validateHFAndLtvzero(
        poolAssets,
        assetsList,
        userConfig,
        asset,
        user,
        priceOracle
      );
    }
  }

  // ============ Internal HTS Helper Functions ============

  /**
   * @notice Safe HTS token transfer from sender to recipient
   * @dev Uses Hedera Token Service precompile at 0x167
   * @param token HTS token address
   * @param from Sender address (must have approved the Pool contract via HTS)
   * @param to Recipient address (must be associated with the token)
   * @param amount Amount to transfer
   */
  function _safeHTSTransferFrom(address token, address from, address to, uint256 amount) internal {
    if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64();

    int64 responseCode = HTS.transferToken(token, from, to, int64(uint64(amount)));

    if (responseCode != 0) revert HTSTransferFailed(responseCode);
  }
}
