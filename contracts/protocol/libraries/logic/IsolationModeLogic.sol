// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Errors} from '../helpers/Errors.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';

/**
 * @title IsolationModeLogic library
 * @author Dera Protocol
 * @notice Isolation mode logic for limiting borrowing power of risky collateral on Hedera
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Isolation mode debt tracking stored in contract storage
 * 
 * INTEGRATION:
 * - Isolation Mode: Restricts users with isolated collateral to borrow only specific assets
 * - Debt Ceiling: Maximum debt allowed when using isolated collateral (e.g., $10M)
 * - Safety: Prevents risky/new assets from exposing protocol to unlimited debt
 * 
 * EXAMPLE:
 * - New token XYZ added as isolated collateral with $10M debt ceiling
 * - User supplies $1M XYZ, can only borrow whitelisted stablecoins up to $10M total
 * - Prevents XYZ price manipulation from draining entire protocol
 */
library IsolationModeLogic {
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  function increaseIsolatedDebtIfIsolated(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveCache memory reserveCache,
    uint256 borrowAmount
  ) internal {
    (bool isolationModeActive, address isolationModeCollateralAddress, uint256 isolationModeDebtCeiling) = userConfig.getIsolationModeState(reservesData, reservesList);

    if (isolationModeActive) {
      require(reserveCache.reserveConfiguration.getBorrowableInIsolation(), Errors.AssetNotBorrowableInIsolation());

      uint128 nextIsolationModeTotalDebt = reservesData[isolationModeCollateralAddress].isolationModeTotalDebt + convertToIsolatedDebtUnits(reserveCache, borrowAmount);

      require(nextIsolationModeTotalDebt <= isolationModeDebtCeiling, Errors.DebtCeilingExceeded());

      setIsolationModeTotalDebt(reservesData[isolationModeCollateralAddress], isolationModeCollateralAddress, nextIsolationModeTotalDebt);
    }
  }

  function reduceIsolatedDebtIfIsolated(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveCache memory reserveCache,
    uint256 repayAmount
  ) internal {
    (bool isolationModeActive, address isolationModeCollateralAddress, ) = userConfig.getIsolationModeState(reservesData, reservesList);

    if (isolationModeActive) {
      updateIsolatedDebt(reservesData, reserveCache, repayAmount, isolationModeCollateralAddress);
    }
  }

  function updateIsolatedDebt(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.ReserveCache memory reserveCache,
    uint256 repayAmount,
    address isolationModeCollateralAddress
  ) internal {
    uint128 isolationModeTotalDebt = reservesData[isolationModeCollateralAddress].isolationModeTotalDebt;
    uint128 isolatedDebtRepaid = convertToIsolatedDebtUnits(reserveCache, repayAmount);
    uint128 newIsolationModeTotalDebt = isolationModeTotalDebt > isolatedDebtRepaid ? isolationModeTotalDebt - isolatedDebtRepaid : 0;
    setIsolationModeTotalDebt(reservesData[isolationModeCollateralAddress], isolationModeCollateralAddress, newIsolationModeTotalDebt);
  }

  function setIsolationModeTotalDebt(DataTypes.ReserveData storage reserveData, address isolationModeCollateralAddress, uint128 newIsolationModeTotalDebt) internal {
    reserveData.isolationModeTotalDebt = newIsolationModeTotalDebt;
    emit IPool.IsolationModeTotalDebtUpdated(isolationModeCollateralAddress, newIsolationModeTotalDebt);
  }

  /**
   * @notice Convert amount to isolated debt units
   * @param reserveCache Reserve cache with configuration
   * @param amount Amount to convert
   * @return Debt units scaled to DEBT_CEILING_DECIMALS
   * @dev CRITICAL: Prevents underflow if decimals < DEBT_CEILING_DECIMALS
   * @dev Reserve decimals must be >= DEBT_CEILING_DECIMALS (enforced in ConfiguratorLogic)
   */
  function convertToIsolatedDebtUnits(DataTypes.ReserveCache memory reserveCache, uint256 amount) private pure returns (uint128) {
    uint256 decimals = reserveCache.reserveConfiguration.getDecimals();
    require(decimals >= ReserveConfiguration.DEBT_CEILING_DECIMALS, Errors.InvalidDecimals());
    return uint128(amount / 10 ** (decimals - ReserveConfiguration.DEBT_CEILING_DECIMALS));
  }
}
