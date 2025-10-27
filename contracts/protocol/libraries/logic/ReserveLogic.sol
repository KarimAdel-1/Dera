// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVariableDebtToken} from '../../../interfaces/IVariableDebtToken.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {MathUtils} from '../math/MathUtils.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title ReserveLogic library
 * @author Dera Protocol
 * @notice Implements the logic to update the reserves state
 */
library ReserveLogic {
  using WadRayMath for uint256;
  using TokenMath for uint256;
  using PercentageMath for uint256;
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  function getNormalizedIncome(DataTypes.ReserveData storage reserve) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return reserve.liquidityIndex;
    } else {
      return MathUtils.calculateLinearInterest(reserve.currentLiquidityRate, timestamp).rayMul(reserve.liquidityIndex);
    }
  }

  function getNormalizedDebt(DataTypes.ReserveData storage reserve) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return reserve.variableBorrowIndex;
    } else {
      return MathUtils.calculateCompoundedInterest(reserve.currentVariableBorrowRate, timestamp).rayMul(reserve.variableBorrowIndex);
    }
  }

  function updateState(DataTypes.ReserveData storage reserve, DataTypes.ReserveCache memory reserveCache) internal {
    if (reserveCache.reserveLastUpdateTimestamp == uint40(block.timestamp)) {
      return;
    }
    _updateIndexes(reserve, reserveCache);
    _accrueToTreasury(reserve, reserveCache);
    reserve.lastUpdateTimestamp = uint40(block.timestamp);
    reserveCache.reserveLastUpdateTimestamp = uint40(block.timestamp);
  }

  function init(DataTypes.ReserveData storage reserve, address dTokenAddress, address variableDebtTokenAddress) internal {
    require(reserve.dTokenAddress == address(0), Errors.ReserveAlreadyInitialized());
    reserve.liquidityIndex = uint128(WadRayMath.RAY);
    reserve.variableBorrowIndex = uint128(WadRayMath.RAY);
    reserve.dTokenAddress = dTokenAddress;
    reserve.variableDebtTokenAddress = variableDebtTokenAddress;
  }

  function updateInterestRatesAndVirtualBalance(DataTypes.ReserveData storage reserve, DataTypes.ReserveCache memory reserveCache, address reserveAddress, uint256 liquidityAdded, uint256 liquidityTaken, address interestRateStrategyAddress) internal {
    uint256 totalVariableDebt = reserveCache.nextScaledVariableDebt.getVariableDebtTokenBalance(reserveCache.nextVariableBorrowIndex);
    (uint256 nextLiquidityRate, uint256 nextVariableRate) = IReserveInterestRateStrategy(interestRateStrategyAddress).calculateInterestRates(
      DataTypes.CalculateInterestRatesParams({
        unbacked: reserve.deficit,
        liquidityAdded: liquidityAdded,
        liquidityTaken: liquidityTaken,
        totalDebt: totalVariableDebt,
        reserveFactor: reserveCache.reserveFactor,
        reserve: reserveAddress,
        usingVirtualBalance: true,
        virtualUnderlyingBalance: reserve.virtualUnderlyingBalance
      })
    );
    reserve.currentLiquidityRate = uint128(nextLiquidityRate);
    reserve.currentVariableBorrowRate = uint128(nextVariableRate);
    if (liquidityAdded > 0) {
      reserve.virtualUnderlyingBalance += uint128(liquidityAdded);
    }
    if (liquidityTaken > 0) {
      reserve.virtualUnderlyingBalance -= uint128(liquidityTaken);
    }
    emit IPool.ReserveDataUpdated(reserveAddress, nextLiquidityRate, 0, nextVariableRate, reserveCache.nextLiquidityIndex, reserveCache.nextVariableBorrowIndex);
  }

  function _accrueToTreasury(DataTypes.ReserveData storage reserve, DataTypes.ReserveCache memory reserveCache) internal {
    if (reserveCache.reserveFactor == 0) {
      return;
    }
    uint256 totalDebtAccrued = reserveCache.currScaledVariableDebt.rayMulFloor(reserveCache.nextVariableBorrowIndex - reserveCache.currVariableBorrowIndex);
    uint256 amountToMint = totalDebtAccrued.percentMul(reserveCache.reserveFactor);
    if (amountToMint != 0) {
      reserve.accruedToTreasury += uint128(amountToMint.getDTokenMintScaledAmount(reserveCache.nextLiquidityIndex));
    }
  }

  function _updateIndexes(DataTypes.ReserveData storage reserve, DataTypes.ReserveCache memory reserveCache) internal {
    if (reserveCache.currLiquidityRate != 0) {
      uint256 cumulatedLiquidityInterest = MathUtils.calculateLinearInterest(reserveCache.currLiquidityRate, reserveCache.reserveLastUpdateTimestamp);
      reserveCache.nextLiquidityIndex = cumulatedLiquidityInterest.rayMul(reserveCache.currLiquidityIndex);
      reserve.liquidityIndex = uint128(reserveCache.nextLiquidityIndex);
    }
    if (reserveCache.currScaledVariableDebt != 0) {
      uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(reserveCache.currVariableBorrowRate, reserveCache.reserveLastUpdateTimestamp);
      reserveCache.nextVariableBorrowIndex = cumulatedVariableBorrowInterest.rayMul(reserveCache.currVariableBorrowIndex);
      reserve.variableBorrowIndex = uint128(reserveCache.nextVariableBorrowIndex);
    }
  }

  function cache(DataTypes.ReserveData storage reserve) internal view returns (DataTypes.ReserveCache memory) {
    DataTypes.ReserveCache memory reserveCache;
    reserveCache.reserveConfiguration = reserve.configuration;
    reserveCache.reserveFactor = reserveCache.reserveConfiguration.getReserveFactor();
    reserveCache.currLiquidityIndex = reserveCache.nextLiquidityIndex = reserve.liquidityIndex;
    reserveCache.currVariableBorrowIndex = reserveCache.nextVariableBorrowIndex = reserve.variableBorrowIndex;
    reserveCache.currLiquidityRate = reserve.currentLiquidityRate;
    reserveCache.currVariableBorrowRate = reserve.currentVariableBorrowRate;
    reserveCache.dTokenAddress = reserve.dTokenAddress;
    reserveCache.variableDebtTokenAddress = reserve.variableDebtTokenAddress;
    reserveCache.reserveLastUpdateTimestamp = reserve.lastUpdateTimestamp;
    reserveCache.currScaledVariableDebt = reserveCache.nextScaledVariableDebt = IVariableDebtToken(reserveCache.variableDebtTokenAddress).scaledTotalSupply();
    return reserveCache;
  }
}
