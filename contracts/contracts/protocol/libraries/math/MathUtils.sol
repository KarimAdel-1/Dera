// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {WadRayMath} from './WadRayMath.sol';

/**
 * @title MathUtils library
 * @author DERA Protocol
 * @notice Interest rate calculations for lending protocol on Hedera
 * @dev Implements compound interest using Taylor series approximation
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Interest calculations performed on-chain
 * - block.timestamp: Hedera consensus timestamp (accurate to seconds)
 * 
 * INTEREST FORMULAS:
 * - Linear Interest: rate × time / SECONDS_PER_YEAR
 *   Used for: Simple interest calculations (rare)
 * 
 * - Compound Interest: e^(rate × time) ≈ 1 + x + x²/2 + x³/6
 *   Where: x = rate × time / SECONDS_PER_YEAR
 *   Used for: Variable debt index, liquidity index (continuous compounding)
 * 
 * TAYLOR SERIES:
 * - 3-term approximation: 1 + x + x²/2 + x³/6
 * - Accurate for typical DeFi rates (0-100% APY)
 * - Gas efficient: Only 3 terms needed
 * 
 * USE CASES:
 * - Liquidity Index: Grows continuously as suppliers earn interest
 * - Variable Debt Index: Grows continuously as borrowers accrue debt
 * - Reserve Updates: Called on every pool interaction
 * 
 * PRECISION:
 * - Uses Ray math (1e27) for high precision
 * - Timestamp in seconds (Hedera consensus time)
 * - SECONDS_PER_YEAR = 365 days = 31,536,000 seconds
 */
library MathUtils {
  using WadRayMath for uint256;

  uint256 internal constant SECONDS_PER_YEAR = 365 days;

  function calculateLinearInterest(
    uint256 rate,
    uint40 lastUpdateTimestamp
  ) internal view returns (uint256) {
    uint256 result = rate * (block.timestamp - uint256(lastUpdateTimestamp));
    unchecked {
      result = result / SECONDS_PER_YEAR;
    }
    return WadRayMath.RAY + result;
  }

  function calculateCompoundedInterest(
    uint256 rate,
    uint40 lastUpdateTimestamp,
    uint256 currentTimestamp
  ) internal pure returns (uint256) {
    uint256 exp = currentTimestamp - uint256(lastUpdateTimestamp);
    if (exp == 0) {
      return WadRayMath.RAY;
    }
    unchecked {
      uint256 x = (rate * exp) / SECONDS_PER_YEAR;
      return WadRayMath.RAY + x + x.rayMul(x / 2 + x.rayMul(x / 6));
    }
  }

  function calculateCompoundedInterest(
    uint256 rate,
    uint40 lastUpdateTimestamp
  ) internal view returns (uint256) {
    return calculateCompoundedInterest(rate, lastUpdateTimestamp, block.timestamp);
  }

  function mulDivCeil(uint256 a, uint256 b, uint256 c) internal pure returns (uint256 d) {
    assembly {
      if iszero(c) {
        revert(0, 0)
      }
      if iszero(or(iszero(b), iszero(gt(a, div(not(0), b))))) {
        revert(0, 0)
      }
      let product := mul(a, b)
      d := add(div(product, c), iszero(iszero(mod(product, c))))
    }
  }
}
