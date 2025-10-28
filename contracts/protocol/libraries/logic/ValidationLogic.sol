// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPriceOracleSentinel} from '../../../interfaces/IPriceOracleSentinel.sol';
import {IPoolAddressesProvider} from '../../../interfaces/IPoolAddressesProvider.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {GenericLogic} from './GenericLogic.sol';

/**
 * @title ValidationLogic library
 * @author Dera Protocol
 * @notice Implements functions to validate the different actions of the protocol
 */
library ValidationLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using TokenMath for uint256;
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 0.9e4;
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95e18;
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;
  bytes32 public constant ISOLATED_COLLATERAL_SUPPLIER_ROLE = keccak256('ISOLATED_COLLATERAL_SUPPLIER');

  function validateSupply(DataTypes.ReserveCache memory reserveCache, DataTypes.ReserveData storage reserve, uint256 scaledAmount, address onBehalfOf) internal view {
    require(scaledAmount != 0, Errors.InvalidAmount());
    (bool isActive, bool isFrozen, , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.ReserveInactive());
    require(!isPaused, Errors.ReservePaused());
    require(!isFrozen, Errors.ReserveFrozen());
    require(onBehalfOf != reserveCache.supplyTokenAddress, Errors.SupplyToDToken());
    uint256 supplyCap = reserveCache.reserveConfiguration.getSupplyCap();
    require(
      supplyCap == 0 ||
        ((IDeraSupplyToken(reserveCache.supplyTokenAddress).scaledTotalSupply() + scaledAmount + uint256(reserve.accruedToTreasury)).getDTokenBalance(reserveCache.nextLiquidityIndex)) <=
        supplyCap * (10 ** reserveCache.reserveConfiguration.getDecimals()),
      Errors.SupplyCapExceeded()
    );
  }

  function validateWithdraw(DataTypes.ReserveCache memory reserveCache, uint256 scaledAmount, uint256 scaledUserBalance) internal pure {
    require(scaledAmount != 0, Errors.InvalidAmount());
    require(scaledAmount <= scaledUserBalance, Errors.NotEnoughAvailableUserBalance());
    (bool isActive, , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.ReserveInactive());
    require(!isPaused, Errors.ReservePaused());
  }

  function validateBorrow(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.ValidateBorrowParams memory params
  ) internal view {
    require(params.amountScaled != 0, Errors.InvalidAmount());
    uint256 amount = params.amountScaled.getVariableDebtTokenBalance(params.reserveCache.nextVariableBorrowIndex);
    (bool isActive, bool isFrozen, bool borrowingEnabled, bool isPaused) = params.reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.ReserveInactive());
    require(!isPaused, Errors.ReservePaused());
    require(!isFrozen, Errors.ReserveFrozen());
    require(borrowingEnabled, Errors.BorrowingNotEnabled());
    require(params.priceOracleSentinel == address(0) || IPriceOracleSentinel(params.priceOracleSentinel).isBorrowAllowed(), Errors.PriceOracleSentinelCheckFailed());
    require(params.interestRateMode == DataTypes.InterestRateMode.VARIABLE, Errors.InvalidInterestRateModeSelected());
    uint256 borrowCap = params.reserveCache.reserveConfiguration.getBorrowCap();
    if (borrowCap != 0) {
      uint256 totalDebt = (params.reserveCache.currScaledVariableDebt + params.amountScaled).getVariableDebtTokenBalance(params.reserveCache.nextVariableBorrowIndex);
      require(totalDebt <= borrowCap * (10 ** params.reserveCache.reserveConfiguration.getDecimals()), Errors.BorrowCapExceeded());
    }
    if (params.userConfig.isBorrowingAny()) {
      (bool siloedBorrowingEnabled, address siloedBorrowingAddress) = params.userConfig.getSiloedBorrowingState(reservesData, reservesList);
      if (siloedBorrowingEnabled) {
        require(siloedBorrowingAddress == params.asset, Errors.SiloedBorrowingViolation());
      } else {
        require(!params.reserveCache.reserveConfiguration.getSiloedBorrowing(), Errors.SiloedBorrowingViolation());
      }
    }
  }

  function validateRepay(address user, DataTypes.ReserveCache memory reserveCache, uint256 amountSent, DataTypes.InterestRateMode interestRateMode, address onBehalfOf, uint256 debtScaled) internal pure {
    require(amountSent != 0, Errors.InvalidAmount());
    require(interestRateMode == DataTypes.InterestRateMode.VARIABLE, Errors.InvalidInterestRateModeSelected());
    require(amountSent != type(uint256).max || user == onBehalfOf, Errors.NoExplicitAmountToRepayOnBehalf());
    (bool isActive, , , bool isPaused) = reserveCache.reserveConfiguration.getFlags();
    require(isActive, Errors.ReserveInactive());
    require(!isPaused, Errors.ReservePaused());
    require(debtScaled != 0, Errors.NoDebtOfSelectedType());
  }

  function validateSetUseReserveAsCollateral(DataTypes.ReserveConfigurationMap memory reserveConfig) internal pure {
    (bool isActive, , , bool isPaused) = reserveConfig.getFlags();
    require(isActive, Errors.ReserveInactive());
    require(!isPaused, Errors.ReservePaused());
  }

  function validateLiquidationCall(DataTypes.UserConfigurationMap storage borrowerConfig, DataTypes.ReserveData storage collateralReserve, DataTypes.ReserveData storage debtReserve, DataTypes.ValidateLiquidationCallParams memory params) internal view {
    require(params.borrower != params.liquidator, Errors.SelfLiquidation());
    (bool collateralReserveActive, , , bool collateralReservePaused) = collateralReserve.configuration.getFlags();
    (bool principalReserveActive, , , bool principalReservePaused) = params.debtReserveCache.reserveConfiguration.getFlags();
    require(collateralReserveActive && principalReserveActive, Errors.ReserveInactive());
    require(!collateralReservePaused && !principalReservePaused, Errors.ReservePaused());
    require(
      params.priceOracleSentinel == address(0) || params.healthFactor < MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD || IPriceOracleSentinel(params.priceOracleSentinel).isLiquidationAllowed(),
      Errors.PriceOracleSentinelCheckFailed()
    );
    require(collateralReserve.liquidationGracePeriodUntil < uint40(block.timestamp) && debtReserve.liquidationGracePeriodUntil < uint40(block.timestamp), Errors.LiquidationGraceSentinelCheckFailed());
    require(params.healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD, Errors.HealthFactorNotBelowThreshold());
    bool isCollateralEnabled = collateralReserve.configuration.getLiquidationThreshold() != 0 && borrowerConfig.isUsingAsCollateral(collateralReserve.id);
    require(isCollateralEnabled, Errors.CollateralCannotBeLiquidated());
    require(params.totalDebt != 0, Errors.SpecifiedCurrencyNotBorrowedByUser());
  }

  function validateHealthFactor(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    address oracle
  ) internal view returns (uint256, bool) {
    (, , , , uint256 healthFactor, bool hasZeroLtvCollateral) = GenericLogic.calculateUserAccountData(
      reservesData,
      reservesList,
      DataTypes.CalculateUserAccountDataParams({userConfig: userConfig, user: user, oracle: oracle})
    );
    require(healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD, Errors.HealthFactorLowerThanLiquidationThreshold());
    return (healthFactor, hasZeroLtvCollateral);
  }

  function validateHFAndLtv(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    address oracle
  ) internal view {
    (uint256 userCollateralInBaseCurrency, uint256 userDebtInBaseCurrency, uint256 currentLtv, , uint256 healthFactor, ) = GenericLogic.calculateUserAccountData(
      reservesData,
      reservesList,
      DataTypes.CalculateUserAccountDataParams({userConfig: userConfig, user: user, oracle: oracle})
    );
    require(currentLtv != 0, Errors.LtvValidationFailed());
    require(healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD, Errors.HealthFactorLowerThanLiquidationThreshold());
    require(userCollateralInBaseCurrency >= userDebtInBaseCurrency.percentDivCeil(currentLtv), Errors.CollateralCannotCoverNewBorrow());
  }

  function validateHFAndLtvzero(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap memory userConfig,
    address asset,
    address from,
    address oracle
  ) internal view {
    (, bool hasZeroLtvCollateral) = validateHealthFactor(reservesData, reservesList, userConfig, from, oracle);
    require(!hasZeroLtvCollateral || reservesData[asset].configuration.getLtv() == 0, Errors.LtvValidationFailed());
  }

  function validateTransfer(DataTypes.ReserveData storage reserve) internal view {
    require(!reserve.configuration.getPaused(), Errors.ReservePaused());
  }

  function validateDropReserve(mapping(uint256 => address) storage reservesList, DataTypes.ReserveData storage reserve, address asset) internal view {
    require(asset != address(0), Errors.ZeroAddressNotValid());
    require(reserve.id != 0 || reservesList[0] == asset, Errors.AssetNotListed());
  }

  function validateUseAsCollateral(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveConfigurationMap memory reserveConfig
  ) internal view returns (bool) {
    if (reserveConfig.getLtv() == 0) {
      return false;
    }
    if (!userConfig.isUsingAsCollateralAny()) {
      return true;
    }
    (bool isolationModeActive, , ) = userConfig.getIsolationModeState(reservesData, reservesList);
    return (!isolationModeActive && reserveConfig.getDebtCeiling() == 0);
  }

  function validateAutomaticUseAsCollateral(
    address sender,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ReserveConfigurationMap memory reserveConfig,
    address supplyTokenAddress
  ) internal view returns (bool) {
    return validateUseAsCollateral(reservesData, reservesList, userConfig, reserveConfig);
  }
}
