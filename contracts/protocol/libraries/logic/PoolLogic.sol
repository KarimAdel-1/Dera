// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {GPv2SafeERC20} from '../../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {Address} from '../../../dependencies/openzeppelin/contracts/Address.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IDeraSupplyToken} from '../../../interfaces/IDeraSupplyToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {AssetConfiguration} from '../configuration/AssetConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {AssetLogic} from './AssetLogic.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {GenericLogic} from './GenericLogic.sol';

/**
 * @title PoolLogic library
 * @author Dera Protocol
 * @notice Pool utility functions (asset init, treasury minting, state sync) on Hedera
 *
 * HEDERA TOOLS USED:
 * - Smart Contract State: Pool asset data and configuration stored in contract storage
 * - HTS (Hedera Token Service): Token transfers use HTS precompile (0x167)
 *
 * INTEGRATION:
 * - Asset Init: Initialize new pool asset with DeraSupplyToken and DeraBorrowToken addresses
 * - Treasury Minting: Mint accrued fees to treasury (protocol revenue)
 * - State Sync: Update asset indexes and interest rates
 * - Asset Management: Drop assets, reset isolation mode debt
 * 
 * SAFETY:
 * - Validation: Checks reserve not already added, max reserves not exceeded
 * - Treasury: Only mints accrued fees, not arbitrary amounts
 */
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
}

library PoolLogic {
  using GPv2SafeERC20 for IERC20;
  using TokenMath for uint256;
  using AssetLogic for DataTypes.PoolAssetData;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;

  IHTS private constant HTS = IHTS(address(0x167));
  uint256 private constant MAX_GRACE_PERIOD = 7 days;

  error HTSTransferFailed(address token, int64 responseCode);
  error GracePeriodTooLong();
  error GracePeriodInPast();

  function executeInitAsset(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.InitPoolAssetParams memory params
  ) external returns (bool) {
    require(Address.isContract(params.asset), Errors.NotContract());
    poolAssets[params.asset].init(params.supplyTokenAddress, params.variableDebtAddress);

    bool assetAlreadyAdded = poolAssets[params.asset].id != 0 || assetsList[0] == params.asset;
    require(!assetAlreadyAdded, Errors.AssetAlreadyAdded());

    for (uint16 i = 0; i < params.assetsCount; i++) {
      if (assetsList[i] == address(0)) {
        poolAssets[params.asset].id = i;
        assetsList[i] = params.asset;
        return false;
      }
    }

    require(params.assetsCount < params.maxNumberAssets, Errors.NoMoreReservesAllowed());
    poolAssets[params.asset].id = params.assetsCount;
    assetsList[params.assetsCount] = params.asset;
    return true;
  }

  function executeSyncIndexesState(DataTypes.PoolAssetData storage asset) external {
    DataTypes.AssetState memory assetState = asset.cache();
    asset.updateState(assetState);
  }

  function executeSyncRatesState(
    DataTypes.PoolAssetData storage asset,
    address asset,
    address interestRateStrategyAddress
  ) external {
    DataTypes.AssetState memory assetState = asset.cache();
    asset.updateInterestRatesAndVirtualBalance(assetState, asset, 0, 0, interestRateStrategyAddress);
  }

  /**
   * @notice Rescue tokens stuck in pool (HTS-compatible)
   * @param token Token address to rescue
   * @param to Recipient address
   * @param amount Amount to rescue
   * @dev Uses HTS precompile for native Hedera tokens
   */
  function executeRescueTokens(address token, address to, uint256 amount) external {
    require(amount <= uint256(type(int64).max), "Amount exceeds int64");
    int64 result = HTS.transferToken(token, address(this), to, int64(uint64(amount)));
    if (result != 0) revert HTSTransferFailed(token, result);
  }

  function executeMintToTreasury(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    address[] calldata assets
  ) external {
    for (uint256 i = 0; i < assets.length; i++) {
      address assetAddress = assets[i];
      DataTypes.PoolAssetData storage asset = poolAssets[assetAddress];

      if (!asset.configuration.getActive()) {
        continue;
      }

      uint256 accruedToTreasury = asset.accruedToTreasury;

      if (accruedToTreasury != 0) {
        asset.accruedToTreasury = 0;
        uint256 normalizedIncome = asset.getNormalizedIncome();
        uint256 amountToMint = accruedToTreasury.getSupplyTokenBalance(normalizedIncome);
        IDeraSupplyToken(asset.supplyTokenAddress).mintToTreasury(accruedToTreasury, normalizedIncome);

        emit IPool.MintedToTreasury(assetAddress, amountToMint);
      }
    }
  }

  /**
   * @notice Set liquidation grace period for an asset
   * @param poolAssets Reserves data mapping
   * @param asset Asset address
   * @param until Timestamp until which liquidations are paused
   * @dev SECURITY: Validates grace period is reasonable to prevent manipulation
   * @dev Maximum grace period: 7 days
   */
  function executeSetLiquidationGracePeriod(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    address asset,
    uint40 until
  ) external {
    if (until > block.timestamp + MAX_GRACE_PERIOD) revert GracePeriodTooLong();
    if (until < block.timestamp) revert GracePeriodInPast();
    
    poolAssets[asset].liquidationGracePeriodUntil = until;
    emit IPool.LiquidationGracePeriodUpdated(asset, until);
  }

  function executeDropAsset(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    address asset
  ) external {
    DataTypes.PoolAssetData storage asset = poolAssets[asset];
    ValidationLogic.validateDropAsset(assetsList, asset, asset);
    assetsList[poolAssets[asset].id] = address(0);
    delete poolAssets[asset];
  }

  function executeGetUserAccountData(
    mapping(address => DataTypes.PoolAssetData) storage poolAssets,
    mapping(uint256 => address) storage assetsList,
    DataTypes.CalculateUserAccountDataParams memory params
  )
    external
    view
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 availableBorrowsBase,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor
    )
  {
    (
      totalCollateralBase,
      totalDebtBase,
      ltv,
      currentLiquidationThreshold,
      healthFactor,
    ) = GenericLogic.calculateUserAccountData(poolAssets, assetsList, params);

    availableBorrowsBase = GenericLogic.calculateAvailableBorrows(totalCollateralBase, totalDebtBase, ltv);
  }
}
