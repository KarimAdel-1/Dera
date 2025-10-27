// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IDToken} from '../../../interfaces/IDToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {IsolationModeLogic} from './IsolationModeLogic.sol';

/**
 * @title BorrowLogic library
 * @author Dera Protocol
 * @notice Implements the base logic for all the actions related to borrowing
 */
library BorrowLogic {
  using TokenMath for uint256;
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  function executeBorrow(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteBorrowParams memory params
  ) external {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    uint256 amountScaled = params.amount.getVariableDebtTokenMintScaledAmount(reserveCache.nextVariableBorrowIndex);

    ValidationLogic.validateBorrow(
      reservesData,
      reservesList,
      eModeCategories,
      DataTypes.ValidateBorrowParams({
        reserveCache: reserveCache,
        userConfig: userConfig,
        asset: params.asset,
        userAddress: params.onBehalfOf,
        amountScaled: amountScaled,
        interestRateMode: params.interestRateMode,
        oracle: params.oracle,
        userEModeCategory: params.userEModeCategory,
        priceOracleSentinel: params.priceOracleSentinel
      })
    );

    reserveCache.nextScaledVariableDebt = IVariableDebtToken(reserveCache.variableDebtTokenAddress).mint(
      params.user,
      params.onBehalfOf,
      params.amount,
      amountScaled,
      reserveCache.nextVariableBorrowIndex
    );

    uint16 cachedReserveId = reserve.id;
    if (!userConfig.isBorrowing(cachedReserveId)) {
      userConfig.setBorrowing(cachedReserveId, true);
    }

    IsolationModeLogic.increaseIsolatedDebtIfIsolated(
      reservesData,
      reservesList,
      userConfig,
      reserveCache,
      params.amount
    );

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      0,
      params.releaseUnderlying ? params.amount : 0,
      params.interestRateStrategyAddress
    );

    if (params.releaseUnderlying) {
      IDToken(reserveCache.dTokenAddress).transferUnderlyingTo(params.user, params.amount);
    }

    ValidationLogic.validateHFAndLtv(
      reservesData,
      reservesList,
      eModeCategories,
      userConfig,
      params.onBehalfOf,
      params.userEModeCategory,
      params.oracle
    );

    emit IPool.Borrow(
      params.asset,
      params.user,
      params.onBehalfOf,
      params.amount,
      DataTypes.InterestRateMode.VARIABLE,
      reserve.currentVariableBorrowRate,
      params.referralCode
    );
  }

  function executeRepay(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage onBehalfOfConfig,
    DataTypes.ExecuteRepayParams memory params
  ) external returns (uint256) {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);

    uint256 userDebtScaled = IVariableDebtToken(reserveCache.variableDebtTokenAddress).scaledBalanceOf(params.onBehalfOf);
    uint256 userDebt = userDebtScaled.getVariableDebtTokenBalance(reserveCache.nextVariableBorrowIndex);

    ValidationLogic.validateRepay(params.user, reserveCache, params.amount, params.interestRateMode, params.onBehalfOf, userDebtScaled);

    uint256 paybackAmount = params.amount;
    if (params.useDTokens && params.amount == type(uint256).max) {
      paybackAmount = IDToken(reserveCache.dTokenAddress).scaledBalanceOf(params.user).getDTokenBalance(reserveCache.nextLiquidityIndex);
    }

    if (paybackAmount > userDebt) {
      paybackAmount = userDebt;
    }

    bool noMoreDebt;
    (noMoreDebt, reserveCache.nextScaledVariableDebt) = IVariableDebtToken(reserveCache.variableDebtTokenAddress).burn({
      from: params.onBehalfOf,
      scaledAmount: paybackAmount.getVariableDebtTokenBurnScaledAmount(reserveCache.nextVariableBorrowIndex),
      index: reserveCache.nextVariableBorrowIndex
    });

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      params.useDTokens ? 0 : paybackAmount,
      0,
      params.interestRateStrategyAddress
    );

    if (noMoreDebt) {
      onBehalfOfConfig.setBorrowing(reserve.id, false);
    }

    IsolationModeLogic.reduceIsolatedDebtIfIsolated(
      reservesData,
      reservesList,
      onBehalfOfConfig,
      reserveCache,
      paybackAmount
    );

    if (params.useDTokens) {
      bool zeroBalanceAfterBurn = IDToken(reserveCache.dTokenAddress).burn({
        from: params.user,
        receiverOfUnderlying: reserveCache.dTokenAddress,
        amount: paybackAmount,
        scaledAmount: paybackAmount.getDTokenBurnScaledAmount(reserveCache.nextLiquidityIndex),
        index: reserveCache.nextLiquidityIndex
      });
      if (onBehalfOfConfig.isUsingAsCollateral(reserve.id)) {
        if (zeroBalanceAfterBurn) {
          onBehalfOfConfig.setUsingAsCollateral(reserve.id, params.asset, params.user, false);
        }
        if (onBehalfOfConfig.isBorrowingAny()) {
          ValidationLogic.validateHealthFactor(
            reservesData,
            reservesList,
            eModeCategories,
            onBehalfOfConfig,
            params.user,
            params.userEModeCategory,
            params.oracle
          );
        }
      }
    }

    emit IPool.Repay(params.asset, params.onBehalfOf, params.user, paybackAmount, params.useDTokens);

    return paybackAmount;
  }
}
