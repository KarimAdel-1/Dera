// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../../../interfaces/IPool.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ValidationLogic} from './ValidationLogic.sol';

/**
 * @title EModeLogic library
 * @author Dera Protocol
 * @notice Efficiency mode (E-Mode) logic for correlated assets on Hedera
 * 
 * HEDERA TOOLS USED:
 * - Smart Contract State: E-Mode categories and user assignments stored in contract storage
 * 
 * INTEGRATION:
 * - E-Mode: Allows higher LTV/liquidation thresholds for correlated assets (e.g., stablecoins)
 * - Validation: Health factor checked when entering/exiting E-Mode
 * - Categories: Each E-Mode category has specific LTV, liquidation threshold, and price oracle
 * 
 * EXAMPLE:
 * - Stablecoin E-Mode: USDC, USDT, DAI can have 97% LTV instead of 80%
 * - User must only borrow/supply assets within same E-Mode category
 */
library EModeLogic {
  function executeSetUserEMode(
    mapping(address => DataTypes.ReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    mapping(address => uint8) storage usersEModeCategory,
    DataTypes.UserConfigurationMap storage userConfig,
    address user,
    address oracle,
    uint8 categoryId
  ) external {
    if (usersEModeCategory[user] == categoryId) return;

    ValidationLogic.validateSetUserEMode(eModeCategories, userConfig, categoryId);

    usersEModeCategory[user] = categoryId;

    ValidationLogic.validateHealthFactor(
      reservesData,
      reservesList,
      eModeCategories,
      userConfig,
      user,
      categoryId,
      oracle
    );
    
    emit IPool.UserEModeSet(user, categoryId);
  }
}
