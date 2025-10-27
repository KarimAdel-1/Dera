// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {GPv2SafeERC20} from '../../../dependencies/gnosis/contracts/GPv2SafeERC20.sol';
import {Address} from '../../../dependencies/openzeppelin/contracts/Address.sol';
import {IERC20} from '../../../dependencies/openzeppelin/contracts/IERC20.sol';
import {IDToken} from '../../../interfaces/IDToken.sol';
import {IPool} from '../../../interfaces/IPool.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {TokenMath} from '../helpers/TokenMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {ValidationLogic} from './ValidationLogic.sol';
import {GenericLogic} from './GenericLogic.sol';

/**
 * @title PoolLogic library
 * @author Dera Protocol
 * @notice Pool utility functions (reserve init, treasury minting, state sync) on Hedera
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: Reserve data and configuration stored in contract storage
 * - HTS (Hedera Token Service): Token transfers use HTS precompile (0x167)
 * 
 * INTEGRATION:
 * - Reserve Init: Initialize new reserve with DToken and VariableDebtToken addresses
 * - Treasury Minting: Mint accrued fees to treasury (protocol revenue)
 * - State Sync: Update reserve indexes and interest rates
 * - Reserve Management: Drop reserves, reset isolation mode debt
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
  using ReserveLogic for DataTypes.ReserveData;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;

  IHTS private constant HTS = IHTS(address(0x167));
  uint256 private constant MAX_GRACE_PERIOD = 7 days;

  error HTSTransferFailed(address token, int64 responseCode);
  error GracePeriodTooLong();
  error GracePeriodInPast();

  function executeInitReserve(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.InitReserveParams memory params
  ) external returns (bool) {
    require(Address.isContract(params.asset), Errors.NotContract());
    reservesData[params.asset].init(params.dTokenAddress, params.variableDebtAddress);

    bool reserveAlreadyAdded = reservesData[params.asset].id != 0 || reservesList[0] == params.asset;
    require(!reserveAlreadyAdded, Errors.ReserveAlreadyAdded());

    for (uint16 i = 0; i < params.reservesCount; i++) {
      if (reservesList[i] == address(0)) {
        reservesData[params.asset].id = i;
        reservesList[i] = params.asset;
        return false;
      }
    }

    require(params.reservesCount < params.maxNumberReserves, Errors.NoMoreReservesAllowed());
    reservesData[params.asset].id = params.reservesCount;
    reservesList[params.reservesCount] = params.asset;
    return true;
  }

  function executeSyncIndexesState(DataTypes.ReserveData storage reserve) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);
  }

  function executeSyncRatesState(
    DataTypes.ReserveData storage reserve,
    address asset,
    address interestRateStrategyAddress
  ) external {
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateInterestRatesAndVirtualBalance(reserveCache, asset, 0, 0, interestRateStrategyAddress);
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
    mapping(address => DataTypes.ReserveData) storage reservesData,
    address[] calldata assets
  ) external {
    for (uint256 i = 0; i < assets.length; i++) {
      address assetAddress = assets[i];
      DataTypes.ReserveData storage reserve = reservesData[assetAddress];

      if (!reserve.configuration.getActive()) {
        continue;
      }

      uint256 accruedToTreasury = reserve.accruedToTreasury;

      if (accruedToTreasury != 0) {
        reserve.accruedToTreasury = 0;
        uint256 normalizedIncome = reserve.getNormalizedIncome();
        uint256 amountToMint = accruedToTreasury.getDTokenBalance(normalizedIncome);
        IDToken(reserve.dTokenAddress).mintToTreasury(accruedToTreasury, normalizedIncome);

        emit IPool.MintedToTreasury(assetAddress, amountToMint);
      }
    }
  }

  /**
   * @notice Set liquidation grace period for an asset
   * @param reservesData Reserves data mapping
   * @param asset Asset address
   * @param until Timestamp until which liquidations are paused
   * @dev SECURITY: Validates grace period is reasonable to prevent manipulation
   * @dev Maximum grace period: 7 days
   */
  function executeSetLiquidationGracePeriod(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    address asset,
    uint40 until
  ) external {
    if (until > block.timestamp + MAX_GRACE_PERIOD) revert GracePeriodTooLong();
    if (until < block.timestamp) revert GracePeriodInPast();
    
    reservesData[asset].liquidationGracePeriodUntil = until;
    emit IPool.LiquidationGracePeriodUpdated(asset, until);
  }

  function executeDropReserve(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    address asset
  ) external {
    DataTypes.ReserveData storage reserve = reservesData[asset];
    ValidationLogic.validateDropReserve(reservesList, reserve, asset);
    reservesList[reservesData[asset].id] = address(0);
    delete reservesData[asset];
  }

  function executeGetUserAccountData(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
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
    ) = GenericLogic.calculateUserAccountData(reservesData, reservesList, params);

    availableBorrowsBase = GenericLogic.calculateAvailableBorrows(totalCollateralBase, totalDebtBase, ltv);
  }
}
