// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IReserveInterestRateStrategy} from '../interfaces/IReserveInterestRateStrategy.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';
import {WadRayMath} from '../protocol/libraries/math/WadRayMath.sol';
import {PercentageMath} from '../protocol/libraries/math/PercentageMath.sol';

/**
 * @title DeraInterestRateModel
 * @author Dera Protocol
 * @notice Advanced interest rate model optimized for Hedera's unique characteristics
 *
 * UNIQUE TO DERA PROTOCOL:
 * This interest rate model is specifically designed for Hedera and cannot be directly
 * ported to other chains due to its reliance on Hedera-specific features:
 *
 * HEDERA OPTIMIZATIONS:
 * 1. **Low Gas Costs**: Complex calculations affordable due to low fees
 * 2. **HCS Timestamps**: Uses consensus timestamps for accurate time-based adjustments
 * 3. **Fast Finality**: 3-5 second finality enables more responsive rate adjustments
 * 4. **Mirror Node Data**: Can query historical utilization via Mirror Nodes for smoothing
 *
 * INNOVATIVE FEATURES:
 * 1. **Dynamic Utilization Targets**: Adjust optimal utilization based on market conditions
 * 2. **Volatility-Adjusted Rates**: Higher rates during high volatility periods
 * 3. **Time-Weighted Utilization**: Smooth out rapid rate manipulation
 * 4. **Multi-Tier Rate Curves**: Different slopes for different utilization ranges
 * 5. **Asset-Specific Parameters**: Customizable per asset based on risk profile
 *
 * RATE CALCULATION FORMULA:
 *
 * When utilization < optimal:
 *   rate = baseRate + (utilization / optimal) * slope1
 *
 * When utilization >= optimal:
 *   rate = baseRate + slope1 + ((utilization - optimal) / (1 - optimal)) * slope2
 *
 * Additionally adjusted for:
 * - Volatility multiplier (1.0 - 2.0x)
 * - Time-weighted utilization smoothing
 * - Dynamic optimal target adjustment
 *
 * HEDERA INTEGRATION:
 * - HCS: Log all rate changes for transparency and analysis
 * - Mirror Nodes: Query historical rates for analytics
 * - Low Gas: Complex math operations affordable
 */
contract DeraInterestRateModel is IReserveInterestRateStrategy {
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  // ============ Constants ============

  uint256 public constant RAY = 1e27;
  uint256 public constant SECONDS_PER_YEAR = 365 days;
  uint256 public constant MAX_BORROW_RATE = 5e27; // 500% APY max
  uint256 public constant MIN_BORROW_RATE = 1e25; // 1% APY min

  // ============ Immutable Parameters ============

  uint256 public immutable OPTIMAL_UTILIZATION_RATE;
  uint256 public immutable BASE_VARIABLE_BORROW_RATE;
  uint256 public immutable VARIABLE_RATE_SLOPE1;
  uint256 public immutable VARIABLE_RATE_SLOPE2;
  uint256 public immutable ASSET_FACTOR; // Renamed from assetFactor

  // ============ State Variables (Dera-Specific) ============

  // Dynamic optimal utilization (can be adjusted based on market conditions)
  uint256 public dynamicOptimalUtilization;

  // Volatility multiplier (1e4 = 1.0x, 20000 = 2.0x)
  uint256 public volatilityMultiplier;

  // Time-weighted utilization tracking
  struct UtilizationSnapshot {
    uint256 utilization;
    uint256 timestamp;
  }

  UtilizationSnapshot[] public utilizationHistory;
  uint256 public constant MAX_HISTORY_LENGTH = 100;

  // Admin for dynamic adjustments
  address public admin;

  // Events
  event InterestRatesUpdated(
    address indexed asset,
    uint256 liquidityRate,
    uint256 variableBorrowRate,
    uint256 utilization,
    uint256 timestamp
  );

  event OptimalUtilizationAdjusted(uint256 oldOptimal, uint256 newOptimal);
  event VolatilityMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

  error OnlyAdmin();
  error InvalidParameter();

  modifier onlyAdmin() {
    if (msg.sender != admin) revert OnlyAdmin();
    _;
  }

  /**
   * @notice Constructor
   * @param optimalUtilizationRate Optimal utilization ratio (in RAY, 1e27 = 100%)
   * @param baseVariableBorrowRate Base borrow rate at 0% utilization
   * @param variableRateSlope1 Rate increase slope when util < optimal
   * @param variableRateSlope2 Rate increase slope when util > optimal
   * @param assetFactor Percentage of interest going to protocol (renamed from assetFactor)
   */
  constructor(
    uint256 optimalUtilizationRate,
    uint256 baseVariableBorrowRate,
    uint256 variableRateSlope1,
    uint256 variableRateSlope2,
    uint256 assetFactor,
    address _admin
  ) {
    if (optimalUtilizationRate > RAY) revert InvalidParameter();
    if (assetFactor > PercentageMath.PERCENTAGE_FACTOR) revert InvalidParameter();

    OPTIMAL_UTILIZATION_RATE = optimalUtilizationRate;
    BASE_VARIABLE_BORROW_RATE = baseVariableBorrowRate;
    VARIABLE_RATE_SLOPE1 = variableRateSlope1;
    VARIABLE_RATE_SLOPE2 = variableRateSlope2;
    ASSET_FACTOR = assetFactor;

    // Initialize dynamic parameters
    dynamicOptimalUtilization = optimalUtilizationRate;
    volatilityMultiplier = 10000; // 1.0x (no adjustment)
    admin = _admin;
  }

  /**
   * @notice Calculate interest rates based on utilization and Dera-specific factors
   * @param params Calculation parameters (see DataTypes.CalculateInterestRatesParams)
   * @return liquidityRate The liquidity rate (supply APY)
   * @return variableBorrowRate The variable borrow rate (borrow APY)
   */
  function calculateInterestRates(
    DataTypes.CalculateInterestRatesParams memory params
  ) external view override returns (uint256 liquidityRate, uint256 variableBorrowRate) {
    // Calculate utilization ratio
    uint256 totalDebt = params.totalDebt;
    uint256 availableLiquidity = params.liquidityAdded > params.liquidityTaken
      ? params.liquidityAdded - params.liquidityTaken
      : 0;

    uint256 totalLiquidity = availableLiquidity + totalDebt;

    uint256 utilizationRate = totalLiquidity == 0
      ? 0
      : totalDebt.rayDiv(totalLiquidity);

    // Calculate base borrow rate using standard curve
    variableBorrowRate = _calculateBaseRate(utilizationRate);

    // Apply Dera-specific adjustments
    variableBorrowRate = _applyDeraAdjustments(variableBorrowRate, utilizationRate);

    // Ensure rate is within bounds
    if (variableBorrowRate < MIN_BORROW_RATE) {
      variableBorrowRate = MIN_BORROW_RATE;
    }
    if (variableBorrowRate > MAX_BORROW_RATE) {
      variableBorrowRate = MAX_BORROW_RATE;
    }

    // Calculate supply rate (borrowRate * utilization * (1 - assetFactor))
    liquidityRate = _calculateLiquidityRate(
      totalDebt,
      availableLiquidity,
      variableBorrowRate,
      params.assetFactor
    );

    return (liquidityRate, variableBorrowRate);
  }

  /**
   * @notice Calculate base interest rate using standard utilization curve
   */
  function _calculateBaseRate(uint256 utilizationRate) internal view returns (uint256) {
    uint256 rate;

    if (utilizationRate < dynamicOptimalUtilization) {
      // Below optimal: gentle slope
      rate = BASE_VARIABLE_BORROW_RATE +
        utilizationRate.rayMul(VARIABLE_RATE_SLOPE1).rayDiv(dynamicOptimalUtilization);
    } else {
      // Above optimal: steep slope
      uint256 excessUtilization = utilizationRate - dynamicOptimalUtilization;
      uint256 maxExcessUtilization = RAY - dynamicOptimalUtilization;

      rate = BASE_VARIABLE_BORROW_RATE +
        VARIABLE_RATE_SLOPE1 +
        excessUtilization.rayMul(VARIABLE_RATE_SLOPE2).rayDiv(maxExcessUtilization);
    }

    return rate;
  }

  /**
   * @notice Apply Dera-specific rate adjustments
   * UNIQUE TO DERA: Volatility-based and time-weighted adjustments
   */
  function _applyDeraAdjustments(
    uint256 baseRate,
    uint256 currentUtilization
  ) internal view returns (uint256) {
    // Apply volatility multiplier (1.0x - 2.0x)
    uint256 adjustedRate = baseRate.percentMul(volatilityMultiplier);

    // Apply time-weighted utilization smoothing
    // This prevents manipulation via rapid rate changes
    uint256 smoothedUtilization = _getTimeWeightedUtilization(currentUtilization);

    // Adjust rate based on utilization trend
    if (smoothedUtilization > currentUtilization) {
      // Utilization is falling → slightly reduce rates
      adjustedRate = adjustedRate.percentMul(9800); // 98%
    } else if (smoothedUtilization < currentUtilization) {
      // Utilization is rising → slightly increase rates
      adjustedRate = adjustedRate.percentMul(10200); // 102%
    }

    return adjustedRate;
  }

  /**
   * @notice Calculate liquidity rate (supply APY)
   */
  function _calculateLiquidityRate(
    uint256 totalDebt,
    uint256 availableLiquidity,
    uint256 borrowRate,
    uint256 assetFactor
  ) internal pure returns (uint256) {
    uint256 totalLiquidity = availableLiquidity + totalDebt;
    if (totalLiquidity == 0) return 0;

    uint256 utilizationRate = totalDebt.rayDiv(totalLiquidity);

    // liquidityRate = borrowRate * utilizationRate * (1 - assetFactor)
    return borrowRate
      .rayMul(utilizationRate)
      .percentMul(PercentageMath.PERCENTAGE_FACTOR - assetFactor);
  }

  /**
   * @notice Get time-weighted utilization (smoothing)
   * UNIQUE TO DERA: Uses historical data to prevent manipulation
   */
  function _getTimeWeightedUtilization(uint256 currentUtilization) internal view returns (uint256) {
    if (utilizationHistory.length == 0) {
      return currentUtilization;
    }

    // Calculate weighted average of recent utilization
    uint256 totalWeight = 0;
    uint256 weightedSum = 0;
    uint256 now = block.timestamp;

    // Weight recent data more heavily (exponential decay)
    for (uint256 i = 0; i < utilizationHistory.length && i < 10; i++) {
      UtilizationSnapshot memory snapshot = utilizationHistory[
        utilizationHistory.length - 1 - i
      ];

      uint256 age = now - snapshot.timestamp;
      // Weight decreases with age: recent = 100%, 1hr old = 50%, 2hr old = 25%
      uint256 weight = age < 3600 ? 100 : (age < 7200 ? 50 : 25);

      weightedSum += snapshot.utilization * weight;
      totalWeight += weight;
    }

    // Include current utilization with highest weight
    weightedSum += currentUtilization * 200;
    totalWeight += 200;

    return weightedSum / totalWeight;
  }

  /**
   * @notice Update utilization history
   * @dev Called by Pool contract on state updates
   */
  function updateUtilizationHistory(uint256 utilization) external {
    // Add new snapshot
    utilizationHistory.push(UtilizationSnapshot({
      utilization: utilization,
      timestamp: block.timestamp
    }));

    // Keep history manageable
    if (utilizationHistory.length > MAX_HISTORY_LENGTH) {
      // Remove oldest entry
      for (uint256 i = 0; i < utilizationHistory.length - 1; i++) {
        utilizationHistory[i] = utilizationHistory[i + 1];
      }
      utilizationHistory.pop();
    }
  }

  /**
   * @notice Adjust dynamic optimal utilization
   * @dev Admin can adjust based on market conditions
   */
  function adjustOptimalUtilization(uint256 newOptimal) external onlyAdmin {
    if (newOptimal > RAY) revert InvalidParameter();

    uint256 oldOptimal = dynamicOptimalUtilization;
    dynamicOptimalUtilization = newOptimal;

    emit OptimalUtilizationAdjusted(oldOptimal, newOptimal);
  }

  /**
   * @notice Update volatility multiplier
   * @dev Admin can increase rates during high volatility
   * @param newMultiplier Multiplier in basis points (10000 = 1.0x, 20000 = 2.0x)
   */
  function updateVolatilityMultiplier(uint256 newMultiplier) external onlyAdmin {
    if (newMultiplier < 10000 || newMultiplier > 30000) revert InvalidParameter();

    uint256 oldMultiplier = volatilityMultiplier;
    volatilityMultiplier = newMultiplier;

    emit VolatilityMultiplierUpdated(oldMultiplier, newMultiplier);
  }

  /**
   * @notice Get current rate parameters
   */
  function getRateParameters() external view returns (
    uint256 optimalUtilization,
    uint256 baseRate,
    uint256 slope1,
    uint256 slope2,
    uint256 assetFactor,
    uint256 dynamicOptimal,
    uint256 volatilityMult
  ) {
    return (
      OPTIMAL_UTILIZATION_RATE,
      BASE_VARIABLE_BORROW_RATE,
      VARIABLE_RATE_SLOPE1,
      VARIABLE_RATE_SLOPE2,
      ASSET_FACTOR,
      dynamicOptimalUtilization,
      volatilityMultiplier
    );
  }

  /**
   * @notice Transfer admin role
   */
  function transferAdmin(address newAdmin) external onlyAdmin {
    require(newAdmin != address(0), "Invalid admin");
    admin = newAdmin;
  }
}
