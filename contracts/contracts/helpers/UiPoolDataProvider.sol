// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IHTS {
  function name(address token) external view returns (string memory);
  function symbol(address token) external view returns (string memory);
  function decimals(address token) external view returns (uint8);
  function balanceOf(address token, address account) external view returns (uint256);
}
import {IPoolAddressesProvider} from '../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../interfaces/IPool.sol';
import {IPriceOracleGetter} from '../interfaces/IPriceOracleGetter.sol';
import {IDeraSupplyToken} from '../interfaces/IDeraSupplyToken.sol';
import {IDeraBorrowToken} from '../interfaces/IDeraBorrowToken.sol';
import {IReserveInterestRateStrategy} from '../interfaces/IReserveInterestRateStrategy.sol';

import {WadRayMath} from '../protocol/libraries/math/WadRayMath.sol';
import {AssetConfiguration} from '../protocol/libraries/configuration/AssetConfiguration.sol';
import {UserConfiguration} from '../protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

/**
 * @title UiPoolDataProvider
 * @author DERA Protocol
 * @notice Aggregates all pool data in a single call - optimized for Hedera
 * @dev Single contract call instead of 50+ calls - critical for UX
 * 
 * HEDERA TOOLS USED:
 * - Mirror Nodes: Frontend queries contract state via Mirror Node REST API (primary data source)
 * - Hedera SDK: ContractCallQuery for real-time data aggregation
 * - HTS (Hedera Token Service): Native token metadata and balances
 * - Pyth Oracle: Decentralized price feeds
 * 
 * INTEGRATION:
 * - Mirror Node API: GET /api/v1/contracts/{contractId}/state for cached data
 * - Hedera SDK: ContractCallQuery for getAssetsData() and getUserAssetsData()
 * - HTS: Token info retrieved via native Hedera token properties
 * - Frontend caching: Use Mirror Nodes for historical data, SDK for real-time updates
 */
contract UiPoolDataProvider {
  using WadRayMath for uint256;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  struct AggregatedReserveData {
    address underlyingAsset;
    string name;
    string symbol;
    uint256 decimals;
    uint256 baseLTVasCollateral;
    uint256 reserveLiquidationThreshold;
    uint256 reserveLiquidationBonus;
    uint256 assetFactor;
    bool usageAsCollateralEnabled;
    bool borrowingEnabled;
    bool isActive;
    bool isFrozen;
    // liquidity
    uint128 liquidityIndex;
    uint128 variableBorrowIndex;
    uint128 liquidityRate;
    uint128 variableBorrowRate;
    uint40 lastUpdateTimestamp;
    address supplyTokenAddress;
    address borrowTokenAddress;
    address interestRateStrategyAddress;
    uint256 availableLiquidity;
    uint256 totalScaledVariableDebt;
    uint256 priceInMarketReferenceCurrency;
    address priceOracle;
    uint256 variableRateSlope1;
    uint256 variableRateSlope2;
    uint256 baseVariableBorrowRate;
    uint256 optimalUsageRatio;
    // v3 fields
    bool isPaused;
    uint128 accruedToTreasury;
    uint256 borrowCap;
    uint256 supplyCap;
    uint256 virtualUnderlyingBalance;
  }

  struct UserReserveData {
    address underlyingAsset;
    uint256 scaledSupplyTokenBalance;
    bool usageAsCollateralEnabledOnUser;
    uint256 scaledVariableDebt;
  }

  struct BaseCurrencyInfo {
    uint256 marketReferenceCurrencyUnit;
    int256 marketReferenceCurrencyPriceInUsd;
    int256 networkBaseTokenPriceInUsd;
    uint8 networkBaseTokenPriceDecimals;
  }

  /**
   * @notice Get list of all reserves in the pool
   * @param provider PoolAddressesProvider address
   * @return Array of reserve addresses
   */
  function getAssetsList(
    IPoolAddressesProvider provider
  ) external view returns (address[] memory) {
    IPool pool = IPool(provider.getPool());
    return pool.getAssetsList();
  }

  /**
   * @notice Get aggregated data for all reserves
   * @param provider PoolAddressesProvider address
   * @return poolAssets Array of reserve data
   * @return baseCurrencyInfo Base currency information
   * @dev PERFORMANCE: Single call gets ALL pool data
   * @dev Uses Pyth oracle for prices (decentralized)
   */
  function getAssetsData(
    IPoolAddressesProvider provider
  ) external view returns (AggregatedReserveData[] memory, BaseCurrencyInfo memory) {
    IPriceOracleGetter oracle = IPriceOracleGetter(provider.getPriceOracle());
    IPool pool = IPool(provider.getPool());
    IHTS hts = IHTS(address(0x167)); // HTS precompile address

    address[] memory reserves = pool.getAssetsList();
    AggregatedReserveData[] memory poolAssets = new AggregatedReserveData[](reserves.length);

    for (uint256 i = 0; i < reserves.length; i++) {
      AggregatedReserveData memory reserveData = poolAssets[i];
      reserveData.underlyingAsset = reserves[i];

      // Reserve current state
      DataTypes.PoolAssetData memory baseData = pool.getAssetData(reserveData.underlyingAsset);
      
      reserveData.liquidityIndex = baseData.liquidityIndex;
      reserveData.variableBorrowIndex = baseData.variableBorrowIndex;
      reserveData.liquidityRate = baseData.currentLiquidityRate;
      reserveData.variableBorrowRate = baseData.currentVariableBorrowRate;
      reserveData.lastUpdateTimestamp = baseData.lastUpdateTimestamp;
      reserveData.supplyTokenAddress = baseData.supplyTokenAddress;
      reserveData.borrowTokenAddress = baseData.borrowTokenAddress;
      reserveData.interestRateStrategyAddress = baseData.interestRateStrategyAddress;
      
      // Pyth oracle price (decentralized)
      reserveData.priceInMarketReferenceCurrency = oracle.getAssetPrice(
        reserveData.underlyingAsset
      );
      reserveData.priceOracle = oracle.getSourceOfAsset(reserveData.underlyingAsset);
      
      // HTS native token balance
      reserveData.availableLiquidity = hts.balanceOf(
        reserveData.underlyingAsset,
        reserveData.supplyTokenAddress
      );
      reserveData.totalScaledVariableDebt = IDeraBorrowToken(
        reserveData.borrowTokenAddress
      ).scaledTotalSupply();

      // HTS token metadata
      reserveData.symbol = hts.symbol(reserveData.underlyingAsset);
      reserveData.name = hts.name(reserveData.underlyingAsset);
      reserveData.decimals = hts.decimals(reserveData.underlyingAsset);

      // Configuration
      DataTypes.AssetConfigurationMap memory reserveConfigurationMap = baseData.configuration;
      uint256 tempDecimals;
      (
        reserveData.baseLTVasCollateral,
        reserveData.reserveLiquidationThreshold,
        reserveData.reserveLiquidationBonus,
        tempDecimals,
        reserveData.assetFactor
      ) = reserveConfigurationMap.getParams();
      reserveData.usageAsCollateralEnabled = reserveData.baseLTVasCollateral != 0;

      (
        reserveData.isActive,
        reserveData.isFrozen,
        reserveData.borrowingEnabled,
        reserveData.isPaused
      ) = reserveConfigurationMap.getFlags();

      // Interest rates
      try
        IReserveInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getVariableRateSlope1()
      returns (uint256 slope1) {
        reserveData.variableRateSlope1 = slope1;
      } catch {}

      try
        IReserveInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getVariableRateSlope2()
      returns (uint256 slope2) {
        reserveData.variableRateSlope2 = slope2;
      } catch {}

      try
        IReserveInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getBaseVariableBorrowRate()
      returns (uint256 baseRate) {
        reserveData.baseVariableBorrowRate = baseRate;
      } catch {}

      // Caps
      (reserveData.borrowCap, reserveData.supplyCap) = reserveConfigurationMap.getCaps();

      // Additional fields
      reserveData.accruedToTreasury = baseData.accruedToTreasury;

      try pool.getVirtualUnderlyingBalance(reserveData.underlyingAsset) returns (
        uint128 virtualBalance
      ) {
        reserveData.virtualUnderlyingBalance = virtualBalance;
      } catch {}
    }

    BaseCurrencyInfo memory baseCurrencyInfo;
    baseCurrencyInfo.marketReferenceCurrencyUnit = 1 ether;
    baseCurrencyInfo.marketReferenceCurrencyPriceInUsd = 1e8; // $1 in 8 decimals
    baseCurrencyInfo.networkBaseTokenPriceInUsd = int256(oracle.getAssetPrice(address(0))); // HBAR price
    baseCurrencyInfo.networkBaseTokenPriceDecimals = 8;

    return (poolAssets, baseCurrencyInfo);
  }

  /**
   * @notice Get user reserve data for all reserves
   * @param provider PoolAddressesProvider address
   * @param user User address
   * @return userReservesData Array of user reserve data
   */
  function getUserAssetsData(
    IPoolAddressesProvider provider,
    address user
  ) external view returns (UserReserveData[] memory) {
    IPool pool = IPool(provider.getPool());
    address[] memory reserves = pool.getAssetsList();
    DataTypes.UserConfigurationMap memory userConfig = pool.getUserConfiguration(user);

    UserReserveData[] memory userReservesData = new UserReserveData[](
      user != address(0) ? reserves.length : 0
    );

    for (uint256 i = 0; i < reserves.length; i++) {
      DataTypes.PoolAssetData memory baseData = pool.getAssetData(reserves[i]);

      userReservesData[i].underlyingAsset = reserves[i];
      userReservesData[i].scaledSupplyTokenBalance = IDeraSupplyToken(baseData.supplyTokenAddress).scaledBalanceOf(
        user
      );
      userReservesData[i].usageAsCollateralEnabledOnUser = userConfig.isUsingAsCollateral(i);

      if (userConfig.isBorrowing(i)) {
        userReservesData[i].scaledVariableDebt = IDeraBorrowToken(
          baseData.borrowTokenAddress
        ).scaledBalanceOf(user);
      }
    }

    return userReservesData;
  }
}
