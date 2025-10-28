// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {WadRayMath} from '../protocol/libraries/math/WadRayMath.sol';
import {PercentageMath} from '../protocol/libraries/math/PercentageMath.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
import {IReserveInterestRateStrategy} from '../interfaces/IReserveInterestRateStrategy.sol';

/**
 * @title DefaultReserveInterestRateStrategy
 * @author DERA Protocol
 * @notice Interest rate strategy using kinked rate model on Hedera
 * @dev Calculates borrow/supply rates based on utilization ratio
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Pure calculation contract, no token transfers
 * - HCS (Hedera Consensus Service): Rate changes logged via Pool events
 * - Mirror Nodes: Historical rate data queryable via REST API
 * 
 * INTEGRATION:
 * - Immutable Parameters: Set at deployment, no governance changes
 * - Rate Calculation: Pure view function, gas-efficient on Hedera
 * - Event Logging: Pool emits ReserveDataUpdated with new rates
 */
contract DefaultReserveInterestRateStrategy is IReserveInterestRateStrategy {
  uint256 public constant INTEREST_RATE_STRATEGY_REVISION = 0x1;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  uint256 public immutable OPTIMAL_USAGE_RATIO;
  uint256 public immutable BASE_VARIABLE_BORROW_RATE;
  uint256 public immutable VARIABLE_RATE_SLOPE1;
  uint256 public immutable VARIABLE_RATE_SLOPE2;

  constructor(uint256 optimalUsageRatio, uint256 baseVariableBorrowRate, uint256 variableRateSlope1, uint256 variableRateSlope2) {
    require(optimalUsageRatio <= WadRayMath.RAY, 'INVALID_OPTIMAL_RATIO');
    require(baseVariableBorrowRate <= WadRayMath.RAY, 'INVALID_BASE_RATE');
    
    OPTIMAL_USAGE_RATIO = optimalUsageRatio;
    BASE_VARIABLE_BORROW_RATE = baseVariableBorrowRate;
    VARIABLE_RATE_SLOPE1 = variableRateSlope1;
    VARIABLE_RATE_SLOPE2 = variableRateSlope2;
  }

  function getRevision() external pure returns (uint256) {
    return INTEREST_RATE_STRATEGY_REVISION;
  }

  function calculateInterestRates(DataTypes.CalculateInterestRatesParams calldata params) external view override returns (uint256, uint256) {
    uint256 currentLiquidityRate = 0;
    uint256 currentVariableBorrowRate = BASE_VARIABLE_BORROW_RATE;

    if (params.totalDebt == 0) {
      return (0, currentVariableBorrowRate);
    }

    uint256 availableLiquidity = params.virtualUnderlyingBalance + params.liquidityAdded - params.liquidityTaken;
    uint256 availableLiquidityPlusDebt = availableLiquidity + params.totalDebt;
    uint256 borrowUsageRatio = params.totalDebt.rayDiv(availableLiquidityPlusDebt);
    uint256 supplyUsageRatio = params.totalDebt.rayDiv(availableLiquidityPlusDebt + params.unbacked);

    if (borrowUsageRatio > OPTIMAL_USAGE_RATIO) {
      uint256 excessBorrowUsageRatio = (borrowUsageRatio - OPTIMAL_USAGE_RATIO).rayDiv(WadRayMath.RAY - OPTIMAL_USAGE_RATIO);
      currentVariableBorrowRate += VARIABLE_RATE_SLOPE1 + VARIABLE_RATE_SLOPE2.rayMul(excessBorrowUsageRatio);
    } else {
      currentVariableBorrowRate += VARIABLE_RATE_SLOPE1.rayMul(borrowUsageRatio).rayDiv(OPTIMAL_USAGE_RATIO);
    }

    currentLiquidityRate = currentVariableBorrowRate.rayMul(supplyUsageRatio).percentMul(PercentageMath.PERCENTAGE_FACTOR - params.assetFactor);

    return (currentLiquidityRate, currentVariableBorrowRate);
  }

  function setInterestRateParams(address, bytes calldata) external pure override {
    revert("Not supported");
  }
}
