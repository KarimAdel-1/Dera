// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../../../interfaces/IERC20.sol';
import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IDeraBorrowToken} from '../../../interfaces/IDeraBorrowToken.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title GenericLogic library
 * @author Dera Protocol
 * @notice User account calculations (collateral, debt, health factor) on Hedera
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: User balances read from DToken and VariableDebtToken contracts
 * - Mirror Nodes: Off-chain services can query user account data via Mirror Node API
 * 
 * INTEGRATION:
 * - Account Data: Calculates total collateral, debt, LTV, liquidation threshold, health factor
 * - Health Factor: HF = (Collateral × Liquidation Threshold) / Total Debt
 * - Safe: HF > 1.0, Liquidatable: HF < 1.0
 *
 * CALCULATIONS:
 * - Collateral: Sum of (DToken balance × asset price) for all collateral assets
 * - Debt: Sum of (VariableDebtToken balance × asset price) for all borrowed assets
 * - Available Borrow: (Collateral × LTV) - Total Debt
 *
 * MVP SIMPLIFICATION:
 * - Removed E-Mode calculations for simpler, more auditable code
 * - Standard LTV/liquidation thresholds for all assets
 */
library GenericLogic {
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  struct CalculateUserAccountDataVars {
    uint256 assetPrice;
    uint256 assetUnit;
    uint256 userBalanceInBaseCurrency;
    uint256 decimals;
    uint256 ltv;
    uint256 liquidationThreshold;
    uint256 i;
    uint256 healthFactor;
    uint256 totalCollateralInBaseCurrency;
    uint256 totalDebtInBaseCurrency;
    uint256 avgLtv;
    uint256 avgLiquidationThreshold;
    address currentReserveAddress;
    bool hasZeroLtvCollateral;
  }

  function calculateUserAccountData(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.CalculateUserAccountDataParams memory params
  ) internal view returns (uint256, uint256, uint256, uint256, uint256, bool) {
    if (params.userConfig.isEmpty()) {
      return (0, 0, 0, 0, type(uint256).max, false);
    }

    CalculateUserAccountDataVars memory vars;

    while (vars.i < 128) {
      if (!params.userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      vars.currentReserveAddress = assetsList[vars.i];

      if (vars.currentReserveAddress == address(0)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      DataTypes.PoolAssetData storage currentReserve = poolAssets[vars.currentReserveAddress];
      (vars.ltv, vars.liquidationThreshold, , vars.decimals, ) = currentReserve.configuration.getParams();

      unchecked {
        vars.assetUnit = 10 ** vars.decimals;
      }

      vars.assetPrice = IPriceOracleGetter(params.oracle).getAssetPrice(vars.currentReserveAddress);

      if (vars.liquidationThreshold != 0 && params.userConfig.isUsingAsCollateral(vars.i)) {
        vars.userBalanceInBaseCurrency = _getUserBalanceInBaseCurrency(
          params.user,
          currentReserve,
          vars.assetPrice,
          vars.assetUnit
        );

        vars.totalCollateralInBaseCurrency += vars.userBalanceInBaseCurrency;

        // Use standard LTV and liquidation threshold for all assets (E-Mode removed)
        vars.avgLtv += vars.userBalanceInBaseCurrency * vars.ltv;
        vars.avgLiquidationThreshold += vars.userBalanceInBaseCurrency * vars.liquidationThreshold;

        if (vars.ltv == 0) {
          vars.hasZeroLtvCollateral = true;
        }
      }

      if (params.userConfig.isBorrowing(vars.i)) {
        vars.totalDebtInBaseCurrency += _getUserDebtInBaseCurrency(
          params.user,
          currentReserve,
          vars.assetPrice,
          vars.assetUnit
        );
      }

      unchecked {
        ++vars.i;
      }
    }

    unchecked {
      vars.avgLtv = vars.totalCollateralInBaseCurrency != 0
        ? vars.avgLtv / vars.totalCollateralInBaseCurrency
        : 0;
      vars.avgLiquidationThreshold = vars.totalCollateralInBaseCurrency != 0
        ? vars.avgLiquidationThreshold / vars.totalCollateralInBaseCurrency
        : 0;
    }

    vars.healthFactor = (vars.totalDebtInBaseCurrency == 0)
      ? type(uint256).max
      : (vars.totalCollateralInBaseCurrency.percentMul(vars.avgLiquidationThreshold)).wadDiv(
          vars.totalDebtInBaseCurrency
        );

    return (
      vars.totalCollateralInBaseCurrency,
      vars.totalDebtInBaseCurrency,
      vars.avgLtv,
      vars.avgLiquidationThreshold,
      vars.healthFactor,
      vars.hasZeroLtvCollateral
    );
  }

  function calculateAvailableBorrows(
    uint256 totalCollateralInBaseCurrency,
    uint256 totalDebtInBaseCurrency,
    uint256 ltv
  ) internal pure returns (uint256) {
    uint256 availableBorrowsInBaseCurrency = totalCollateralInBaseCurrency.percentMul(ltv);

    if (availableBorrowsInBaseCurrency < totalDebtInBaseCurrency) {
      return 0;
    }

    availableBorrowsInBaseCurrency = availableBorrowsInBaseCurrency - totalDebtInBaseCurrency;
    return availableBorrowsInBaseCurrency;
  }

  function _getUserBalanceInBaseCurrency(
    address user,
    DataTypes.PoolAssetData storage asset,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    uint256 normalizedIncome = reserve.getNormalizedIncome();
    uint256 balance = (IERC20(reserve.supplyTokenAddress).balanceOf(user).rayMul(normalizedIncome)) *
      assetPrice;
    unchecked {
      return balance / assetUnit;
    }
  }

  function _getUserDebtInBaseCurrency(
    address user,
    DataTypes.PoolAssetData storage asset,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    uint256 normalizedDebt = reserve.getNormalizedDebt();
    uint256 balance = (IERC20(reserve.borrowTokenAddress).balanceOf(user).rayMul(normalizedDebt)) *
      assetPrice;
    unchecked {
      return balance / assetUnit;
    }
  }
}
