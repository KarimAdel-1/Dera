// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Errors} from '../helpers/Errors.sol';
import {ReserveConfiguration} from './ReserveConfiguration.sol';

/**
 * @title EModeConfiguration library
 * @author Dera Protocol
 * @notice Implements the bitmap logic to handle the eMode configuration
 */
library EModeConfiguration {
  function setReserveBitmapBit(uint128 bitmap, uint256 reserveIndex, bool enabled) internal pure returns (uint128) {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.InvalidReserveIndex());
      uint128 bit = uint128(1 << reserveIndex);
      if (enabled) {
        return bitmap | bit;
      } else {
        return bitmap & ~bit;
      }
    }
  }

  function isReserveEnabledOnBitmap(uint128 bitmap, uint256 reserveIndex) internal pure returns (bool) {
    unchecked {
      require(reserveIndex < ReserveConfiguration.MAX_RESERVES_COUNT, Errors.InvalidReserveIndex());
      return (bitmap >> reserveIndex) & 1 != 0;
    }
  }
}
