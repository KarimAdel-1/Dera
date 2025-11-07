// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {PercentageMath} from '../../libraries/math/PercentageMath.sol';
import {MathUtils} from '../../libraries/math/MathUtils.sol';
import {TokenMath} from '../../libraries/helpers/TokenMath.sol';
import {DataTypes} from '../../libraries/types/DataTypes.sol';
import {AssetLogic} from './AssetLogic.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {GenericLogic} from './GenericLogic.sol';
import {UserConfiguration} from '../../libraries/configuration/UserConfiguration.sol';
import {AssetConfiguration} from '../../libraries/configuration/AssetConfiguration.sol';
import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {IDeraBorrowToken} from '../../../interfaces/IDeraBorrowToken.sol';
import {IPriceOracleGetter} from '../../../interfaces/IPriceOracleGetter.sol';
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {Errors} from '../helpers/Errors.sol';

// HTS precompile interface for native Hedera token operations
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

/**
 * @title LiquidationLogic library
 * @author Dera
 * @notice Implements liquidation actions for undercollateralized positions using HTS
 */
library LiquidationLogic {
  using TokenMath for uint256;
  using PercentageMath for uint256;
  using AssetLogic for DataTypes.AssetState;
  using AssetLogic for DataTypes.PoolAssetData;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using SafeCast for uint256;

  error StalePriceData(address asset, uint256 age);

  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile address

  // Custom errors for HTS operations
  error HTSTransferFailed(int64 responseCode);
  error AmountExceedsInt64();

  uint256 internal constant DEFAULT_LIQUIDATION_CLOSE_FACTOR = 0.5e4;
  uint256 public constant CLOSE_FACTOR_HF_THRESHOLD = 0.95e18;
  uint256 public constant MIN_BASE_MAX_CLOSE_FACTOR_THRESHOLD = 2000e8;
  uint256 public constant MIN_LEFTOVER_BASE = MIN_BASE_MAX_CLOSE_FACTOR_THRESHOLD / 2;

  struct LiquidationCallLocalVars {
    uint256 borrowerCollateralBalance;
    uint256 borrowerReserveDebt;
    uint256 actualDebtToLiquidate;
    uint256 actualCollateralToLiquidate;
    uint256 liquidationBonus;
    uint256 healthFactor;
    uint256 liquidationProtocolFeeAmount;
    uint256 totalCollateralInBaseCurrency;
    uint256 totalDebtInBaseCurrency;
    uint256 collateralToLiquidateInBaseCurrency;
    uint256 borrowerReserveDebtInBaseCurrency;
    uint256 borrowerReserveCollateralInBaseCurrency;
    uint256 collateralAssetPrice;
    uint256 debtAssetPrice;
    uint256 collateralAssetUnit;
    uint256 debtAssetUnit;
    DataTypes.AssetState debtReserveCache;
    DataTypes.AssetState collateralReserveCache;
  }

  function executeLiquidationCall(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,

    DataTypes.ExecuteLiquidationCallParams memory params
  ) external returns (uint256) {
    LiquidationCallLocalVars memory vars;

    DataTypes.PoolAssetData storage collateralAsset = poolAssets[params.collateralAsset];
    DataTypes.PoolAssetData storage debtAsset = poolAssets[params.debtAsset];
    DataTypes.UserConfigurationMap storage borrowerConfig = usersConfig[params.borrower];
    
    vars.debtReserveCache = debtAsset.cache();
    vars.collateralReserveCache = collateralAsset.cache();
    debtAsset.updateState(vars.debtReserveCache);
    collateralAsset.updateState(vars.collateralReserveCache);

    (
      vars.totalCollateralInBaseCurrency,
      vars.totalDebtInBaseCurrency,
      ,
      ,
      vars.healthFactor,
      
    ) = GenericLogic.calculateUserAccountData(
      poolAssets,
      assetsList,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: borrowerConfig,
        user: params.borrower,
        oracle: params.priceOracle
      })
    );

    vars.borrowerCollateralBalance = IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress)
      .scaledBalanceOf(params.borrower)
      .getSupplyTokenBalance(vars.collateralReserveCache.nextLiquidityIndex);
    
    vars.borrowerReserveDebt = IDeraBorrowToken(vars.debtReserveCache.borrowTokenAddress)
      .scaledBalanceOf(params.borrower)
      .getBorrowTokenBalance(vars.debtReserveCache.nextVariableBorrowIndex);

    ValidationLogic.validateLiquidationCall(
      borrowerConfig,
      collateralAsset,
      debtAsset,
      DataTypes.ValidateLiquidationCallParams({
        debtReserveCache: vars.debtReserveCache,
        totalDebt: vars.borrowerReserveDebt,
        healthFactor: vars.healthFactor,
        priceOracleSentinel: params.priceOracleSentinel,
        borrower: params.borrower,
        liquidator: params.liquidator
      })
    );

    // Use standard liquidation bonus from reserve configuration (E-Mode removed for MVP)
    vars.liquidationBonus = vars.collateralReserveCache.assetConfiguration.getLiquidationBonus();

    vars.collateralAssetPrice = _getValidatedPrice(params.priceOracle, params.collateralAsset);
    vars.debtAssetPrice = _getValidatedPrice(params.priceOracle, params.debtAsset);
    vars.collateralAssetUnit = 10 ** vars.collateralReserveCache.assetConfiguration.getDecimals();
    vars.debtAssetUnit = 10 ** vars.debtReserveCache.assetConfiguration.getDecimals();

    vars.borrowerReserveDebtInBaseCurrency = MathUtils.mulDivCeil(
      vars.borrowerReserveDebt,
      vars.debtAssetPrice,
      vars.debtAssetUnit
    );

    vars.borrowerReserveCollateralInBaseCurrency =
      (vars.borrowerCollateralBalance * vars.collateralAssetPrice) / vars.collateralAssetUnit;

    uint256 maxLiquidatableDebt = vars.borrowerReserveDebt;
    
    if (
      vars.borrowerReserveCollateralInBaseCurrency >= MIN_BASE_MAX_CLOSE_FACTOR_THRESHOLD &&
      vars.borrowerReserveDebtInBaseCurrency >= MIN_BASE_MAX_CLOSE_FACTOR_THRESHOLD &&
      vars.healthFactor > CLOSE_FACTOR_HF_THRESHOLD
    ) {
      uint256 totalDefaultLiquidatableDebtInBaseCurrency = vars.totalDebtInBaseCurrency.percentMul(
        DEFAULT_LIQUIDATION_CLOSE_FACTOR
      );

      if (vars.borrowerReserveDebtInBaseCurrency > totalDefaultLiquidatableDebtInBaseCurrency) {
        maxLiquidatableDebt = (totalDefaultLiquidatableDebtInBaseCurrency * vars.debtAssetUnit) / vars.debtAssetPrice;
      }
    }

    vars.actualDebtToLiquidate = params.debtToCover > maxLiquidatableDebt ? maxLiquidatableDebt : params.debtToCover;

    (
      vars.actualCollateralToLiquidate,
      vars.actualDebtToLiquidate,
      vars.liquidationProtocolFeeAmount,
      vars.collateralToLiquidateInBaseCurrency
    ) = _calculateAvailableCollateralToLiquidate(
      vars.collateralReserveCache.assetConfiguration,
      vars.collateralAssetPrice,
      vars.collateralAssetUnit,
      vars.debtAssetPrice,
      vars.debtAssetUnit,
      vars.actualDebtToLiquidate,
      vars.borrowerCollateralBalance,
      vars.liquidationBonus
    );

    if (
      vars.actualDebtToLiquidate < vars.borrowerReserveDebt &&
      vars.actualCollateralToLiquidate + vars.liquidationProtocolFeeAmount < vars.borrowerCollateralBalance
    ) {
      bool isDebtMoreThanLeftoverThreshold = MathUtils.mulDivCeil(
        vars.borrowerReserveDebt - vars.actualDebtToLiquidate,
        vars.debtAssetPrice,
        vars.debtAssetUnit
      ) >= MIN_LEFTOVER_BASE;

      bool isCollateralMoreThanLeftoverThreshold = 
        ((vars.borrowerCollateralBalance - vars.actualCollateralToLiquidate - vars.liquidationProtocolFeeAmount) * 
        vars.collateralAssetPrice) / vars.collateralAssetUnit >= MIN_LEFTOVER_BASE;

      if (!isDebtMoreThanLeftoverThreshold || !isCollateralMoreThanLeftoverThreshold) revert Errors.MustNotLeaveDust();
    }

    if (vars.actualCollateralToLiquidate + vars.liquidationProtocolFeeAmount == vars.borrowerCollateralBalance) {
      borrowerConfig.setUsingAsCollateral(collateralAsset.id, params.collateralAsset, params.borrower, false);
    }

    bool hasNoCollateralLeft = vars.totalCollateralInBaseCurrency == vars.collateralToLiquidateInBaseCurrency;
    
    _burnDebtTokens(
      vars.debtReserveCache,
      debtAsset,
      borrowerConfig,
      params.borrower,
      params.debtAsset,
      vars.borrowerReserveDebt,
      vars.actualDebtToLiquidate,
      hasNoCollateralLeft,
      params.interestRateStrategyAddress
    );

    if (params.receiveSupplyToken) {
      _liquidateSupplyTokens(poolAssets, assetsList, usersConfig, collateralAsset, params, vars);
    } else {
      if (params.collateralAsset == params.debtAsset) {
        vars.collateralReserveCache.nextScaledVariableDebt = vars.debtReserveCache.nextScaledVariableDebt;
      }
      _burnCollateralSupplyTokens(collateralAsset, params, vars);
    }

    if (vars.liquidationProtocolFeeAmount != 0) {
      uint256 scaledDownLiquidationProtocolFee = vars.liquidationProtocolFeeAmount.getSupplyTokenTransferScaledAmount(
        vars.collateralReserveCache.nextLiquidityIndex
      );
      uint256 scaledDownBorrowerBalance = IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).scaledBalanceOf(params.borrower);
      
      if (scaledDownLiquidationProtocolFee > scaledDownBorrowerBalance) {
        scaledDownLiquidationProtocolFee = scaledDownBorrowerBalance;
        vars.liquidationProtocolFeeAmount = scaledDownBorrowerBalance.getSupplyTokenBalance(
          vars.collateralReserveCache.nextLiquidityIndex
        );
      }
      
      IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).transferOnLiquidation({
        from: params.borrower,
        to: IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).RESERVE_TREASURY_ADDRESS(),
        amount: vars.liquidationProtocolFeeAmount,
        scaledAmount: scaledDownLiquidationProtocolFee,
        index: vars.collateralReserveCache.nextLiquidityIndex
      });
    }

    if (hasNoCollateralLeft && borrowerConfig.isBorrowingAny()) {
      _burnBadDebt(poolAssets, assetsList, borrowerConfig, params);
    }

    // Transfer debt asset from liquidator to dToken contract via HTS
    // CRITICAL: Liquidator must be associated with the HTS token before this call
    _safeHTSTransferFrom(
      params.debtAsset,
      params.liquidator,
      vars.debtReserveCache.supplyTokenAddress,
      vars.actualDebtToLiquidate
    );

    // Return actual collateral liquidated for slippage protection
    return vars.actualCollateralToLiquidate;
    // Event will be emitted by Pool contract
  }

  function _burnCollateralSupplyTokens(
    DataTypes.PoolAssetData storage collateralAsset,
    DataTypes.ExecuteLiquidationCallParams memory params,
    LiquidationCallLocalVars memory vars
  ) internal {
    collateralAsset.updateInterestRatesAndVirtualBalance(
      vars.collateralReserveCache,
      params.collateralAsset,
      0,
      vars.actualCollateralToLiquidate,
      params.interestRateStrategyAddress
    );

    IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).burn({
      from: params.borrower,
      receiverOfUnderlying: params.liquidator,
      amount: vars.actualCollateralToLiquidate,
      scaledAmount: vars.actualCollateralToLiquidate.getSupplyTokenBurnScaledAmount(
        vars.collateralReserveCache.nextLiquidityIndex
      ),
      index: vars.collateralReserveCache.nextLiquidityIndex
    });
  }

  function _liquidateSupplyTokens(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    mapping(address => DataTypes.UserConfigurationMap) storage usersConfig,
    DataTypes.PoolAssetData storage collateralAsset,
    DataTypes.ExecuteLiquidationCallParams memory params,
    LiquidationCallLocalVars memory vars
  ) internal {
    uint256 liquidatorPreviousSupplyTokenBalance = IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).scaledBalanceOf(
      params.liquidator
    );
    
    IDeraSupplyToken(vars.collateralReserveCache.supplyTokenAddress).transferOnLiquidation(
      params.borrower,
      params.liquidator,
      vars.actualCollateralToLiquidate,
      vars.actualCollateralToLiquidate.getSupplyTokenTransferScaledAmount(vars.collateralReserveCache.nextLiquidityIndex),
      vars.collateralReserveCache.nextLiquidityIndex
    );

    if (liquidatorPreviousSupplyTokenBalance == 0) {
      DataTypes.UserConfigurationMap storage liquidatorConfig = usersConfig[params.liquidator];
      if (
        ValidationLogic.validateAutomaticUseAsCollateral(
          params.liquidator,
          poolAssets,
          assetsList,
          liquidatorConfig,
          vars.collateralReserveCache.assetConfiguration,
          vars.collateralReserveCache.supplyTokenAddress
        )
      ) {
        liquidatorConfig.setUsingAsCollateral(collateralAsset.id, params.collateralAsset, params.liquidator, true);
      }
    }
  }

  function _burnDebtTokens(
    DataTypes.AssetState memory debtReserveCache,
    DataTypes.PoolAssetData storage debtAsset,
    DataTypes.UserConfigurationMap storage borrowerConfig,
    address borrower,
    address debtAssetAddress,
    uint256 borrowerReserveDebt,
    uint256 actualDebtToLiquidate,
    bool hasNoCollateralLeft,
    address interestRateStrategyAddress
  ) internal {
    bool noMoreDebt = true;

    if (borrowerReserveDebt != 0) {
      uint256 burnAmount = hasNoCollateralLeft ? borrowerReserveDebt : actualDebtToLiquidate;

      (noMoreDebt, debtReserveCache.nextScaledVariableDebt) = IDeraBorrowToken(
        debtReserveCache.borrowTokenAddress
      ).burn({
        from: borrower,
        scaledAmount: burnAmount.getBorrowTokenBurnScaledAmount(debtReserveCache.nextVariableBorrowIndex),
        index: debtReserveCache.nextVariableBorrowIndex
      });
    }

    uint256 outstandingDebt = borrowerReserveDebt - actualDebtToLiquidate;
    if (hasNoCollateralLeft && outstandingDebt != 0) {
      debtAsset.deficit += outstandingDebt.toUint128();
      // Event will be emitted by Pool contract
    }

    if (noMoreDebt) {
      borrowerConfig.setBorrowing(debtAsset.id, false);
    }

    debtAsset.updateInterestRatesAndVirtualBalance(
      debtReserveCache,
      debtAssetAddress,
      actualDebtToLiquidate,
      0,
      interestRateStrategyAddress
    );
  }

  struct AvailableCollateralToLiquidateLocalVars {
    uint256 maxCollateralToLiquidate;
    uint256 baseCollateral;
    uint256 bonusCollateral;
    uint256 collateralAmount;
    uint256 debtAmountNeeded;
    uint256 liquidationProtocolFeePercentage;
    uint256 liquidationProtocolFee;
    uint256 collateralToLiquidateInBaseCurrency;
    uint256 collateralAssetPrice;
  }

  function _calculateAvailableCollateralToLiquidate(
    DataTypes.AssetConfigurationMap memory collateralReserveConfiguration,
    uint256 collateralAssetPrice,
    uint256 collateralAssetUnit,
    uint256 debtAssetPrice,
    uint256 debtAssetUnit,
    uint256 debtToCover,
    uint256 borrowerCollateralBalance,
    uint256 liquidationBonus
  ) internal pure returns (uint256, uint256, uint256, uint256) {
    AvailableCollateralToLiquidateLocalVars memory vars;
    vars.collateralAssetPrice = collateralAssetPrice;
    vars.liquidationProtocolFeePercentage = collateralReserveConfiguration.getLiquidationProtocolFee();

    vars.baseCollateral = (debtAssetPrice * debtToCover * collateralAssetUnit) / 
      (vars.collateralAssetPrice * debtAssetUnit);

    vars.maxCollateralToLiquidate = vars.baseCollateral.percentMul(liquidationBonus);

    if (vars.maxCollateralToLiquidate > borrowerCollateralBalance) {
      vars.collateralAmount = borrowerCollateralBalance;
      vars.debtAmountNeeded = ((vars.collateralAssetPrice * vars.collateralAmount * debtAssetUnit) /
        (debtAssetPrice * collateralAssetUnit)).percentDivCeil(liquidationBonus);
    } else {
      vars.collateralAmount = vars.maxCollateralToLiquidate;
      vars.debtAmountNeeded = debtToCover;
    }

    vars.collateralToLiquidateInBaseCurrency = (vars.collateralAmount * vars.collateralAssetPrice) / collateralAssetUnit;

    if (vars.liquidationProtocolFeePercentage != 0) {
      vars.bonusCollateral = vars.collateralAmount - vars.collateralAmount.percentDiv(liquidationBonus);
      vars.liquidationProtocolFee = vars.bonusCollateral.percentMul(vars.liquidationProtocolFeePercentage);
      vars.collateralAmount -= vars.liquidationProtocolFee;
    }
    
    return (
      vars.collateralAmount,
      vars.debtAmountNeeded,
      vars.liquidationProtocolFee,
      vars.collateralToLiquidateInBaseCurrency
    );
  }

  function _burnBadDebt(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.UserConfigurationMap storage borrowerConfig,
    DataTypes.ExecuteLiquidationCallParams memory params
  ) internal {
    uint256 cachedBorrowerConfig = borrowerConfig.data;
    uint256 i = 0;
    bool isBorrowed = false;
    
    while (cachedBorrowerConfig != 0) {
      (cachedBorrowerConfig, isBorrowed, ) = UserConfiguration.getNextFlags(cachedBorrowerConfig);
      if (isBorrowed) {
        address assetAddress = assetsList[i];
        if (assetAddress != address(0)) {
          DataTypes.AssetState memory assetState = poolAssets[assetAddress].cache();
          if (assetState.assetConfiguration.getActive()) {
            poolAssets[assetAddress].updateState(assetState);

            _burnDebtTokens(
              assetState,
              poolAssets[assetAddress],
              borrowerConfig,
              params.borrower,
              assetAddress,
              IDeraBorrowToken(assetState.borrowTokenAddress)
                .scaledBalanceOf(params.borrower)
                .getBorrowTokenBalance(assetState.nextVariableBorrowIndex),
              0,
              true,
              params.interestRateStrategyAddress
            );
          }
        }
      }
      unchecked {
        ++i;
      }
    }
  }

  // ============ Internal HTS Helper Functions ============

  /**
   * @notice Safe HTS token transfer from sender to recipient
   * @dev Uses Hedera Token Service precompile at 0x167
   * @param token HTS token address
   * @param from Sender address (must have approved the Pool contract via HTS)
   * @param to Recipient address (must be associated with the token)
   * @param amount Amount to transfer
   */
  function _safeHTSTransferFrom(address token, address from, address to, uint256 amount) internal {
    if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64();

    int64 responseCode = HTS.transferToken(token, from, to, int64(uint64(amount)));

    if (responseCode != 0) revert HTSTransferFailed(responseCode);
  }

  /**
   * @dev Gets validated price from oracle with staleness check
   * @param oracle Oracle address
   * @param asset Asset address
   * @return price Validated asset price
   */
  function _getValidatedPrice(address oracle, address asset) private view returns (uint256 price) {
    price = IPriceOracleGetter(oracle).getAssetPrice(asset);

    // Basic sanity check - price should not be zero
    if (price == 0) revert StalePriceData(asset, type(uint256).max);

    // Note: Full staleness validation requires oracle to expose timestamp
    // For production, oracle should implement getAssetPriceWithTimestamp(address)
    // which returns (uint256 price, uint256 timestamp)

    return price;
  }
}
