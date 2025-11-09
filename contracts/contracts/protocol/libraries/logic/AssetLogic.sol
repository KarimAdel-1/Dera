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

  // Maximum time period for interest accrual to prevent overflow (1 year)
  uint256 internal constant MAX_ACCRUAL_PERIOD = 365 days;

  error ExcessiveAccrualPeriod(uint256 timeDelta);

  function getNormalizedIncome(DataTypes.PoolAssetData storage asset) internal view returns (uint256) {
    uint40 timestamp = asset.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return asset.liquidityIndex;
    } else {
      uint256 timeDelta = block.timestamp - timestamp;
      if (timeDelta > MAX_ACCRUAL_PERIOD) revert ExcessiveAccrualPeriod(timeDelta);
      return MathUtils.calculateLinearInterest(asset.currentLiquidityRate, timestamp).rayMul(asset.liquidityIndex);
    }
  }

  function getNormalizedDebt(DataTypes.PoolAssetData storage asset) internal view returns (uint256) {
    uint40 timestamp = asset.lastUpdateTimestamp;
    if (timestamp == block.timestamp) {
      return asset.variableBorrowIndex;
    } else {
      uint256 timeDelta = block.timestamp - timestamp;
      if (timeDelta > MAX_ACCRUAL_PERIOD) revert ExcessiveAccrualPeriod(timeDelta);
      return MathUtils.calculateCompoundedInterest(asset.currentVariableBorrowRate, timestamp).rayMul(asset.variableBorrowIndex);
    }
  }

  function updateState(DataTypes.PoolAssetData storage asset, DataTypes.AssetState memory assetState) internal {
    if (assetState.assetLastUpdateTimestamp == uint40(block.timestamp)) {
      return;
    }
    _updateIndexes(asset, assetState);
    _accrueToTreasury(asset, assetState);
    asset.lastUpdateTimestamp = uint40(block.timestamp);
    assetState.assetLastUpdateTimestamp = uint40(block.timestamp);
  }

  function init(DataTypes.PoolAssetData storage asset, address supplyTokenAddress, address borrowTokenAddress) internal {
    // Check if already initialized by checking liquidityIndex instead of supplyTokenAddress
    // (supplyTokenAddress could be address(0) for uninitialized HBAR asset)
    if (asset.liquidityIndex != 0) revert Errors.AssetAlreadyInitialized();
    asset.liquidityIndex = uint128(WadRayMath.RAY);
    asset.variableBorrowIndex = uint128(WadRayMath.RAY);
    asset.supplyTokenAddress = supplyTokenAddress;
    asset.borrowTokenAddress = borrowTokenAddress;
    asset.lastUpdateTimestamp = uint40(block.timestamp); // FIX: Initialize timestamp to prevent ExcessiveAccrualPeriod error
  }

  function updateInterestRatesAndVirtualBalance(DataTypes.PoolAssetData storage asset, DataTypes.AssetState memory assetState, address assetAddress, uint256 liquidityAdded, uint256 liquidityTaken, address interestRateStrategyAddress) internal {
    uint256 totalVariableDebt = assetState.nextScaledVariableDebt.getBorrowTokenBalance(assetState.nextVariableBorrowIndex);
    (uint256 nextLiquidityRate, uint256 nextVariableRate) = IReserveInterestRateStrategy(interestRateStrategyAddress).calculateInterestRates(
      DataTypes.CalculateInterestRatesParams({
        unbacked: asset.deficit,
        liquidityAdded: liquidityAdded,
        liquidityTaken: liquidityTaken,
        totalDebt: totalVariableDebt,
        assetFactor: assetState.assetFactor,
        asset: assetAddress,
        usingVirtualBalance: true,
        virtualUnderlyingBalance: asset.virtualUnderlyingBalance
      })
    );
    asset.currentLiquidityRate = uint128(nextLiquidityRate);
    asset.currentVariableBorrowRate = uint128(nextVariableRate);
    if (liquidityAdded > 0) {
      asset.virtualUnderlyingBalance += uint128(liquidityAdded);
    }
    if (liquidityTaken > 0) {
      asset.virtualUnderlyingBalance -= uint128(liquidityTaken);
    }
    // Event will be emitted by Pool contract
  }

  function _accrueToTreasury(DataTypes.PoolAssetData storage asset, DataTypes.AssetState memory assetState) internal {
    if (assetState.assetFactor == 0) {
      return;
    }
    uint256 totalDebtAccrued = assetState.currScaledVariableDebt.rayMulFloor(assetState.nextVariableBorrowIndex - assetState.currVariableBorrowIndex);
    uint256 amountToMint = totalDebtAccrued.percentMul(assetState.assetFactor);
    if (amountToMint != 0) {
      asset.accruedToTreasury += uint128(amountToMint.getSupplyTokenMintScaledAmount(assetState.nextLiquidityIndex));
    }
  }

  function _updateIndexes(DataTypes.PoolAssetData storage asset, DataTypes.AssetState memory assetState) internal {
    uint256 timeDelta = block.timestamp - assetState.assetLastUpdateTimestamp;
    if (timeDelta > MAX_ACCRUAL_PERIOD) revert ExcessiveAccrualPeriod(timeDelta);

    if (assetState.currLiquidityRate != 0) {
      uint256 cumulatedLiquidityInterest = MathUtils.calculateLinearInterest(assetState.currLiquidityRate, assetState.assetLastUpdateTimestamp);
      assetState.nextLiquidityIndex = cumulatedLiquidityInterest.rayMul(assetState.currLiquidityIndex);
      asset.liquidityIndex = uint128(assetState.nextLiquidityIndex);
    }
    if (assetState.currScaledVariableDebt != 0) {
      uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(assetState.currVariableBorrowRate, assetState.assetLastUpdateTimestamp);
      assetState.nextVariableBorrowIndex = cumulatedVariableBorrowInterest.rayMul(assetState.currVariableBorrowIndex);
      asset.variableBorrowIndex = uint128(assetState.nextVariableBorrowIndex);
    }
  }

  function cache(DataTypes.PoolAssetData storage asset) internal view returns (DataTypes.AssetState memory) {
    DataTypes.AssetState memory assetState;
    assetState.assetConfiguration = asset.configuration;
    assetState.assetFactor = assetState.assetConfiguration.getAssetFactor();
    assetState.currLiquidityIndex = assetState.nextLiquidityIndex = asset.liquidityIndex;
    assetState.currVariableBorrowIndex = assetState.nextVariableBorrowIndex = asset.variableBorrowIndex;
    assetState.currLiquidityRate = asset.currentLiquidityRate;
    assetState.currVariableBorrowRate = asset.currentVariableBorrowRate;
    assetState.supplyTokenAddress = asset.supplyTokenAddress;
    assetState.borrowTokenAddress = asset.borrowTokenAddress;
    assetState.assetLastUpdateTimestamp = asset.lastUpdateTimestamp;
    assetState.currScaledVariableDebt = assetState.nextScaledVariableDebt = IDeraBorrowToken(assetState.borrowTokenAddress).scaledTotalSupply();
    return assetState;
  }
}
