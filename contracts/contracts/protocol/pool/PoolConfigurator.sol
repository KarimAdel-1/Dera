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
    require(IACLManager(_addressesProvider.getACLManager()).isPoolAdmin(msg.sender), Errors.CallerNotPoolAdmin());
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

  function initAssets(ConfiguratorInputTypes.InitAssetInput[] calldata input) external override onlyAssetListingOrPoolAdmins {
    IPool cachedPool = _pool;
    address interestRateStrategyAddress = cachedPool.RESERVE_INTEREST_RATE_STRATEGY();
    
    uint256 len = input.length;
    for (uint256 i; i < len; ) {
      ConfiguratorLogic.executeInitAsset(cachedPool, input[i]);
      emit AssetInterestRateDataChanged(input[i].underlyingAsset, interestRateStrategyAddress, input[i].interestRateData);
      unchecked { ++i; }
    }
  }

  function updateSupplyToken(ConfiguratorInputTypes.UpdateSupplyTokenInput calldata input) external override onlyPoolAdmin {
    ConfiguratorLogic.executeUpdateSupplyToken(_pool, input);
  }

  function updateBorrowToken(ConfiguratorInputTypes.UpdateDebtTokenInput calldata input) external override onlyPoolAdmin {
    ConfiguratorLogic.executeUpdateBorrowToken(_pool, input);
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
    require(ltv <= liquidationThreshold, Errors.InvalidReserveParams());
    
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);

    if (liquidationThreshold != 0) {
      require(liquidationBonus > PercentageMath.PERCENTAGE_FACTOR, Errors.InvalidReserveParams());
      require(liquidationThreshold.percentMul(liquidationBonus) <= PercentageMath.PERCENTAGE_FACTOR, Errors.InvalidReserveParams());
    } else {
      require(liquidationBonus == 0, Errors.InvalidReserveParams());
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
    require(freeze != currentConfig.getFrozen(), Errors.InvalidFreezeState());
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

  function setBorrowableInIsolation(address asset, bool borrowable) external override onlyRiskOrPoolAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    currentConfig.setBorrowableInIsolation(borrowable);
    _pool.setConfiguration(asset, currentConfig);
    emit BorrowableInIsolationChanged(asset, borrowable);
  }

  function setAssetPause(address asset, bool paused, uint40 gracePeriod) public override onlyEmergencyOrPoolAdmin {
    if (!paused && gracePeriod != 0) {
      require(gracePeriod <= MAX_GRACE_PERIOD, Errors.InvalidGracePeriod());
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
    require(newAssetFactor <= PercentageMath.PERCENTAGE_FACTOR, Errors.InvalidReserveFactor());
    
    _pool.syncIndexesState(asset);
    
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldAssetFactor = currentConfig.getAssetFactor();
    currentConfig.setAssetFactor(newAssetFactor);
    _pool.setConfiguration(asset, currentConfig);
    
    emit AssetFactorChanged(asset, oldAssetFactor, newAssetFactor);
    
    _pool.syncRatesState(asset);
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
    require(newFee <= PercentageMath.PERCENTAGE_FACTOR, Errors.InvalidLiquidationProtocolFee());
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldFee = currentConfig.getLiquidationProtocolFee();
    currentConfig.setLiquidationProtocolFee(newFee);
    _pool.setConfiguration(asset, currentConfig);
    emit LiquidationProtocolFeeChanged(asset, oldFee, newFee);
  }

  function setDebtCeiling(address asset, uint256 newDebtCeiling) external override onlyRiskOrPoolAdmins {
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    uint256 oldDebtCeiling = currentConfig.getDebtCeiling();
    if (currentConfig.getLiquidationThreshold() != 0 && oldDebtCeiling == 0) {
      _checkNoSuppliers(asset);
    }
    currentConfig.setDebtCeiling(newDebtCeiling);
    _pool.setConfiguration(asset, currentConfig);

    emit DebtCeilingChanged(asset, oldDebtCeiling, newDebtCeiling);
  }

  function setSiloedBorrowing(address asset, bool newSiloed) external override onlyRiskOrPoolAdmins {
    if (newSiloed) {
      _checkNoBorrowers(asset);
    }
    DataTypes.AssetConfigurationMap memory currentConfig = _pool.getConfiguration(asset);
    bool oldSiloed = currentConfig.getSiloedBorrowing();
    currentConfig.setSiloedBorrowing(newSiloed);
    _pool.setConfiguration(asset, currentConfig);
    emit SiloedBorrowingChanged(asset, oldSiloed, newSiloed);
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

  function getRevision() external pure virtual returns (uint256) {
    return CONFIGURATOR_REVISION();
  }

  function _checkNoSuppliers(address asset) internal view {
    DataTypes.AssetDataLegacy memory reserveData = _pool.getAssetData(asset);
    uint256 totalSupplied = IERC20(reserveData.supplyTokenAddress).totalSupply();
    require(totalSupplied == 0 && assetData.accruedToTreasury == 0, Errors.AssetLiquidityNotZero());
  }

  function _checkNoBorrowers(address asset) internal view {
    DataTypes.AssetDataLegacy memory reserveData = _pool.getAssetData(asset);
    uint256 totalDebt = IERC20(reserveData.borrowTokenAddress).totalSupply();
    require(totalDebt == 0, Errors.AssetDebtNotZero());
  }

  function _onlyPoolAdmin() internal view {
    require(IACLManager(_addressesProvider.getACLManager()).isPoolAdmin(msg.sender), Errors.CallerNotPoolAdmin());
  }

  function _onlyPoolOrEmergencyAdmin() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    require(aclManager.isPoolAdmin(msg.sender) || aclManager.isEmergencyAdmin(msg.sender), Errors.CallerNotPoolOrEmergencyAdmin());
  }

  function _onlyAssetListingOrPoolAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    require(aclManager.isAssetListingAdmin(msg.sender) || aclManager.isPoolAdmin(msg.sender), Errors.CallerNotAssetListingOrPoolAdmin());
  }

  function _onlyRiskOrPoolAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    require(aclManager.isRiskAdmin(msg.sender) || aclManager.isPoolAdmin(msg.sender), Errors.CallerNotRiskOrPoolAdmin());
  }

  function _onlyRiskOrPoolOrEmergencyAdmins() internal view {
    IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
    require(aclManager.isRiskAdmin(msg.sender) || aclManager.isPoolAdmin(msg.sender) || aclManager.isEmergencyAdmin(msg.sender), Errors.CallerNotRiskOrPoolOrEmergencyAdmins());
  }
}
