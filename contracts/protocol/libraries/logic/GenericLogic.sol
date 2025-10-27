// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from '../../../interfaces/IERC20.sol';
import {IDToken} from '../../../interfaces/IDToken.sol';
import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {EModeConfiguration} from '../configuration/EModeConfiguration.sol';
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
 * - E-Mode: Enhanced calculations for efficiency mode (higher LTV for correlated assets)
 * - Health Factor: HF = (Collateral × Liquidation Threshold) / Total Debt
 * - Safe: HF > 1.0, Liquidatable: HF < 1.0
 * 
 * CALCULATIONS:
 * - Collateral: Sum of (DToken balance × asset price) for all collateral assets
 * - Debt: Sum of (VariableDebtToken balance × asset price) for all borrowed assets
 * - Available Borrow: (Collateral × LTV) - Total Debt
 */
library GenericLogic {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
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
    uint256 eModeAssetPrice;
    uint256 eModeLtv;
    uint256 eModeLiqThreshold;
    uint256 eModeAssetCategory;
    address currentReserveAddress;
    bool hasZeroLtvCollateral;
    bool isInEModeCategory;
  }

  function calculateUserAccountData(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.CalculateUserAccountDataParams memory params
  ) internal view returns (uint256, uint256, uint256, uint256, uint256, bool) {
    if (params.userConfig.isEmpty()) {
      return (0, 0, 0, 0, type(uint256).max, false);
    }

    CalculateUserAccountDataVars memory vars;

    if (params.userEModeCategory != 0) {
      (vars.eModeLtv, vars.eModeLiqThreshold, vars.eModeAssetPrice) = EModeConfiguration.getEModeConfiguration(
        eModeCategories[params.userEModeCategory],
        IPriceOracleGetter(params.oracle)
      );
    }

    while (vars.i < 128) {
      if (!params.userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      vars.currentReserveAddress = reservesList[vars.i];

      if (vars.currentReserveAddress == address(0)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      DataTypes.ReserveData storage currentReserve = reservesData[vars.currentReserveAddress];
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

        vars.isInEModeCategory = EModeConfiguration.isReserveEnabledOnBitmap(
          eModeCategories[params.userEModeCategory].collateralBitmap,
          vars.i
        );

        if (params.userEModeCategory != 0 && vars.isInEModeCategory) {
          vars.avgLtv += vars.userBalanceInBaseCurrency * vars.eModeLtv;
          vars.avgLiquidationThreshold += vars.userBalanceInBaseCurrency * vars.eModeLiqThreshold;
        } else {
          vars.avgLtv += vars.userBalanceInBaseCurrency * vars.ltv;
          vars.avgLiquidationThreshold += vars.userBalanceInBaseCurrency * vars.liquidationThreshold;
        }

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
    DataTypes.ReserveData storage reserve,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    uint256 normalizedIncome = reserve.getNormalizedIncome();
    uint256 balance = (IERC20(reserve.dTokenAddress).balanceOf(user).rayMul(normalizedIncome)) *
      assetPrice;
    unchecked {
      return balance / assetUnit;
    }
  }

  function _getUserDebtInBaseCurrency(
    address user,
    DataTypes.ReserveData storage reserve,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    uint256 normalizedDebt = reserve.getNormalizedDebt();
    uint256 balance = (IERC20(reserve.variableDebtTokenAddress).balanceOf(user).rayMul(normalizedDebt)) *
      assetPrice;
    unchecked {
      return balance / assetUnit;
    }
  }
}

library EModeConfiguration {
  function getEModeConfiguration(
    DataTypes.EModeCategory storage category,
    IPriceOracleGetter oracle
  ) internal view returns (uint256, uint256, uint256) {
    uint256 eModeAssetPrice = 0;
    if (category.priceSource != address(0)) {
      eModeAssetPrice = oracle.getAssetPrice(category.priceSource);
    }
    return (category.ltv, category.liquidationThreshold, eModeAssetPrice);
  }

  function isReserveEnabledOnBitmap(uint128 bitmap, uint256 reserveIndex) internal pure returns (bool) {
    unchecked {
      return (bitmap >> reserveIndex) & 1 != 0;
    }
  }
}
