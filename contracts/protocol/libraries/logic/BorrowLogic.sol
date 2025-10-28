// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDeraBorrowToken} from '../../../interfaces/IDeraBorrowToken.sol';
import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {ReserveLogic} from './ReserveLogic.sol';

// HTS precompile interface for native Hedera token operations
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

/**
 * @title BorrowLogic library
 * @author Dera Protocol
 * @notice Implements the base logic for all the actions related to borrowing using HTS
 */
library BorrowLogic {
  using TokenMath for uint256;
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile address

  // Custom errors for HTS operations
  error HTSTransferFailed(int64 responseCode);
  error AmountExceedsInt64();

  function executeBorrow(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
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
      DataTypes.ValidateBorrowParams({
        reserveCache: reserveCache,
        userConfig: userConfig,
        asset: params.asset,
        userAddress: params.onBehalfOf,
        amountScaled: amountScaled,
        interestRateMode: params.interestRateMode,
        oracle: params.oracle,
        priceOracleSentinel: params.priceOracleSentinel
      })
    );

    reserveCache.nextScaledVariableDebt = IDeraBorrowToken(reserveCache.borrowTokenAddress).mint(
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

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      0,
      params.releaseUnderlying ? params.amount : 0,
      params.interestRateStrategyAddress
    );

    if (params.releaseUnderlying) {
      IDeraSupplyToken(reserveCache.supplyTokenAddress).transferUnderlyingTo(params.user, params.amount);
    }

    ValidationLogic.validateHFAndLtv(
      reservesData,
      reservesList,
      userConfig,
      params.onBehalfOf,
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
    DataTypes.UserConfigurationMap storage onBehalfOfConfig,
    DataTypes.ExecuteRepayParams memory params
  ) external returns (uint256) {
    DataTypes.ReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);

    uint256 userDebtScaled = IDeraBorrowToken(reserveCache.borrowTokenAddress).scaledBalanceOf(params.onBehalfOf);
    uint256 userDebt = userDebtScaled.getVariableDebtTokenBalance(reserveCache.nextVariableBorrowIndex);

    ValidationLogic.validateRepay(params.user, reserveCache, params.amount, params.interestRateMode, params.onBehalfOf, userDebtScaled);

    uint256 paybackAmount = params.amount;
    if (params.useSupplyTokens && params.amount == type(uint256).max) {
      paybackAmount = IDeraSupplyToken(reserveCache.supplyTokenAddress).scaledBalanceOf(params.user).getDTokenBalance(reserveCache.nextLiquidityIndex);
    }

    if (paybackAmount > userDebt) {
      paybackAmount = userDebt;
    }

    // Transfer tokens from repayer to dToken contract via HTS (if not using dTokens)
    // CRITICAL: User must be associated with the HTS token before this call
    if (!params.useSupplyTokens) {
      _safeHTSTransferFrom(params.asset, params.user, reserveCache.supplyTokenAddress, paybackAmount);
    }

    bool noMoreDebt;
    (noMoreDebt, reserveCache.nextScaledVariableDebt) = IDeraBorrowToken(reserveCache.borrowTokenAddress).burn({
      from: params.onBehalfOf,
      scaledAmount: paybackAmount.getVariableDebtTokenBurnScaledAmount(reserveCache.nextVariableBorrowIndex),
      index: reserveCache.nextVariableBorrowIndex
    });

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      params.useSupplyTokens ? 0 : paybackAmount,
      0,
      params.interestRateStrategyAddress
    );

    if (noMoreDebt) {
      onBehalfOfConfig.setBorrowing(reserve.id, false);
    }

    if (params.useSupplyTokens) {
      bool zeroBalanceAfterBurn = IDeraSupplyToken(reserveCache.supplyTokenAddress).burn({
        from: params.user,
        receiverOfUnderlying: reserveCache.supplyTokenAddress,
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
            onBehalfOfConfig,
            params.user,
            params.oracle
          );
        }
      }
    }

    emit IPool.Repay(params.asset, params.onBehalfOf, params.user, paybackAmount, params.useSupplyTokens);

    return paybackAmount;
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
    if (amount > uint256(type(int64).max)) revert AmountExceedsInt64();

    int64 responseCode = HTS.transferToken(token, from, to, int64(uint64(amount)));

    if (responseCode != 0) revert HTSTransferFailed(responseCode);
  }
}
