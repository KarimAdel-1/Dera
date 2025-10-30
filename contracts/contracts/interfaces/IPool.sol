// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPoolAddressesProvider} from './IPoolAddressesProvider.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

/**
 * @title IPool
 * @author Dera Protocol
 * @notice Defines the basic interface for a Dera Pool
 */
interface IPool {
  event Supply(address indexed asset, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode);
  event Withdraw(address indexed asset, address indexed user, address indexed to, uint256 amount);
  event Borrow(address indexed asset, address user, address indexed onBehalfOf, uint256 amount, DataTypes.InterestRateMode interestRateMode, uint256 borrowRate, uint16 indexed referralCode);
  event Repay(address indexed asset, address indexed user, address indexed repayer, uint256 amount, bool useSupplyTokens);
  event AssetUsedAsCollateralEnabled(address indexed reserve, address indexed user);
  event AssetUsedAsCollateralDisabled(address indexed reserve, address indexed user);

  event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveSupplyToken);
  event AssetDataUpdated(address indexed asset, uint256 liquidityRate, uint256 stableBorrowRate, uint256 variableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex);
  event DeficitCovered(address indexed asset, address caller, uint256 amountCovered);
  event MintedToTreasury(address indexed asset, uint256 amountMinted);
  event LiquidationGracePeriodUpdated(address indexed asset, uint40 until);
  event DeficitCreated(address indexed user, address indexed debtAsset, uint256 amountCreated);
  event PositionManagerApproved(address indexed user, address indexed positionManager);
  event PositionManagerRevoked(address indexed user, address indexed positionManager);

  function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
  function supplyWithPermit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode, uint256 deadline, uint8 permitV, bytes32 permitR, bytes32 permitS) external;
  function withdraw(address asset, uint256 amount, address to) external returns (uint256);
  function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
  function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
  function repayWithPermit(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf, uint256 deadline, uint8 permitV, bytes32 permitR, bytes32 permitS) external returns (uint256);
  function repayWithSupplyTokens(address asset, uint256 amount, uint256 interestRateMode) external returns (uint256);
  function setUserUseAssetAsCollateral(address asset, bool useAsCollateral) external;
  function liquidationCall(address collateralAsset, address debtAsset, address borrower, uint256 debtToCover, bool receiveSupplyToken) external;

  function getUserAccountData(address user) external view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor);
  function initAsset(address asset, address supplyTokenAddress, address variableDebtAddress) external;
  function dropAsset(address asset) external;
  function syncIndexesState(address asset) external;
  function syncRatesState(address asset) external;
  function setConfiguration(address asset, DataTypes.AssetConfigurationMap calldata configuration) external;
  function getConfiguration(address asset) external view returns (DataTypes.AssetConfigurationMap memory);
  function getUserConfiguration(address user) external view returns (DataTypes.UserConfigurationMap memory);
  function getAssetNormalizedIncome(address asset) external view returns (uint256);
  function getAssetNormalizedVariableDebt(address asset) external view returns (uint256);
  function getAssetData(address asset) external view returns (DataTypes.AssetDataLegacy memory);
  function getVirtualUnderlyingBalance(address asset) external view returns (uint128);
  function finalizeTransfer(address asset, address from, address to, uint256 scaledAmount, uint256 scaledBalanceFromBefore, uint256 scaledBalanceToBefore) external;
  function getAssetsList() external view returns (address[] memory);
  function getAssetsCount() external view returns (uint256);
  function getAssetAddressById(uint16 id) external view returns (address);
  function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider);
  function RESERVE_INTEREST_RATE_STRATEGY() external view returns (address);

  function setLiquidationGracePeriod(address asset, uint40 until) external;
  function getLiquidationGracePeriod(address asset) external view returns (uint40);

  function MAX_NUMBER_RESERVES() external view returns (uint16);
  function mintToTreasury(address[] calldata assets) external;
  function rescueTokens(address token, address to, uint256 amount) external;
  function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
  function eliminateAssetDeficit(address asset, uint256 amount) external returns (uint256);
  function approvePositionManager(address positionManager, bool approve) external;
  function renouncePositionManagerRole(address user) external;
  function setUserUseAssetAsCollateralOnBehalfOf(address asset, bool useAsCollateral, address onBehalfOf) external;
  function isApprovedPositionManager(address user, address positionManager) external view returns (bool);
  function getAssetDeficit(address asset) external view returns (uint256);
  function getAssetSupplyToken(address asset) external view returns (address);
  function getAssetBorrowToken(address asset) external view returns (address);

  function getBorrowLogic() external pure returns (address);
  function getLiquidationLogic() external pure returns (address);
  function getPoolLogic() external pure returns (address);
  function getSupplyLogic() external pure returns (address);
}
