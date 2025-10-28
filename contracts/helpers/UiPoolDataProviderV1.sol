// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IHTS {
  function name(address token) external view returns (string memory);
  function symbol(address token) external view returns (string memory);
  function decimals(address token) external view returns (uint8);
  function balanceOf(address token, address account) external view returns (uint256);
}
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';
import {IDeraSupplyToken} from '../../interfaces/IDeraSupplyToken.sol';
import {IDeraBorrowToken} from '../../interfaces/IDeraBorrowToken.sol';
import {IDefaultInterestRateStrategy} from '../../interfaces/IDefaultInterestRateStrategy.sol';

import {WadRayMath} from '../../protocol/libraries/math/WadRayMath.sol';
import {AssetConfiguration} from '../../protocol/libraries/configuration/AssetConfiguration.sol';
import {UserConfiguration} from '../../protocol/libraries/configuration/UserConfiguration.sol';
import {DataTypes} from '../../protocol/libraries/types/DataTypes.sol';

/**
 * @title UiPoolDataProviderV1
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
 * - Hedera SDK: ContractCallQuery for getReservesData() and getUserReservesData()
 * - HTS: Token info retrieved via native Hedera token properties
 * - Frontend caching: Use Mirror Nodes for historical data, SDK for real-time updates
 */
contract UiPoolDataProviderV1 {
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
    uint256 reserveFactor;
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
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
    uint256 debtCeiling;
    uint256 debtCeilingDecimals;
    uint8 eModeCategoryId;
    uint256 borrowCap;
    uint256 supplyCap;
    bool flashLoanEnabled;
    uint256 virtualUnderlyingBalance;
  }

  struct UserReserveData {
    address underlyingAsset;
    uint256 scaledDTokenBalance;
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
  function getReservesList(
    IPoolAddressesProvider provider
  ) external view returns (address[] memory) {
    IPool pool = IPool(provider.getPool());
    return pool.getReservesList();
  }

  /**
   * @notice Get aggregated data for all reserves
   * @param provider PoolAddressesProvider address
   * @return poolAssets Array of reserve data
   * @return baseCurrencyInfo Base currency information
   * @dev PERFORMANCE: Single call gets ALL pool data
   * @dev Uses Pyth oracle for prices (decentralized)
   */
  function getReservesData(
    IPoolAddressesProvider provider
  ) external view returns (AggregatedReserveData[] memory, BaseCurrencyInfo memory) {
    IDeraOracle oracle = IDeraOracle(provider.getPriceOracle());
    IPool pool = IPool(provider.getPool());
    IHTS hts = IHTS(address(0x167)); // HTS precompile address

    address[] memory reserves = pool.getReservesList();
    AggregatedReserveData[] memory poolAssets = new AggregatedReserveData[](reserves.length);

    for (uint256 i = 0; i < reserves.length; i++) {
      AggregatedReserveData memory reserveData = poolAssets[i];
      reserveData.underlyingAsset = reserves[i];

      // Reserve current state
      DataTypes.PoolAssetData memory baseData = pool.getReserveData(reserveData.underlyingAsset);
      
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
        reserveData.reserveFactor
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
        IDefaultInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getVariableRateSlope1()
      returns (uint256 slope1) {
        reserveData.variableRateSlope1 = slope1;
      } catch {}

      try
        IDefaultInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getVariableRateSlope2()
      returns (uint256 slope2) {
        reserveData.variableRateSlope2 = slope2;
      } catch {}

      try
        IDefaultInterestRateStrategy(reserveData.interestRateStrategyAddress)
          .getBaseVariableBorrowRate()
      returns (uint256 baseRate) {
        reserveData.baseVariableBorrowRate = baseRate;
      } catch {}

      // Caps
      (reserveData.borrowCap, reserveData.supplyCap) = reserveConfigurationMap.getCaps();

      // Additional fields
      reserveData.accruedToTreasury = baseData.accruedToTreasury;
      reserveData.unbacked = baseData.unbacked;
      reserveData.isolationModeTotalDebt = baseData.isolationModeTotalDebt;
      
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
   * @return userEmodeCategoryId User's eMode category
   */
  function getUserReservesData(
    IPoolAddressesProvider provider,
    address user
  ) external view returns (UserReserveData[] memory, uint8) {
    IPool pool = IPool(provider.getPool());
    address[] memory reserves = pool.getReservesList();
    DataTypes.UserConfigurationMap memory userConfig = pool.getUserConfiguration(user);

    uint8 userEmodeCategoryId = uint8(pool.getUserEMode(user));

    UserReserveData[] memory userReservesData = new UserReserveData[](
      user != address(0) ? reserves.length : 0
    );

    for (uint256 i = 0; i < reserves.length; i++) {
      DataTypes.PoolAssetData memory baseData = pool.getReserveData(reserves[i]);

      userReservesData[i].underlyingAsset = reserves[i];
      userReservesData[i].scaledDTokenBalance = IDeraSupplyToken(baseData.supplyTokenAddress).scaledBalanceOf(
        user
      );
      userReservesData[i].usageAsCollateralEnabledOnUser = userConfig.isUsingAsCollateral(i);

      if (userConfig.isBorrowing(i)) {
        userReservesData[i].scaledVariableDebt = IDeraBorrowToken(
          baseData.borrowTokenAddress
        ).scaledBalanceOf(user);
      }
    }

    return (userReservesData, userEmodeCategoryId);
  }
}
