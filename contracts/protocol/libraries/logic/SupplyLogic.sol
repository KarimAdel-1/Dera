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
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.ReserveData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using TokenMath for uint256;
  using PercentageMath for uint256;

  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile address

  // Custom errors for HTS operations
  error HTSTransferFailed(int64 responseCode);
  error AmountExceedsInt64();

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

    // Transfer underlying asset from user to dToken contract via HTS
    // CRITICAL: User must be associated with the HTS token before this call
    _safeHTSTransferFrom(params.asset, params.user, reserveCache.dTokenAddress, params.amount);

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
          
          userConfig,
          params.asset,
          params.user,
          params.oracle,
          
        );
      }
    }

    emit IPool.Withdraw(params.asset, params.user, params.to, amountToWithdraw);

    return amountToWithdraw;
  }

  function executeFinalizeTransfer(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    
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
            
            usersConfig[params.from],
            params.asset,
            params.from,
            params.oracle,
            
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
    
    DataTypes.UserConfigurationMap storage userConfig,
    address user,
    address asset,
    bool useAsCollateral,
    address priceOracle,
    uint8 
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
        
        userConfig,
        asset,
        user,
        priceOracle,
        
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
    if (amount > uint256(type(int64).max)) revert AmountExceedsInt64();

    int64 responseCode = HTS.transferToken(token, from, to, int64(uint64(amount)));

    if (responseCode != 0) revert HTSTransferFailed(responseCode);
  }
}
