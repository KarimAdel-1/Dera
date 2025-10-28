// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ConfiguratorInputTypes} from '../protocol/libraries/types/ConfiguratorInputTypes.sol';

/**
 * @title IPoolConfigurator
 * @author Dera Protocol
 * @notice Defines the basic interface for a Pool configurator
 */
interface IPoolConfigurator {
  event AssetInitialized(address indexed asset, address indexed dToken, address stableDebtToken, address variableDebtToken, address interestRateStrategyAddress);
  event AssetBorrowing(address indexed asset, bool enabled);

  event PendingLtvChanged(address indexed asset, uint256 ltv);
  event CollateralConfigurationChanged(address indexed asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus);
  event AssetActive(address indexed asset, bool active);
  event AssetFrozen(address indexed asset, bool frozen);
  event AssetPaused(address indexed asset, bool paused);
  event AssetDropped(address indexed asset);
  event AssetFactorChanged(address indexed asset, uint256 oldAssetFactor, uint256 newAssetFactor);
  event BorrowCapChanged(address indexed asset, uint256 oldBorrowCap, uint256 newBorrowCap);
  event SupplyCapChanged(address indexed asset, uint256 oldSupplyCap, uint256 newSupplyCap);
  event LiquidationProtocolFeeChanged(address indexed asset, uint256 oldFee, uint256 newFee);
  event LiquidationGracePeriodChanged(address indexed asset, uint40 gracePeriodUntil);
  event LiquidationGracePeriodDisabled(address indexed asset);
  event AssetCollateralInEModeChanged(address indexed asset, uint8 categoryId, bool collateral);
  event AssetBorrowableInEModeChanged(address indexed asset, uint8 categoryId, bool borrowable);
  event EModeCategoryAdded(uint8 indexed categoryId, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, address oracle, string label);
  event ReserveInterestRateStrategyChanged(address indexed asset, address oldStrategy, address newStrategy);
  event AssetInterestRateDataChanged(address indexed asset, address indexed strategy, bytes data);
  event SupplyTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);
  event BorrowTokenUpgraded(address indexed asset, address indexed proxy, address indexed implementation);
  event DebtCeilingChanged(address indexed asset, uint256 oldDebtCeiling, uint256 newDebtCeiling);
  event SiloedBorrowingChanged(address indexed asset, bool oldState, bool newState);
  event BridgeProtocolFeeUpdated(uint256 oldBridgeProtocolFee, uint256 newBridgeProtocolFee);

  event BorrowableInIsolationChanged(address asset, bool borrowable);

  function initAssets(ConfiguratorInputTypes.InitAssetInput[] calldata input) external;
  function updateSupplyToken(ConfiguratorInputTypes.UpdateSupplyTokenInput calldata input) external;
  function updateBorrowToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input) external;
  function setAssetBorrowing(address asset, bool enabled) external;
  function configureAssetAsCollateral(address asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus) external;

  function setAssetActive(address asset, bool active) external;
  function setAssetFreeze(address asset, bool freeze) external;
  function setBorrowableInIsolation(address asset, bool borrowable) external;
  function setAssetPause(address asset, bool paused, uint40 gracePeriod) external;
  function setAssetPause(address asset, bool paused) external;
  function disableLiquidationGracePeriod(address asset) external;
  function setAssetFactor(address asset, uint256 newAssetFactor) external;
  function setAssetInterestRateData(address asset, bytes calldata rateData) external;
  function setPoolPause(bool paused, uint40 gracePeriod) external;
  function setPoolPause(bool paused) external;
  function setBorrowCap(address asset, uint256 newBorrowCap) external;
  function setSupplyCap(address asset, uint256 newSupplyCap) external;
  function setLiquidationProtocolFee(address asset, uint256 newFee) external;
  function setAssetBorrowableInEMode(address asset, uint8 categoryId, bool borrowable) external;
  function setAssetCollateralInEMode(address asset, uint8 categoryId, bool collateral) external;
  function setEModeCategory(uint8 categoryId, uint16 ltv, uint16 liquidationThreshold, uint16 liquidationBonus, string calldata label) external;
  function dropAsset(address asset) external;

  function setDebtCeiling(address asset, uint256 newDebtCeiling) external;
  function setSiloedBorrowing(address asset, bool siloed) external;
  function getPendingLtv(address asset) external view returns (uint256);
  function getConfiguratorLogic() external view returns (address);
  function MAX_GRACE_PERIOD() external view returns (uint40);
}
