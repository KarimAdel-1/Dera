// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDToken} from '../../../interfaces/IDToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {Errors} from '../helpers/Errors.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {TokenMath} from '../helpers/TokenMath.sol';

/**
 * @title SupplyLogic library
 * @author Dera Protocol
 * @notice Implements the base logic for supply/withdraw
 */
library SupplyLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using TokenMath for uint256;
  using PercentageMath for uint256;

  function executeSupply(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteSupplyParams memory params
  ) external {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);
    uint256 scaledAmount = params.amount.getDTokenMintScaledAmount(reserveCache.nextLiquidityIndex);

    ValidationLogic.validateSupply(reserveCache, reserve, scaledAmount, params.onBehalfOf);

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      params.amount,
      0,
      params.interestRateStrategyAddress
    );

    bool isFirstSupply = IDToken(reserveCache.dTokenAddress).mint(
      params.user,
      params.onBehalfOf,
      scaledAmount,
      reserveCache.nextLiquidityIndex
    );

    if (isFirstSupply) {
      if (
        ValidationLogic.validateAutomaticUseAsCollateral(
          params.user,
          reservesData,
          reservesList,
          userConfig,
          reserveCache.reserveConfiguration,
          reserveCache.dTokenAddress
        )
      ) {
        userConfig.setUsingAsCollateral(reserve.id, params.asset, params.onBehalfOf, true);
      }
    }

    emit IPool.Supply(params.asset, params.user, params.onBehalfOf, params.amount, params.referralCode);
  }

  function executeWithdraw(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteWithdrawParams memory params
  ) external returns (uint256) {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    require(params.to != reserveCache.dTokenAddress, Errors.WithdrawToDToken());

    reserve.updateState(reserveCache);

    uint256 scaledUserBalance = IDToken(reserveCache.dTokenAddress).scaledBalanceOf(params.user);

    uint256 amountToWithdraw;
    uint256 scaledAmountToWithdraw;
    if (params.amount == type(uint256).max) {
      scaledAmountToWithdraw = scaledUserBalance;
      amountToWithdraw = scaledUserBalance.getDTokenBalance(reserveCache.nextLiquidityIndex);
    } else {
      scaledAmountToWithdraw = params.amount.getDTokenBurnScaledAmount(reserveCache.nextLiquidityIndex);
      amountToWithdraw = params.amount;
    }

    ValidationLogic.validateWithdraw(reserveCache, scaledAmountToWithdraw, scaledUserBalance);

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      0,
      amountToWithdraw,
      params.interestRateStrategyAddress
    );

    bool zeroBalanceAfterBurn = IDToken(reserveCache.dTokenAddress).burn({
      from: params.user,
      receiverOfUnderlying: params.to,
      amount: amountToWithdraw,
      scaledAmount: scaledAmountToWithdraw,
      index: reserveCache.nextLiquidityIndex
    });

    if (userConfig.isUsingAsCollateral(reserve.id)) {
      if (zeroBalanceAfterBurn) {
        userConfig.setUsingAsCollateral(reserve.id, params.asset, params.user, false);
      }
      if (userConfig.isBorrowingAny()) {
        ValidationLogic.validateHFAndLtvzero(
          reservesData,
          reservesList,
          eModeCategories,
          userConfig,
          params.asset,
          params.user,
          params.oracle,
          params.userEModeCategory
        );
      }
    }

    emit IPool.Withdraw(params.asset, params.user, params.to, amountToWithdraw);

    return amountToWithdraw;
  }

  function executeFinalizeTransfer(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    DataTypes.FinalizeTransferParams memory params
  ) external {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];

    ValidationLogic.validateTransfer(reserve);

    uint256 reserveId = reserve.id;

    if (params.from != params.to && params.scaledAmount != 0) {
      DataTypes.UserConfigurationMap storage fromConfig = usersConfig[params.from];

      if (fromConfig.isUsingAsCollateral(reserveId)) {
        if (params.scaledBalanceFromBefore == params.scaledAmount) {
          fromConfig.setUsingAsCollateral(reserveId, params.asset, params.from, false);
        }
        if (fromConfig.isBorrowingAny()) {
          ValidationLogic.validateHFAndLtvzero(
            reservesData,
            reservesList,
            eModeCategories,
            usersConfig[params.from],
            params.asset,
            params.from,
            params.oracle,
            params.fromEModeCategory
          );
        }
      }

      if (params.scaledBalanceToBefore == 0) {
        DataTypes.UserConfigurationMap storage toConfig = usersConfig[params.to];
        if (
          ValidationLogic.validateAutomaticUseAsCollateral(
            params.from,
            reservesData,
            reservesList,
            toConfig,
            reserve.configuration,
            reserve.dTokenAddress
          )
        ) {
          toConfig.setUsingAsCollateral(reserveId, params.asset, params.to, true);
        }
      }
    }
  }

  function executeUseReserveAsCollateral(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    address user,
    address asset,
    bool useAsCollateral,
    address priceOracle,
    uint8 userEModeCategory
  ) external {
    DataTypes.ReserveData storage reserve = reservesData[asset];
    DataTypes.ReserveConfigurationMap memory reserveConfigCached = reserve.configuration;

    ValidationLogic.validateSetUseReserveAsCollateral(reserveConfigCached);

    if (useAsCollateral == userConfig.isUsingAsCollateral(reserve.id)) return;

    if (useAsCollateral) {
      require(IDToken(reserve.dTokenAddress).scaledBalanceOf(user) != 0, Errors.UnderlyingBalanceZero());
      require(
        ValidationLogic.validateUseAsCollateral(reservesData, reservesList, userConfig, reserveConfigCached),
        Errors.UserInIsolationModeOrLtvZero()
      );
      userConfig.setUsingAsCollateral(reserve.id, asset, user, true);
    } else {
      userConfig.setUsingAsCollateral(reserve.id, asset, user, false);
      ValidationLogic.validateHFAndLtvzero(
        reservesData,
        reservesList,
        eModeCategories,
        userConfig,
        asset,
        user,
        priceOracle,
        userEModeCategory
      );
    }
  }
}
