// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Errors} from '../helpers/Errors.sol';
import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title AssetConfiguration library
 * @author Dera Protocol
 * @notice Implements bitmap logic to manage pool asset configuration parameters
 */
library AssetConfiguration {
  uint256 internal constant LTV_MASK = 0x000000000000000000000000000000000000000000000000000000000000FFFF;
  uint256 internal constant LIQUIDATION_THRESHOLD_MASK = 0x00000000000000000000000000000000000000000000000000000000FFFF0000;
  uint256 internal constant LIQUIDATION_BONUS_MASK = 0x0000000000000000000000000000000000000000000000000000FFFF00000000;
  uint256 internal constant DECIMALS_MASK = 0x00000000000000000000000000000000000000000000000000FF000000000000;
  uint256 internal constant ACTIVE_MASK = 0x0000000000000000000000000000000000000000000000000100000000000000;
  uint256 internal constant FROZEN_MASK = 0x0000000000000000000000000000000000000000000000000200000000000000;
  uint256 internal constant BORROWING_MASK = 0x0000000000000000000000000000000000000000000000000400000000000000;
  uint256 internal constant PAUSED_MASK = 0x0000000000000000000000000000000000000000000000001000000000000000;
  uint256 internal constant ASSET_FACTOR_MASK = 0x00000000000000000000000000000000000000000000FFFF0000000000000000;
  uint256 internal constant BORROW_CAP_MASK = 0x00000000000000000000000000000000000FFFFFFFFF00000000000000000000;
  uint256 internal constant SUPPLY_CAP_MASK = 0x00000000000000000000000000FFFFFFFFF00000000000000000000000000000;
  uint256 internal constant LIQUIDATION_PROTOCOL_FEE_MASK = 0x0000000000000000000000FFFF00000000000000000000000000000000000000;
  uint256 internal constant VIRTUAL_ACC_ACTIVE_MASK = 0x1000000000000000000000000000000000000000000000000000000000000000;

  uint256 internal constant LIQUIDATION_THRESHOLD_START_BIT_POSITION = 16;
  uint256 internal constant LIQUIDATION_BONUS_START_BIT_POSITION = 32;
  uint256 internal constant RESERVE_DECIMALS_START_BIT_POSITION = 48;
  uint256 internal constant IS_ACTIVE_START_BIT_POSITION = 56;
  uint256 internal constant IS_FROZEN_START_BIT_POSITION = 57;
  uint256 internal constant BORROWING_ENABLED_START_BIT_POSITION = 58;
  uint256 internal constant IS_PAUSED_START_BIT_POSITION = 60;
  uint256 internal constant RESERVE_FACTOR_START_BIT_POSITION = 64;
  uint256 internal constant BORROW_CAP_START_BIT_POSITION = 80;
  uint256 internal constant SUPPLY_CAP_START_BIT_POSITION = 116;
  uint256 internal constant LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION = 152;
  uint256 internal constant VIRTUAL_ACC_START_BIT_POSITION = 252;

  uint256 internal constant MAX_VALID_LTV = 65535;
  uint256 internal constant MAX_VALID_LIQUIDATION_THRESHOLD = 65535;
  uint256 internal constant MAX_VALID_LIQUIDATION_BONUS = 65535;
  uint256 internal constant MAX_VALID_DECIMALS = 255;
  uint256 internal constant MAX_VALID_RESERVE_FACTOR = 65535;
  uint256 internal constant MAX_VALID_BORROW_CAP = 68719476735;
  uint256 internal constant MAX_VALID_SUPPLY_CAP = 68719476735;
  uint256 internal constant MAX_VALID_LIQUIDATION_PROTOCOL_FEE = 65535;

  uint16 public constant MAX_RESERVES_COUNT = 128;

  function setLtv(DataTypes.AssetConfigurationMap memory self, uint256 ltv) internal pure {
    if (ltv > MAX_VALID_LTV) revert Errors.InvalidLtv();
    self.data = (self.data & ~LTV_MASK) | ltv;
  }

  function getLtv(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return self.data & LTV_MASK;
  }

  function setLiquidationThreshold(DataTypes.AssetConfigurationMap memory self, uint256 threshold) internal pure {
    if (threshold > MAX_VALID_LIQUIDATION_THRESHOLD) revert Errors.InvalidLiquidationThreshold();
    self.data = (self.data & ~LIQUIDATION_THRESHOLD_MASK) | (threshold << LIQUIDATION_THRESHOLD_START_BIT_POSITION);
  }

  function getLiquidationThreshold(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION;
  }

  function setLiquidationBonus(DataTypes.AssetConfigurationMap memory self, uint256 bonus) internal pure {
    if (bonus > MAX_VALID_LIQUIDATION_BONUS) revert Errors.InvalidLiquidationBonus();
    self.data = (self.data & ~LIQUIDATION_BONUS_MASK) | (bonus << LIQUIDATION_BONUS_START_BIT_POSITION);
  }

  function getLiquidationBonus(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION;
  }

  function setDecimals(DataTypes.AssetConfigurationMap memory self, uint256 decimals) internal pure {
    if (decimals > MAX_VALID_DECIMALS) revert Errors.InvalidDecimals();
    self.data = (self.data & ~DECIMALS_MASK) | (decimals << RESERVE_DECIMALS_START_BIT_POSITION);
  }

  function getDecimals(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION;
  }

  function setActive(DataTypes.AssetConfigurationMap memory self, bool active) internal pure {
    self.data = (self.data & ~ACTIVE_MASK) | (uint256(active ? 1 : 0) << IS_ACTIVE_START_BIT_POSITION);
  }

  function getActive(DataTypes.AssetConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & ACTIVE_MASK) != 0;
  }

  function setFrozen(DataTypes.AssetConfigurationMap memory self, bool frozen) internal pure {
    self.data = (self.data & ~FROZEN_MASK) | (uint256(frozen ? 1 : 0) << IS_FROZEN_START_BIT_POSITION);
  }

  function getFrozen(DataTypes.AssetConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & FROZEN_MASK) != 0;
  }

  function setPaused(DataTypes.AssetConfigurationMap memory self, bool paused) internal pure {
    self.data = (self.data & ~PAUSED_MASK) | (uint256(paused ? 1 : 0) << IS_PAUSED_START_BIT_POSITION);
  }

  function getPaused(DataTypes.AssetConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & PAUSED_MASK) != 0;
  }

  function setBorrowingEnabled(DataTypes.AssetConfigurationMap memory self, bool enabled) internal pure {
    self.data = (self.data & ~BORROWING_MASK) | (uint256(enabled ? 1 : 0) << BORROWING_ENABLED_START_BIT_POSITION);
  }

  function getBorrowingEnabled(DataTypes.AssetConfigurationMap memory self) internal pure returns (bool) {
    return (self.data & BORROWING_MASK) != 0;
  }

  function setAssetFactor(DataTypes.AssetConfigurationMap memory self, uint256 assetFactor) internal pure {
    if (assetFactor > MAX_VALID_RESERVE_FACTOR) revert Errors.InvalidReserveFactor();
    self.data = (self.data & ~ASSET_FACTOR_MASK) | (assetFactor << RESERVE_FACTOR_START_BIT_POSITION);
  }

  function getAssetFactor(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & ASSET_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION;
  }

  function setBorrowCap(DataTypes.AssetConfigurationMap memory self, uint256 borrowCap) internal pure {
    if (borrowCap > MAX_VALID_BORROW_CAP) revert Errors.InvalidBorrowCap();
    self.data = (self.data & ~BORROW_CAP_MASK) | (borrowCap << BORROW_CAP_START_BIT_POSITION);
  }

  function getBorrowCap(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION;
  }

  function setSupplyCap(DataTypes.AssetConfigurationMap memory self, uint256 supplyCap) internal pure {
    if (supplyCap > MAX_VALID_SUPPLY_CAP) revert Errors.InvalidSupplyCap();
    self.data = (self.data & ~SUPPLY_CAP_MASK) | (supplyCap << SUPPLY_CAP_START_BIT_POSITION);
  }

  function getSupplyCap(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION;
  }

  function setLiquidationProtocolFee(DataTypes.AssetConfigurationMap memory self, uint256 liquidationProtocolFee) internal pure {
    if (liquidationProtocolFee > MAX_VALID_LIQUIDATION_PROTOCOL_FEE) revert Errors.InvalidLiquidationProtocolFee();
    self.data = (self.data & ~LIQUIDATION_PROTOCOL_FEE_MASK) | (liquidationProtocolFee << LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION);
  }

  function getLiquidationProtocolFee(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256) {
    return (self.data & LIQUIDATION_PROTOCOL_FEE_MASK) >> LIQUIDATION_PROTOCOL_FEE_START_BIT_POSITION;
  }

  function setVirtualAccActive(DataTypes.AssetConfigurationMap memory self) internal pure {
    self.data = (self.data & ~VIRTUAL_ACC_ACTIVE_MASK) | (uint256(1) << VIRTUAL_ACC_START_BIT_POSITION);
  }

  function getFlags(DataTypes.AssetConfigurationMap memory self) internal pure returns (bool, bool, bool, bool) {
    uint256 dataLocal = self.data;
    return ((dataLocal & ACTIVE_MASK) != 0, (dataLocal & FROZEN_MASK) != 0, (dataLocal & BORROWING_MASK) != 0, (dataLocal & PAUSED_MASK) != 0);
  }

  function getParams(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256, uint256, uint256, uint256, uint256) {
    uint256 dataLocal = self.data;
    return (
      dataLocal & LTV_MASK,
      (dataLocal & LIQUIDATION_THRESHOLD_MASK) >> LIQUIDATION_THRESHOLD_START_BIT_POSITION,
      (dataLocal & LIQUIDATION_BONUS_MASK) >> LIQUIDATION_BONUS_START_BIT_POSITION,
      (dataLocal & DECIMALS_MASK) >> RESERVE_DECIMALS_START_BIT_POSITION,
      (dataLocal & ASSET_FACTOR_MASK) >> RESERVE_FACTOR_START_BIT_POSITION
    );
  }

  function getCaps(DataTypes.AssetConfigurationMap memory self) internal pure returns (uint256, uint256) {
    uint256 dataLocal = self.data;
    return ((dataLocal & BORROW_CAP_MASK) >> BORROW_CAP_START_BIT_POSITION, (dataLocal & SUPPLY_CAP_MASK) >> SUPPLY_CAP_START_BIT_POSITION);
  }
}
