// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {AssetConfiguration} from '../libraries/configuration/AssetConfiguration.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {PercentageMath} from '../libraries/math/PercentageMath.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';
import {ConfiguratorInputTypes} from '../libraries/types/ConfiguratorInputTypes.sol';
import {IPoolConfigurator} from '../../interfaces/IPoolConfigurator.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {ConfiguratorLogic} from '../libraries/logic/ConfiguratorLogic.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IERC20Metadata} from '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';

/**
 * @title PoolConfigurator
 * @author Dera
 * @notice Configuration methods for the protocol on Hedera
 * 
 * HEDERA TOOLS USED:
 * - HCS (Hedera Consensus Service): All configuration events logged to HCS for governance transparency
 * - Hedera SDK: Admin operations executed via Hedera SDK with proper key signatures
 * 
 * INTEGRATION:
 * - HCS Events: Configuration changes emitted as events, relayed to HCS off-chain for audit trail
 * - Hedera SDK: Admins use SDK to sign and submit configuration transactions
 * - All events include asset/parameter details for Mirror Node indexing
 */
abstract contract PoolConfigurator is VersionedInitializable, IPoolConfigurator {
  using PercentageMath for uint256;
  using AssetConfiguration for DataTypes.AssetConfigurationMap;

  IPoolAddressesProvider internal _addressesProvider;
  IPool internal _pool;

  modifier onlyPoolAdmin() {
    if (!IACLManager(_addressesProvider.getACLManager()).isPoolAdmin(msg.sender)) revert Errors.CallerNotPoolAdmin();
    _;
  }

  modifier onlyEmergencyOrPoolAdmin() {
    _onlyPoolOrEmergencyAdmin();
    _;
  }

  modifier onlyAssetListingOrPoolAdmins() {
    _onlyAssetListingOrPoolAdmins();
    _;
  }

  modifier onlyRiskOrPoolAdmins() {
    _onlyRiskOrPoolAdmins();
    _;
  }

  modifier onlyRiskOrPoolOrEmergencyAdmins() {
    _onlyRiskOrPoolOrEmergencyAdmins();
    _;
  }

  mapping(address => uint256) internal _pendingLtv;
  uint40 public constant MAX_GRACE_PERIOD = 4 hours;

  function initialize(IPoolAddressesProvider provider) public virtual;

  /**
   * @notice Finalize initialization of an asset by registering tokens in the Pool and applying configuration
   * @dev This is split out from `initAssets` to avoid single-transaction gas / stack limits when creating proxies
   */
  function finalizeInitAsset(address underlyingAsset, address dTokenProxy, address variableDebtProxy, uint8 decimals) external virtual;

  function initAssets(ConfiguratorInputTypes.InitAssetInput[] calldata input) external override onlyAssetListingOrPoolAdmins {
    IPool cachedPool = _pool;
    address interestRateStrategyAddress = cachedPool.RESERVE_INTEREST_RATE_STRATEGY();

    uint256 len = input.length;
    for (uint256 i; i < len; ) {
      uint8 decimals = _getAssetDecimals(input[i].underlyingAsset, input[i].params);

      // Extract struct creation to separate variable to reduce stack depth with viaIR
      ConfiguratorLogic.InitAssetInput memory assetInput = ConfiguratorLogic.InitAssetInput({
        supplyTokenImpl: input[i].supplyTokenImpl,
        variableDebtTokenImpl: input[i].variableDebtTokenImpl,
        underlyingAsset: input[i].underlyingAsset,
        interestRateStrategyAddress: interestRateStrategyAddress,
        underlyingAssetDecimals: decimals,
        supplyTokenName: input[i].supplyTokenName,
        supplyTokenSymbol: input[i].supplyTokenSymbol,
        variableDebtTokenName: input[i].variableDebtTokenName,
        variableDebtTokenSymbol: input[i].variableDebtTokenSymbol,
        params: input[i].params
      });

      ConfiguratorLogic.executeInitAsset(cachedPool, assetInput);
      emit AssetInterestRateDataChanged(input[i].underlyingAsset, interestRateStrategyAddress, "");
      unchecked { ++i; }
    }
  }

  function updateSupplyToken(ConfiguratorInputTypes.UpdateSupplyTokenInput calldata input) external override onlyPoolAdmin {
    ConfiguratorLogic.UpdateSupplyTokenInput memory updateInput = ConfiguratorLogic.UpdateSupplyTokenInput({
      asset: input.asset,
      implementation: input.implementation,
      name: input.name,
      symbol: input.symbol,
      params: input.params
    });
    ConfiguratorLogic.executeUpdateSupplyToken(_pool, updateInput);
  }

  function updateBorrowToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input) external override onlyPoolAdmin {
    ConfiguratorLogic.UpdateDebtTokenInput memory updateInput = ConfiguratorLogic.UpdateDebtTokenInput({
      asset: input.asset,
      implementation: input.implementation,
      name: input.name,
      symbol: input.symbol,
      params: input.params
    });
    ConfiguratorLogic.executeUpdateBorrowToken(_pool, updateInput);
  }

  function dropAsset(address asset) external override onlyPoolAdmin {
    _pool.dropAsset(asset);
    emit AssetDropped(asset);
  }

  function setAssetBorrowing(address asset, bool enabled) external override onlyRiskOrPoolAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowingEnabled(enabled);
    _pool.setConfiguration(asset, currentConfig);
    emit AssetBorrowing(asset, enabled);
  }

  function configureAssetAsCollateral(address asset, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus) external override onlyRiskOrPoolAdmins {
    if (ltv > liquidationThreshold) revert Errors.InvalidReserveParams();
    
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    if (liquidationThreshold != 0) {
      if (liquidationBonus <= PercentageMath.PERCENTAGE_FACTOR) revert Errors.InvalidReserveParams();
      if (liquidationThreshold.percentMul(liquidationBonus) > PercentageMath.PERCENTAGE_FACTOR) revert Errors.InvalidReserveParams();
    } else {
      if (liquidationBonus != 0) revert Errors.InvalidReserveParams();
      _checkNoSuppliers(asset);
    }

    uint256 newLtv = ltv;
    if (currentConfig.getFrozen()) {
      _pendingLtv[asset] = ltv;
      newLtv = 0;
      emit PendingLtvChanged(asset, ltv);
    } else {
      currentConfig.setLtv(ltv);
    }

    currentConfig.setLiquidationThreshold(liquidationThreshold);
    currentConfig.setLiquidationBonus(liquidationBonus);

    _pool.setConfiguration(asset, currentConfig);

    emit CollateralConfigurationChanged(asset, newLtv, liquidationThreshold, liquidationBonus);
  }



  function setAssetActive(address asset, bool active) external override onlyPoolAdmin {
    if (!active) _checkNoSuppliers(asset);
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setActive(active);
    _pool.setConfiguration(asset, currentConfig);
    emit AssetActive(asset, active);
  }

  function setAssetFreeze(address asset, bool freeze) external override onlyRiskOrPoolOrEmergencyAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    if (freeze == currentConfig.getFrozen()) revert Errors.InvalidFreezeState();
    currentConfig.setFrozen(freeze);

    uint256 ltvSet;
    uint256 pendingLtvSet;

    if (freeze) {
      pendingLtvSet = currentConfig.getLtv();
      _pendingLtv[asset] = pendingLtvSet;
      currentConfig.setLtv(0);
    } else {
      ltvSet = _pendingLtv[asset];
      currentConfig.setLtv(ltvSet);
      delete _pendingLtv[asset];
    }

    emit PendingLtvChanged(asset, pendingLtvSet);
    emit CollateralConfigurationChanged(asset, ltvSet, currentConfig.getLiquidationThreshold(), currentConfig.getLiquidationBonus());

    _pool.setConfiguration(asset, currentConfig);
    emit AssetFrozen(asset, freeze);
  }

  function setAssetPause(address asset, bool paused, uint40 gracePeriod) public override onlyEmergencyOrPoolAdmin {
    if (!paused && gracePeriod != 0) {
      if (gracePeriod > MAX_GRACE_PERIOD) revert Errors.InvalidGracePeriod();
      uint40 until = uint40(block.timestamp) + gracePeriod;
      _pool.setLiquidationGracePeriod(asset, until);
      emit LiquidationGracePeriodChanged(asset, until);
    }

    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setPaused(paused);
    _pool.setConfiguration(asset, currentConfig);
    emit AssetPaused(asset, paused);
  }

  function setAssetPause(address asset, bool paused) external override onlyEmergencyOrPoolAdmin {
    setAssetPause(asset, paused, 0);
  }

  function disableLiquidationGracePeriod(address asset) external override onlyEmergencyOrPoolAdmin {
    _pool.setLiquidationGracePeriod(asset, 0);
    emit LiquidationGracePeriodDisabled(asset);
  }

  function setAssetFactor(address asset, uint256 newAssetFactor) external override onlyRiskOrPoolAdmins {
    if (newAssetFactor > PercentageMath.PERCENTAGE_FACTOR) revert Errors.InvalidReserveFactor();
    
    _pool.syncIndexesState(asset);
    
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldAssetFactor = currentConfig.getAssetFactor();
    currentConfig.setAssetFactor(newAssetFactor);
    _pool.setConfiguration(asset, currentConfig);
    
    emit AssetFactorChanged(asset, oldAssetFactor, newAssetFactor);
    
    _pool.syncRatesState(asset);
  }

  function setAssetInterestRateData(address asset, bytes calldata rateData) external virtual override onlyRiskOrPoolAdmins {
    emit AssetInterestRateDataChanged(asset, address(0), rateData);
  }

  function setBorrowCap(address asset, uint256 newBorrowCap) external override onlyRiskOrPoolAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldBorrowCap = currentConfig.getBorrowCap();
    currentConfig.setBorrowCap(newBorrowCap);
    _pool.setConfiguration(asset, currentConfig);
    emit BorrowCapChanged(asset, oldBorrowCap, newBorrowCap);
  }

  function setSupplyCap(address asset, uint256 newSupplyCap) external override onlyRiskOrPoolAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldSupplyCap = currentConfig.getSupplyCap();
    currentConfig.setSupplyCap(newSupplyCap);
    _pool.setConfiguration(asset, currentConfig);
    emit SupplyCapChanged(asset, oldSupplyCap, newSupplyCap);
  }

  function setLiquidationProtocolFee(address asset, uint256 newFee) external override onlyRiskOrPoolAdmins {
    if (newFee > PercentageMath.PERCENTAGE_FACTOR) revert Errors.InvalidLiquidationProtocolFee();
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldFee = currentConfig.getLiquidationProtocolFee();
    currentConfig.setLiquidationProtocolFee(newFee);
    _pool.setConfiguration(asset, currentConfig);
    emit LiquidationProtocolFeeChanged(asset, oldFee, newFee);
  }

  function setPoolPause(bool paused, uint40 gracePeriod) public override onlyEmergencyOrPoolAdmin {
    address[] memory reserves = _pool.getAssetsList();
    uint256 len = reserves.length;
    for (uint256 i; i < len; ) {
      if (reserves[i] != address(0)) {
        setAssetPause(reserves[i], paused, gracePeriod);
      }
      unchecked { ++i; }
    }
  }

  function setPoolPause(bool paused) external override onlyEmergencyOrPoolAdmin {
    setPoolPause(paused, 0);
  }



  function getPendingLtv(address asset) external view override returns (uint256) {
    return _pendingLtv[asset];
  }

  function getConfiguratorLogic() external pure returns (address) {
    return address(ConfiguratorLogic);
  }

  function CONFIGURATOR_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() internal pure virtual override returns (uint256) {
    return CONFIGURATOR_REVISION();
  }

  /**
   * @notice Extract decimals from asset or params
   * @dev Separated to reduce stack depth in initAssets loop
   * @param asset The underlying asset address
   * @param params ABI-encoded params that may contain decimals
   * @return decimals The asset decimals (default 18)
   */
  function _getAssetDecimals(address asset, bytes calldata params) internal view returns (uint8) {
    // Try to get decimals from token contract
    try IERC20Metadata(asset).decimals() returns (uint8 d) {
      return d;
    } catch {
      // Fallback: decode from params if available
      if (params.length >= 32) {
        return abi.decode(params, (uint8));
      }
      return 18; // Default
    }
  }

  function _checkNoSuppliers(address asset) internal view {
    DataTypes.AssetDataLegacy memory reserveData = _pool.getAssetData(asset);
    uint256 totalSupplied = IERC20(reserveData.supplyTokenAddress).totalSupply();
    if (totalSupplied != 0) revert Errors.AssetLiquidityNotZero();
  }

  function _checkNoBorrowers(address asset) internal view {
    DataTypes.AssetDataLegacy memory reserveData = _pool.getAssetData(asset);
    uint256 totalDebt = IERC20(reserveData.borrowTokenAddress).totalSupply();
    if (totalDebt != 0) revert Errors.AssetDebtNotZero();
  }

  function _onlyPoolAdmin() internal view {
    if (!IACLManager(_addressesProvider.getACLManager()).isPoolAdmin(msg.sender)) revert Errors.CallerNotPoolAdmin();
  }

  function _onlyPoolOrEmergencyAdmin() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    if (!aclManager.isPoolAdmin(msg.sender) && !aclManager.isEmergencyAdmin(msg.sender)) revert Errors.CallerNotPoolOrEmergencyAdmin();
  }

  function _onlyAssetListingOrPoolAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    if (!aclManager.isAssetListingAdmin(msg.sender) && !aclManager.isPoolAdmin(msg.sender)) revert Errors.CallerNotAssetListingOrPoolAdmin();
  }

  function _onlyRiskOrPoolAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    if (!aclManager.isRiskAdmin(msg.sender) && !aclManager.isPoolAdmin(msg.sender)) revert Errors.CallerNotRiskOrPoolAdmin();
  }

  function _onlyRiskOrPoolOrEmergencyAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    if (!aclManager.isRiskAdmin(msg.sender) && !aclManager.isPoolAdmin(msg.sender) && !aclManager.isEmergencyAdmin(msg.sender)) revert Errors.CallerNotRiskOrPoolOrEmergencyAdmin();
  }
}
