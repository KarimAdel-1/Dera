// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDeraBorrowToken} from '../../../interfaces/IDeraBorrowToken.sol';
import {IReserveInterestRateStrategy} from '../../../interfaces/IReserveInterestRateStrategy.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {MathUtils} from '../math/MathUtils.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title AssetLogic library
 * @author Dera Protocol
 * @notice Implements core logic for pool asset state updates (interest accrual, indexes, rates)
 */
library AssetLogic {
  using WadRayMath for uint256;
  using TokenMath for uint256;
  using PercentageMath for uint256;
  using AssetLogic for DataTypes.PoolAssetData;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;

  function getNormalizedIncome(DataTypes.PoolAssetData storage reserve) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return reserve.liquidityIndex;
    } else {
      return MathUtils.calculateLinearInterest(reserve.currentLiquidityRate, timestamp).rayMul(reserve.liquidityIndex);
    }
  }

  function getNormalizedDebt(DataTypes.PoolAssetData storage reserve) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return reserve.variableBorrowIndex;
    } else {
      return MathUtils.calculateCompoundedInterest(reserve.currentVariableBorrowRate, timestamp).rayMul(reserve.variableBorrowIndex);
    }
  }

  function updateState(DataTypes.PoolAssetData storage reserve, DataTypes.AssetState memory assetState) internal {
    if (assetState.reserveLastUpdateTimestamp == uint40(block.timestamp)) {
      return;
    }
    _updateIndexes(reserve, assetState);
    _accrueToTreasury(reserve, assetState);
    reserve.lastUpdateTimestamp = uint40(block.timestamp);
    assetState.reserveLastUpdateTimestamp = uint40(block.timestamp);
  }

  function init(DataTypes.PoolAssetData storage reserve, address supplyTokenAddress, address borrowTokenAddress) internal {
    require(reserve.supplyTokenAddress == address(0), Errors.ReserveAlreadyInitialized());
    reserve.liquidityIndex = uint128(WadRayMath.RAY);
    reserve.variableBorrowIndex = uint128(WadRayMath.RAY);
    reserve.supplyTokenAddress = supplyTokenAddress;
    reserve.borrowTokenAddress = borrowTokenAddress;
  }

  function updateInterestRatesAndVirtualBalance(DataTypes.PoolAssetData storage reserve, DataTypes.AssetState memory assetState, address reserveAddress, uint256 liquidityAdded, uint256 liquidityTaken, address interestRateStrategyAddress) internal {
    uint256 totalVariableDebt = assetState.nextScaledVariableDebt.getVariableDebtTokenBalance(assetState.nextVariableBorrowIndex);
    (uint256 nextLiquidityRate, uint256 nextVariableRate) = IReserveInterestRateStrategy(interestRateStrategyAddress).calculateInterestRates(
      DataTypes.CalculateInterestRatesParams({
        unbacked: reserve.deficit,
        liquidityAdded: liquidityAdded,
        liquidityTaken: liquidityTaken,
        totalDebt: totalVariableDebt,
        reserveFactor: assetState.reserveFactor,
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
    emit IPool.ReserveDataUpdated(reserveAddress, nextLiquidityRate, 0, nextVariableRate, assetState.nextLiquidityIndex, assetState.nextVariableBorrowIndex);
  }

  function _accrueToTreasury(DataTypes.PoolAssetData storage reserve, DataTypes.AssetState memory assetState) internal {
    if (assetState.reserveFactor == 0) {
      return;
    }
    uint256 totalDebtAccrued = assetState.currScaledVariableDebt.rayMulFloor(assetState.nextVariableBorrowIndex - assetState.currVariableBorrowIndex);
    uint256 amountToMint = totalDebtAccrued.percentMul(assetState.reserveFactor);
    if (amountToMint != 0) {
      reserve.accruedToTreasury += uint128(amountToMint.getDTokenMintScaledAmount(assetState.nextLiquidityIndex));
    }
  }

  function _updateIndexes(DataTypes.PoolAssetData storage reserve, DataTypes.AssetState memory assetState) internal {
    if (assetState.currLiquidityRate != 0) {
      uint256 cumulatedLiquidityInterest = MathUtils.calculateLinearInterest(assetState.currLiquidityRate, assetState.reserveLastUpdateTimestamp);
      assetState.nextLiquidityIndex = cumulatedLiquidityInterest.rayMul(assetState.currLiquidityIndex);
      reserve.liquidityIndex = uint128(assetState.nextLiquidityIndex);
    }
    if (assetState.currScaledVariableDebt != 0) {
      uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(assetState.currVariableBorrowRate, assetState.reserveLastUpdateTimestamp);
      assetState.nextVariableBorrowIndex = cumulatedVariableBorrowInterest.rayMul(assetState.currVariableBorrowIndex);
      reserve.variableBorrowIndex = uint128(assetState.nextVariableBorrowIndex);
    }
  }

  function cache(DataTypes.PoolAssetData storage reserve) internal view returns (DataTypes.AssetState memory) {
    DataTypes.AssetState memory assetState;
    assetState.reserveConfiguration = reserve.configuration;
    assetState.reserveFactor = assetState.reserveConfiguration.getAssetFactor();
    assetState.currLiquidityIndex = assetState.nextLiquidityIndex = reserve.liquidityIndex;
    assetState.currVariableBorrowIndex = assetState.nextVariableBorrowIndex = reserve.variableBorrowIndex;
    assetState.currLiquidityRate = reserve.currentLiquidityRate;
    assetState.currVariableBorrowRate = reserve.currentVariableBorrowRate;
    assetState.supplyTokenAddress = reserve.supplyTokenAddress;
    assetState.borrowTokenAddress = reserve.borrowTokenAddress;
    assetState.reserveLastUpdateTimestamp = reserve.lastUpdateTimestamp;
    assetState.currScaledVariableDebt = assetState.nextScaledVariableDebt = IDeraBorrowToken(assetState.borrowTokenAddress).scaledTotalSupply();
    return assetState;
  }
}
