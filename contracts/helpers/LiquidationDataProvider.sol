// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IDeraOracle} from '../../interfaces/IDeraOracle.sol';
import {IDeraSupplyToken} from '../../interfaces/IDeraSupplyToken.sol';
import {IDeraBorrowToken} from '../../interfaces/IDeraBorrowToken.sol';
import {DataTypes} from '../../protocol/libraries/types/DataTypes.sol';
import {ReserveConfiguration} from '../../protocol/libraries/configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../../protocol/libraries/configuration/UserConfiguration.sol';
import {WadRayMath} from '../../protocol/libraries/math/WadRayMath.sol';
import {PercentageMath} from '../../protocol/libraries/math/PercentageMath.sol';

/**
 * @title LiquidationDataProvider
 * @author DERA Protocol
 * @notice Finds liquidation opportunities for liquidators on Hedera
 * @dev Scans users to find undercollateralized positions
 * 
 * HEDERA TOOLS USED:
 * - Mirror Nodes: Liquidators query this contract via Mirror Node REST API for off-chain monitoring
 * - Hedera SDK: Used by liquidation bots to interact with contract and execute liquidations
 * - HCS (Hedera Consensus Service): All state changes logged as events on HCS
 * - Pyth Oracle: Real-time decentralized price feeds for liquidation calculations
 * 
 * INTEGRATION:
 * - Mirror Node API: GET /api/v1/contracts/{contractId}/results for historical liquidation data
 * - Hedera SDK: ContractExecuteTransaction for on-chain liquidation execution
 * - Query via: ContractCallQuery for real-time liquidatable position scanning
 * 
 * PERFORMANCE:
 * - Single call to find all liquidatable positions
 * - Liquidators run this off-chain via Mirror Nodes (no gas cost)
 * - Can be called by liquidation bots using Hedera SDK
 */
 
contract LiquidationDataProvider {
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  struct LiquidationData {
    address user;
    address collateralAsset;
    address debtAsset;
    uint256 collateralAmount;
    uint256 debtAmount;
    uint256 healthFactor;
    uint256 liquidationBonus;
  }

  /**
   * @notice Get liquidatable positions
   * @param provider PoolAddressesProvider address
   * @param users Array of user addresses to check
   * @return liquidations Array of liquidation opportunities
   * @dev Checks health factor < 1e18 (undercollateralized)
   * @dev Uses Pyth oracle for real-time prices
   */
  function getLiquidatablePositions(
    IPoolAddressesProvider provider,
    address[] calldata users
  ) external view returns (LiquidationData[] memory) {
    IPool pool = IPool(provider.getPool());
    IDeraOracle oracle = IDeraOracle(provider.getPriceOracle());
    
    // Temporary array (max size = users.length)
    LiquidationData[] memory tempLiquidations = new LiquidationData[](users.length);
    uint256 liquidationCount = 0;

    for (uint256 i = 0; i < users.length; i++) {
      address user = users[i];
      
      // Get user account data
      (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        ,
        uint256 currentLiquidationThreshold,
        ,
        uint256 healthFactor
      ) = pool.getUserAccountData(user);

      // Check if liquidatable (health factor < 1)
      if (healthFactor < 1e18 && healthFactor > 0) {
        // Find best collateral and debt assets
        (address collateralAsset, uint256 collateralAmount) = _getBestCollateral(
          pool,
          oracle,
          user
        );
        (address debtAsset, uint256 debtAmount) = _getLargestDebt(pool, oracle, user);

        if (collateralAsset != address(0) && debtAsset != address(0)) {
          DataTypes.ReserveConfigurationMap memory config = pool.getConfiguration(collateralAsset);
          (, , uint256 liquidationBonus, , ) = config.getParams();

          tempLiquidations[liquidationCount] = LiquidationData({
            user: user,
            collateralAsset: collateralAsset,
            debtAsset: debtAsset,
            collateralAmount: collateralAmount,
            debtAmount: debtAmount,
            healthFactor: healthFactor,
            liquidationBonus: liquidationBonus
          });
          liquidationCount++;
        }
      }
    }

    // Create final array with exact size
    LiquidationData[] memory liquidations = new LiquidationData[](liquidationCount);
    for (uint256 i = 0; i < liquidationCount; i++) {
      liquidations[i] = tempLiquidations[i];
    }

    return liquidations;
  }

  /**
   * @notice Check if single user is liquidatable
   * @param provider PoolAddressesProvider address
   * @param user User address
   * @return isLiquidatable True if health factor < 1
   * @return healthFactor User's health factor
   */
  function isUserLiquidatable(
    IPoolAddressesProvider provider,
    address user
  ) external view returns (bool isLiquidatable, uint256 healthFactor) {
    IPool pool = IPool(provider.getPool());
    (, , , , , healthFactor) = pool.getUserAccountData(user);
    isLiquidatable = healthFactor < 1e18 && healthFactor > 0;
  }

  /**
   * @notice Get best collateral asset for liquidation
   * @dev Returns asset with highest value
   */
  function _getBestCollateral(
    IPool pool,
    IDeraOracle oracle,
    address user
  ) internal view returns (address bestAsset, uint256 bestAmount) {
    address[] memory reserves = pool.getReservesList();
    uint256 maxValue = 0;

    for (uint256 i = 0; i < reserves.length; i++) {
      address asset = reserves[i];
      DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
      
      uint256 balance = IDeraSupplyToken(reserve.supplyTokenAddress).balanceOf(user);
      if (balance > 0) {
        uint256 price = oracle.getAssetPrice(asset);
        uint256 value = balance.wadMul(price);
        
        if (value > maxValue) {
          maxValue = value;
          bestAsset = asset;
          bestAmount = balance;
        }
      }
    }
  }

  /**
   * @notice Get largest debt asset
   * @dev Returns asset with highest debt value
   */
  function _getLargestDebt(
    IPool pool,
    IDeraOracle oracle,
    address user
  ) internal view returns (address largestAsset, uint256 largestAmount) {
    address[] memory reserves = pool.getReservesList();
    uint256 maxValue = 0;

    for (uint256 i = 0; i < reserves.length; i++) {
      address asset = reserves[i];
      DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
      
      uint256 debt = IDeraBorrowToken(reserve.borrowTokenAddress).balanceOf(user);
      if (debt > 0) {
        uint256 price = oracle.getAssetPrice(asset);
        uint256 value = debt.wadMul(price);
        
        if (value > maxValue) {
          maxValue = value;
          largestAsset = asset;
          largestAmount = debt;
        }
      }
    }
  }
}
