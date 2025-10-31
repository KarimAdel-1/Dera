// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPriceOracleSentinel} from '../../../interfaces/IPriceOracleSentinel.sol';
import {IPoolAddressesProvider} from '../../../interfaces/IPoolAddressesProvider.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {AssetLogic} from './AssetLogic.sol';
import {GenericLogic} from './GenericLogic.sol';

/**
 * @title ValidationLogic library
 * @author Dera Protocol
 * @notice Implements functions to validate the different actions of the protocol
 */
library ValidationLogic {
  using AssetLogic for DataTypes.PoolAssetData;
  using TokenMath for uint256;
  using PercentageMath for uint256;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 0.9e4;
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95e18;
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;
  bytes32 public constant ISOLATED_COLLATERAL_SUPPLIER_ROLE = keccak256('ISOLATED_COLLATERAL_SUPPLIER');

  function validateSupply(DataTypes.AssetState memory assetState, DataTypes.PoolAssetData storage asset, uint256 scaledAmount, address onBehalfOf) internal view {
    if (scaledAmount == 0) revert Errors.InvalidAmount();
    (bool isActive, bool isFrozen, , bool isPaused) = assetState.assetConfiguration.getFlags();
    if (!isActive) revert Errors.AssetInactive();
    if (isPaused) revert Errors.AssetPaused();
    if (isFrozen) revert Errors.AssetFrozen();
    if (onBehalfOf == assetState.supplyTokenAddress) revert Errors.SupplyToSupplyToken();
    uint256 supplyCap = assetState.assetConfiguration.getSupplyCap();
    if (supplyCap != 0 && ((IDeraSupplyToken(assetState.supplyTokenAddress).scaledTotalSupply() + scaledAmount + uint256(asset.accruedToTreasury)).getSupplyTokenBalance(assetState.nextLiquidityIndex)) > supplyCap * (10 ** assetState.assetConfiguration.getDecimals())) {
      revert Errors.SupplyCapExceeded();
    }
  }

  function validateWithdraw(DataTypes.AssetState memory assetState, uint256 scaledAmount, uint256 scaledUserBalance) internal pure {
    if (scaledAmount == 0) revert Errors.InvalidAmount();
    if (scaledAmount > scaledUserBalance) revert Errors.NotEnoughAvailableUserBalance();
    (bool isActive, , , bool isPaused) = assetState.assetConfiguration.getFlags();
    if (!isActive) revert Errors.AssetInactive();
    if (isPaused) revert Errors.AssetPaused();
  }

  function validateBorrow(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.ValidateBorrowParams memory params
  ) internal view {
    if (params.amountScaled == 0) revert Errors.InvalidAmount();
    uint256 amount = params.amountScaled.getBorrowTokenBalance(params.assetState.nextVariableBorrowIndex);
    (bool isActive, bool isFrozen, bool borrowingEnabled, bool isPaused) = params.assetState.assetConfiguration.getFlags();
    if (!isActive) revert Errors.AssetInactive();
    if (isPaused) revert Errors.AssetPaused();
    if (isFrozen) revert Errors.AssetFrozen();
    if (!borrowingEnabled) revert Errors.BorrowingNotEnabled();
    if (params.priceOracleSentinel != address(0) && !IPriceOracleSentinel(params.priceOracleSentinel).isBorrowAllowed()) revert Errors.PriceOracleSentinelCheckFailed();
    if (params.interestRateMode != DataTypes.InterestRateMode.VARIABLE) revert Errors.InvalidInterestRateModeSelected();
    uint256 borrowCap = params.assetState.assetConfiguration.getBorrowCap();
    if (borrowCap != 0) {
      uint256 totalDebt = (params.assetState.currScaledVariableDebt + params.amountScaled).getBorrowTokenBalance(params.assetState.nextVariableBorrowIndex);
      if (totalDebt > borrowCap * (10 ** params.assetState.assetConfiguration.getDecimals())) revert Errors.BorrowCapExceeded();
    }
  }

  function validateRepay(address user, DataTypes.AssetState memory assetState, uint256 amountSent, DataTypes.InterestRateMode interestRateMode, address onBehalfOf, uint256 debtScaled) internal pure {
    if (amountSent == 0) revert Errors.InvalidAmount();
    if (interestRateMode != DataTypes.InterestRateMode.VARIABLE) revert Errors.InvalidInterestRateModeSelected();
    if (amountSent == type(uint256).max && user != onBehalfOf) revert Errors.NoExplicitAmountToRepayOnBehalf();
    (bool isActive, , , bool isPaused) = assetState.assetConfiguration.getFlags();
    if (!isActive) revert Errors.AssetInactive();
    if (isPaused) revert Errors.AssetPaused();
    if (debtScaled == 0) revert Errors.NoDebtOfSelectedType();
  }

  function validateSetUseAssetAsCollateral(DataTypes.AssetConfigurationMap memory assetConfig) internal pure {
    (bool isActive, , , bool isPaused) = assetConfig.getFlags();
    if (!isActive) revert Errors.AssetInactive();
    if (isPaused) revert Errors.AssetPaused();
  }

  function validateLiquidationCall(DataTypes.UserConfigurationMap storage borrowerConfig, DataTypes.PoolAssetData storage collateralAsset, DataTypes.PoolAssetData storage debtAsset, DataTypes.ValidateLiquidationCallParams memory params) internal view {
    if (params.borrower == params.liquidator) revert Errors.SelfLiquidation();
    (bool collateralAssetActive, , , bool collateralAssetPaused) = collateralAsset.configuration.getFlags();
    (bool principalAssetActive, , , bool principalAssetPaused) = params.debtReserveCache.assetConfiguration.getFlags();
    if (!collateralAssetActive || !principalAssetActive) revert Errors.AssetInactive();
    if (collateralAssetPaused || principalAssetPaused) revert Errors.AssetPaused();
    if (params.priceOracleSentinel != address(0) && params.healthFactor >= MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD && !IPriceOracleSentinel(params.priceOracleSentinel).isLiquidationAllowed()) revert Errors.PriceOracleSentinelCheckFailed();
    if (collateralAsset.liquidationGracePeriodUntil >= uint40(block.timestamp) || debtAsset.liquidationGracePeriodUntil >= uint40(block.timestamp)) revert Errors.LiquidationGraceSentinelCheckFailed();
    if (params.healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD) revert Errors.HealthFactorNotBelowThreshold();
    bool isCollateralEnabled = collateralAsset.configuration.getLiquidationThreshold() != 0 && borrowerConfig.isUsingAsCollateral(collateralAsset.id);
    if (!isCollateralEnabled) revert Errors.CollateralCannotBeLiquidated();
    if (params.totalDebt == 0) revert Errors.SpecifiedCurrencyNotBorrowedByUser();
  }

  function validateHealthFactor(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    address oracle
  ) internal view returns (uint256, bool) {
    (, , , , uint256 healthFactor, bool hasZeroLtvCollateral) = GenericLogic.calculateUserAccountData(
      poolAssets,
      assetsList,
      DataTypes.CalculateUserAccountDataParams({userConfig: userConfig, user: user, oracle: oracle})
    );
    if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) revert Errors.HealthFactorLowerThanLiquidationThreshold();
    return (healthFactor, hasZeroLtvCollateral);
  }

  function validateHFAndLtv(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    address oracle
  ) internal view {
    (uint256 userCollateralInBaseCurrency, uint256 userDebtInBaseCurrency, uint256 currentLtv, , uint256 healthFactor, ) = GenericLogic.calculateUserAccountData(
      poolAssets,
      assetsList,
      DataTypes.CalculateUserAccountDataParams({userConfig: userConfig, user: user, oracle: oracle})
    );
    if (currentLtv == 0) revert Errors.LtvValidationFailed();
    if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) revert Errors.HealthFactorLowerThanLiquidationThreshold();
    if (userCollateralInBaseCurrency < userDebtInBaseCurrency.percentDivCeil(currentLtv)) revert Errors.CollateralCannotCoverNewBorrow();
  }

  function validateHFAndLtvzero(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap memory userConfig,
    address asset,
    address from,
    address oracle
  ) internal view {
    (, bool hasZeroLtvCollateral) = validateHealthFactor(poolAssets, assetsList, userConfig, from, oracle);
    if (hasZeroLtvCollateral && poolAssets[asset].configuration.getLtv() != 0) revert Errors.LtvValidationFailed();
  }

  function validateTransfer(DataTypes.PoolAssetData storage asset) internal view {
    if (asset.configuration.getPaused()) revert Errors.AssetPaused();
  }

  function validateDropAsset(mapping(uint256 => address) storage assetsList, DataTypes.PoolAssetData storage asset, address assetAddress) internal view {
    if (assetAddress == address(0)) revert Errors.ZeroAddressNotValid();
    if (asset.id == 0 && assetsList[0] != assetAddress) revert Errors.AssetNotListed();
  }

  function validateUseAsCollateral(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.AssetConfigurationMap memory assetConfig
  ) internal view returns (bool) {
    if (assetConfig.getLtv() == 0) {
      return false;
    }
    return true;
  }

  function validateAutomaticUseAsCollateral(
    address sender,
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.AssetConfigurationMap memory assetConfig,
    address supplyTokenAddress
  ) internal view returns (bool) {
    return validateUseAsCollateral(poolAssets, assetsList, userConfig, assetConfig);
  }
}
