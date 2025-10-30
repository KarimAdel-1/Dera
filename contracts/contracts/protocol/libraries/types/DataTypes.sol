// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DataTypes library
 * @author Dera Protocol
 * @notice Core data structures for Dera lending protocol on Hedera
 * @dev Defines all structs used across the protocol for gas-efficient storage
 *
 * HEDERA TOOLS USED:
 * - Smart Contract State: All structs stored on-chain in optimized layout
 * - Storage Packing: Tight packing to minimize storage slots (gas savings)
 *
 * KEY STRUCTURES:
 * - PoolAssetData: Per-asset state (liquidity index, borrow index, rates, token addresses)
 * - UserConfigurationMap: Bitmap of user's collateral/borrowing (1 bit per asset)
 * - AssetConfigurationMap: Bitmap of asset parameters (packed in 1 uint256)
 *
 * STORAGE OPTIMIZATION:
 * - Bitmaps: 256 assets in 1 uint256 (1 bit per asset)
 * - Packed structs: Multiple fields in single storage slot
 * - uint128/uint40/uint16: Smaller types where possible
 *
 * DERA PROTOCOL:
 * - Unique architecture: Pool asset model instead of reserve-based
 * - Hedera-native: Optimized for HTS token operations
 * - Simplified: Only variable rate, no complex modes
 *
 * HEDERA BENEFITS:
 * - Low gas costs make complex structs affordable
 * - Storage optimization still valuable for high-frequency operations
 * - Mirror Nodes can query all struct data via contract state
 */
library DataTypes {
  struct PoolAssetData {
    AssetConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 deficit;
    uint40 lastUpdateTimestamp;
    uint16 id;
    uint40 liquidationGracePeriodUntil;
    address supplyTokenAddress;
    address borrowTokenAddress;
    uint128 accruedToTreasury;
    uint128 virtualUnderlyingBalance;
  }

  struct AssetDataLegacy {
    AssetConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint40 lastUpdateTimestamp;
    uint16 id;
    address supplyTokenAddress;
    address borrowTokenAddress;
  }

  struct AssetConfigurationMap {
    uint256 data;
  }

  struct UserConfigurationMap {
    uint256 data;
  }

  struct CollateralConfig {
    uint16 ltv;
    uint16 liquidationThreshold;
    uint16 liquidationBonus;
  }

  enum InterestRateMode {
    NONE,
    VARIABLE
  }

  struct AssetState {
    uint256 currScaledVariableDebt;
    uint256 nextScaledVariableDebt;
    uint256 currLiquidityIndex;
    uint256 nextLiquidityIndex;
    uint256 currVariableBorrowIndex;
    uint256 nextVariableBorrowIndex;
    uint256 currLiquidityRate;
    uint256 currVariableBorrowRate;
    uint256 assetFactor;
    AssetConfigurationMap assetConfiguration;
    address supplyTokenAddress;
    address borrowTokenAddress;
    uint40 assetLastUpdateTimestamp;
  }

  struct ExecuteLiquidationCallParams {
    address liquidator;
    uint256 debtToCover;
    address collateralAsset;
    address debtAsset;
    address borrower;
    bool receiveSupplyToken;
    address priceOracle;
    address priceOracleSentinel;
    address interestRateStrategyAddress;
  }

  struct ExecuteSupplyParams {
    address user;
    address asset;
    address interestRateStrategyAddress;
    uint256 amount;
    address onBehalfOf;
    uint16 referralCode;
  }

  struct ExecuteBorrowParams {
    address asset;
    address user;
    address onBehalfOf;
    address interestRateStrategyAddress;
    uint256 amount;
    InterestRateMode interestRateMode;
    uint16 referralCode;
    bool releaseUnderlying;
    address oracle;
    address priceOracleSentinel;
  }

  struct ExecuteRepayParams {
    address asset;
    address user;
    address interestRateStrategyAddress;
    uint256 amount;
    InterestRateMode interestRateMode;
    address onBehalfOf;
    bool useSupplyTokens;
    address oracle;
  }

  struct ExecuteWithdrawParams {
    address user;
    address asset;
    address interestRateStrategyAddress;
    uint256 amount;
    address to;
    address oracle;
  }

  struct ExecuteEliminateDeficitParams {
    address user;
    address asset;
    address interestRateStrategyAddress;
    uint256 amount;
  }

  struct FinalizeTransferParams {
    address asset;
    address from;
    address to;
    uint256 scaledAmount;
    uint256 scaledBalanceFromBefore;
    uint256 scaledBalanceToBefore;
    address oracle;
  }

  struct CalculateUserAccountDataParams {
    UserConfigurationMap userConfig;
    address user;
    address oracle;
  }

  struct ValidateBorrowParams {
    AssetState assetState;
    UserConfigurationMap userConfig;
    address asset;
    address userAddress;
    uint256 amountScaled;
    InterestRateMode interestRateMode;
    address oracle;
    address priceOracleSentinel;
  }

  struct ValidateLiquidationCallParams {
    AssetState debtReserveCache;
    uint256 totalDebt;
    uint256 healthFactor;
    address priceOracleSentinel;
    address borrower;
    address liquidator;
  }

  struct CalculateInterestRatesParams {
    uint256 unbacked;
    uint256 liquidityAdded;
    uint256 liquidityTaken;
    uint256 totalDebt;
    uint256 assetFactor;
    address asset;
    bool usingVirtualBalance;
    uint256 virtualUnderlyingBalance;
  }

  struct InitPoolAssetParams {
    address asset;
    address supplyTokenAddress;
    address variableDebtAddress;
    uint16 assetsCount;
    uint16 maxNumberAssets;
  }
}
