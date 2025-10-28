// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Multicall} from '../../../dependencies/openzeppelin/contracts/Multicall.sol';
import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {ReserveConfiguration} from '../libraries/configuration/ReserveConfiguration.sol';
import {PoolLogic} from '../libraries/logic/PoolLogic.sol';
import {ReserveLogic} from '../libraries/logic/ReserveLogic.sol';
import {SupplyLogic} from '../libraries/logic/SupplyLogic.sol';
import {BorrowLogic} from '../libraries/logic/BorrowLogic.sol';
import {LiquidationLogic} from '../libraries/logic/LiquidationLogic.sol';
import {DataTypes} from '../libraries/types/DataTypes.sol';


// HTS precompile interface for native Hedera token operations
interface IHTS {
  function transferToken(address token, address sender, address recipient, int64 amount) external returns (int64);
  function approve(address token, address spender, uint256 amount) external returns (int64);
  function balanceOf(address token, address account) external view returns (uint256);
  function getTokenInfo(address token) external view returns (string memory, string memory, uint8, uint64);
}

// HCS topic identifiers for off-chain event relay
library HCSTopics {
  function SUPPLY_TOPIC() internal pure returns(bytes32) { return keccak256("DERA_SUPPLY"); }
  function WITHDRAW_TOPIC() internal pure returns(bytes32) { return keccak256("DERA_WITHDRAW"); }
  function BORROW_TOPIC() internal pure returns(bytes32) { return keccak256("DERA_BORROW"); }
  function REPAY_TOPIC() internal pure returns(bytes32) { return keccak256("DERA_REPAY"); }
  function LIQUIDATION_TOPIC() internal pure returns(bytes32) { return keccak256("DERA_LIQUIDATION"); }
}
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IReserveInterestRateStrategy} from '../../interfaces/IReserveInterestRateStrategy.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {PoolStorage} from './PoolStorage.sol';

/**
 * @title Pool contract
 * @author Dera
 * @notice Main protocol entry point for lending/borrowing on Hedera
 * 
 * HEDERA TOOLS USED:
 * - HTS (Hedera Token Service): All token operations use HTS native tokens via precompile 0x167
 * - HCS (Hedera Consensus Service): Events emitted on-chain, relayed to HCS off-chain via Hedera SDK
 * - Mirror Nodes: Historical transaction data queryable via Mirror Node REST API
 * 
 * INTEGRATION:
 * - HTS: Token transfers delegated to SupplyLogic, BorrowLogic, LiquidationLogic using HTS precompile
 *   • IMPORTANT: Both sender and receiver must be associated with HTS tokens before transfers
 *   • Token association required for testnet/mainnet operations
 * - HCS Approach: Solidity events emitted on-chain → Off-chain service reads events → Publishes to HCS topics
 *   • Events include hcsTopic field for automatic routing by off-chain relay service
 *   • Microservice pattern: Listen to contract events → Parse hcsTopic → Submit to HCS
 * - Mirror Node API: GET /api/v1/contracts/{contractId}/results for transaction history and analytics
 * - All token operations use HTS precompile for native Hedera token handling
 * - No ERC20 permit pattern - HTS uses native approval mechanism
 * 
 * UPGRADEABILITY:
 * - Uses VersionedInitializable pattern for proxy upgrades
 * - POOL_REVISION tracks contract version
 * - PoolUpgraded event emitted on initialization
 */
abstract contract Pool is VersionedInitializable, PoolStorage, IPool, Multicall {
  using ReserveLogic for DataTypes.ReserveData;

  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  address public immutable RESERVE_INTEREST_RATE_STRATEGY;
  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile

  // Custom errors for HTS
  error HTSError(int64 responseCode, string operation);
  error InvalidAmount();
  error ReentrancyGuard();
  error AmountExceedsInt64();


  // Reentrancy guard
  uint256 private _status = 1;
  modifier nonReentrant() {
    if (_status == 2) revert ReentrancyGuard();
    _status = 2;
    _;
    _status = 1;
  }

  // HTS amount conversion with safety check
  function _toInt64Checked(uint256 amount) internal pure returns (int64) {
    if (amount > uint256(type(int64).max)) revert AmountExceedsInt64();
    return int64(uint64(amount));
  }

  // HTS safety wrapper - used by logic libraries for token transfers
  // Note: Actual HTS transfers delegated to SupplyLogic, BorrowLogic, LiquidationLogic
  function _safeHTSTransfer(address token, address from, address to, uint256 amount) internal returns (bool) {
    int64 result = HTS.transferToken(token, from, to, _toInt64Checked(amount));
    if (result != 0) revert HTSError(result, "transferToken");
    return true;
  }

  function _getTokenDecimals(address token) internal view returns (uint8) {
    try HTS.getTokenInfo(token) returns (string memory, string memory, uint8 decimals, uint64) {
      return decimals;
    } catch {
      return 18; // Default fallback
    }
  }

  function _safeHTSBalanceOf(address token, address account) internal returns (uint256) {
    try HTS.balanceOf(token, account) returns (uint256 balance) {
      return balance;
    } catch {
      emit HTSErrorHandled(token, account, "balanceOf", -1);
      return 0;
    }
  }

  // Events for HCS relay and Mirror Node indexing
  event Supply(address indexed user, address indexed asset, uint256 amount, address indexed onBehalfOf, uint16 referralCode, bytes32 hcsTopic);
  event Withdraw(address indexed user, address indexed asset, uint256 amount, address indexed to, bytes32 hcsTopic);
  event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, address indexed onBehalfOf, uint16 referralCode, bytes32 hcsTopic);
  event Repay(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, address indexed onBehalfOf, bytes32 hcsTopic);
  event LiquidationCall(address indexed liquidator, address indexed borrower, address collateralAsset, address debtAsset, uint256 debtToCover, bool receiveSupplyToken, bytes32 hcsTopic);
  event HTSErrorHandled(address indexed token, address indexed account, string operation, int64 responseCode);
  event PoolUpgraded(uint256 version);
  event HBARReceived(address indexed sender, uint256 amount);

  modifier onlyPoolConfigurator() {
    require(ADDRESSES_PROVIDER.getPoolConfigurator() == _msgSender(), Errors.CallerNotPoolConfigurator());
    _;
  }

  modifier onlyPoolAdmin() {
    require(IACLManager(ADDRESSES_PROVIDER.getACLManager()).isPoolAdmin(_msgSender()), Errors.CallerNotPoolAdmin());
    _;
  }

  modifier onlyEmergencyAdmin() {
    require(IACLManager(ADDRESSES_PROVIDER.getACLManager()).isEmergencyAdmin(_msgSender()), Errors.CallerNotPoolOrEmergencyAdmin());
    _;
  }

  modifier whenNotPaused() {
    require(!_paused, Errors.ProtocolPaused());
    _;
  }

  constructor(IPoolAddressesProvider provider, IReserveInterestRateStrategy interestRateStrategy) {
    ADDRESSES_PROVIDER = provider;
    require(address(interestRateStrategy) != address(0), Errors.ZeroAddressNotValid());
    RESERVE_INTEREST_RATE_STRATEGY = address(interestRateStrategy);
  }

  function initialize(IPoolAddressesProvider provider) external virtual;

  /**
   * @notice Supply assets to the pool
   * @dev HTS requires both sender and receiver to be associated with the token
   * @param asset The HTS token address
   * @param amount Amount to supply (must be within int64 range for HTS)
   * @param onBehalfOf Address receiving the dTokens
   * @param referralCode Referral code for tracking
   */
  function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) public virtual override nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    require(_reserves[asset].id != 0 || _reservesList[0] == asset, Errors.AssetNotListed());
    
    SupplyLogic.executeSupply(
      _reserves,
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        user: _msgSender(),
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );
    emit Supply(_msgSender(), asset, amount, onBehalfOf, referralCode, HCSTopics.SUPPLY_TOPIC());
  }

  // Removed: supplyWithPermit - HTS tokens don't use ERC20 permit pattern

  function withdraw(address asset, uint256 amount, address to) public virtual override nonReentrant whenNotPaused returns (uint256) {
    uint256 withdrawn = SupplyLogic.executeWithdraw(
      _reserves,
      _reservesList,
      _usersConfig[_msgSender()],
      DataTypes.ExecuteWithdrawParams({
        user: _msgSender(),
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        to: to,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
    emit Withdraw(_msgSender(), asset, withdrawn, to, HCSTopics.WITHDRAW_TOPIC());
    return withdrawn;
  }

  /**
   * @notice Borrow assets from the pool
   * @dev HTS requires borrower to be associated with the token
   * @param asset The HTS token address
   * @param amount Amount to borrow
   * @param interestRateMode Interest rate mode (variable only)
   * @param referralCode Referral code for tracking
   * @param onBehalfOf Address receiving the borrowed tokens
   */
  function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) public virtual override nonReentrant whenNotPaused {
    if (amount == 0) revert InvalidAmount();
    require(_reserves[asset].id != 0 || _reservesList[0] == asset, Errors.AssetNotListed());

    BorrowLogic.executeBorrow(
      _reserves,
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteBorrowParams({
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        user: _msgSender(),
        onBehalfOf: onBehalfOf,
        amount: amount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        referralCode: referralCode,
        releaseUnderlying: true,
        oracle: ADDRESSES_PROVIDER.getPriceOracle(),
        priceOracleSentinel: ADDRESSES_PROVIDER.getPriceOracleSentinel()
      })
    );
    emit Borrow(_msgSender(), asset, amount, interestRateMode, onBehalfOf, referralCode, HCSTopics.BORROW_TOPIC());
  }

  function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) public virtual override nonReentrant returns (uint256) {
    uint256 repaid = BorrowLogic.executeRepay(
      _reserves,
      _reservesList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteRepayParams({
        asset: asset,
        user: _msgSender(),
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        onBehalfOf: onBehalfOf,
        useSupplyTokens: false,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
    emit Repay(_msgSender(), asset, repaid, interestRateMode, onBehalfOf, HCSTopics.REPAY_TOPIC());
    return repaid;
  }

  // Removed: repayWithPermit - HTS tokens don't use ERC20 permit pattern

  function repayWithDTokens(address asset, uint256 amount, uint256 interestRateMode) public virtual override nonReentrant returns (uint256) {
    return BorrowLogic.executeRepay(
      _reserves,
      _reservesList,
      _usersConfig[_msgSender()],
      DataTypes.ExecuteRepayParams({
        asset: asset,
        user: _msgSender(),
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: amount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        onBehalfOf: _msgSender(),
        useSupplyTokens: true,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
  }

  function setUserUseReserveAsCollateral(address asset, bool useAsCollateral) public virtual override nonReentrant {
    SupplyLogic.executeUseReserveAsCollateral(
      _reserves,
      _reservesList,
      _usersConfig[_msgSender()],
      _msgSender(),
      asset,
      useAsCollateral,
      ADDRESSES_PROVIDER.getPriceOracle()
    );
  }

  function liquidationCall(address collateralAsset, address debtAsset, address borrower, uint256 debtToCover, bool receiveSupplyToken) public virtual override nonReentrant {
    if (debtToCover == 0) revert InvalidAmount();

    LiquidationLogic.executeLiquidationCall(
      _reserves,
      _reservesList,
      _usersConfig,
      DataTypes.ExecuteLiquidationCallParams({
        liquidator: _msgSender(),
        debtToCover: debtToCover,
        collateralAsset: collateralAsset,
        debtAsset: debtAsset,
        borrower: borrower,
        receiveSupplyToken: receiveSupplyToken,
        priceOracle: ADDRESSES_PROVIDER.getPriceOracle(),
        priceOracleSentinel: ADDRESSES_PROVIDER.getPriceOracleSentinel(),
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY
      })
    );
    emit LiquidationCall(_msgSender(), borrower, collateralAsset, debtAsset, debtToCover, receiveSupplyToken, HCSTopics.LIQUIDATION_TOPIC());
  }



  function mintToTreasury(address[] calldata assets) external virtual override {
    PoolLogic.executeMintToTreasury(_reserves, assets);
  }

  function getUserAccountData(address user) external view virtual override returns (uint256, uint256, uint256, uint256, uint256, uint256) {
    return PoolLogic.executeGetUserAccountData(
      _reserves,
      _reservesList,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: _usersConfig[user],
        user: user,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
  }

  function getReserveData(address asset) external view virtual override returns (DataTypes.ReserveDataLegacy memory res) {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    res.configuration = reserve.configuration;
    res.liquidityIndex = reserve.liquidityIndex;
    res.currentLiquidityRate = reserve.currentLiquidityRate;
    res.variableBorrowIndex = reserve.variableBorrowIndex;
    res.currentVariableBorrowRate = reserve.currentVariableBorrowRate;
    res.lastUpdateTimestamp = reserve.lastUpdateTimestamp;
    res.id = reserve.id;
    res.supplyTokenAddress = reserve.supplyTokenAddress;
    res.borrowTokenAddress = reserve.borrowTokenAddress;
    res.interestRateStrategyAddress = RESERVE_INTEREST_RATE_STRATEGY;
    res.accruedToTreasury = reserve.accruedToTreasury;
  }

  function getConfiguration(address asset) external view virtual override returns (DataTypes.ReserveConfigurationMap memory) {
    return _reserves[asset].configuration;
  }

  function getUserConfiguration(address user) external view virtual override returns (DataTypes.UserConfigurationMap memory) {
    return _usersConfig[user];
  }

  function getReserveNormalizedIncome(address asset) external view virtual override returns (uint256) {
    return _reserves[asset].getNormalizedIncome();
  }

  function getReserveNormalizedVariableDebt(address asset) external view virtual override returns (uint256) {
    return _reserves[asset].getNormalizedDebt();
  }

  function getReservesList() external view virtual override returns (address[] memory) {
    uint256 reservesListCount = _reservesCount;
    uint256 droppedReservesCount = 0;
    address[] memory reservesList = new address[](reservesListCount);

    // Gas optimized loop
    for (uint256 i; i < reservesListCount; ) {
      if (_reservesList[i] != address(0)) {
        reservesList[i - droppedReservesCount] = _reservesList[i];
      } else {
        unchecked { droppedReservesCount++; }
      }
      unchecked { ++i; }
    }

    assembly {
      mstore(reservesList, sub(reservesListCount, droppedReservesCount))
    }
    return reservesList;
  }

  function initReserve(address asset, address supplyTokenAddress, address variableDebtAddress) external virtual override onlyPoolConfigurator {
    if (PoolLogic.executeInitReserve(_reserves, _reservesList, DataTypes.InitReserveParams({
      asset: asset,
      supplyTokenAddress: supplyTokenAddress,
      variableDebtAddress: variableDebtAddress,
      reservesCount: _reservesCount,
      maxNumberReserves: ReserveConfiguration.MAX_RESERVES_COUNT
    }))) {
      _reservesCount++;
    }
  }

  function setConfiguration(address asset, DataTypes.ReserveConfigurationMap calldata configuration) external virtual override onlyPoolConfigurator {
    require(asset != address(0), Errors.ZeroAddressNotValid());
    require(_reserves[asset].id != 0 || _reservesList[0] == asset, Errors.AssetNotListed());
    _reserves[asset].configuration = configuration;
  }

  function dropReserve(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeDropReserve(_reserves, _reservesList, asset);
  }

  function syncIndexesState(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeSyncIndexesState(_reserves[asset]);
  }

  function syncRatesState(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeSyncRatesState(_reserves[asset], asset, RESERVE_INTEREST_RATE_STRATEGY);
  }



  function setLiquidationGracePeriod(address asset, uint40 until) external virtual override onlyPoolConfigurator {
    require(_reserves[asset].id != 0 || _reservesList[0] == asset, Errors.AssetNotListed());
    PoolLogic.executeSetLiquidationGracePeriod(_reserves, asset, until);
  }

  function getLiquidationGracePeriod(address asset) external view virtual override returns (uint40) {
    return _reserves[asset].liquidationGracePeriodUntil;
  }

  function rescueTokens(address token, address to, uint256 amount) external virtual override onlyPoolAdmin {
    PoolLogic.executeRescueTokens(token, to, amount);
  }

  function finalizeTransfer(address asset, address from, address to, uint256 scaledAmount, uint256 scaledBalanceFromBefore, uint256 scaledBalanceToBefore) external virtual override {
    require(_msgSender() == _reserves[asset].supplyTokenAddress, Errors.CallerNotDToken());
    SupplyLogic.executeFinalizeTransfer(
      _reserves,
      _reservesList,
      _usersConfig,
      DataTypes.FinalizeTransferParams({
        asset: asset,
        from: from,
        to: to,
        scaledAmount: scaledAmount,
        scaledBalanceFromBefore: scaledBalanceFromBefore,
        scaledBalanceToBefore: scaledBalanceToBefore,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
  }

  function getReserveDToken(address asset) external view virtual returns (address) {
    return _reserves[asset].supplyTokenAddress;
  }

  function getReserveVariableDebtToken(address asset) external view virtual returns (address) {
    return _reserves[asset].borrowTokenAddress;
  }

  function getVirtualUnderlyingBalance(address asset) external view virtual override returns (uint128) {
    return _reserves[asset].virtualUnderlyingBalance;
  }

  function getReservesCount() external view virtual override returns (uint256) {
    return _reservesCount;
  }

  function getReserveAddressById(uint16 id) external view returns (address) {
    return _reservesList[id];
  }

  function getReserveDeficit(address asset) external view virtual returns (uint256) {
    return _reserves[asset].deficit;
  }

  /**
   * @notice Cover bad debt (deficit) for a reserve using protocol treasury funds
   * @dev Only Pool Admin can call this function to socialize bad debt
   * @param asset The address of the reserve with deficit
   * @param amount Amount of deficit to cover
   */
  function coverReserveDeficit(address asset, uint256 amount) external virtual nonReentrant onlyPoolAdmin {
    DataTypes.ReserveData storage reserve = _reserves[asset];
    require(reserve.deficit > 0, Errors.NoDebtToCover());
    require(amount <= reserve.deficit, Errors.AmountExceedsDeficit());

    uint256 amountToCover = amount;
    if (amount > reserve.deficit) {
      amountToCover = reserve.deficit;
    }

    // Transfer tokens from treasury to dToken contract via HTS
    address treasuryAddress = ADDRESSES_PROVIDER.getTreasury();
    _safeHTSTransfer(asset, treasuryAddress, reserve.supplyTokenAddress, amountToCover);

    // Reduce deficit
    reserve.deficit -= uint128(amountToCover);

    emit DeficitCovered(asset, amountToCover, reserve.deficit);
  }

  event DeficitCovered(address indexed asset, uint256 amountCovered, uint256 remainingDeficit);

  /**
   * @notice Pause the protocol in emergency situations
   * @dev Only Emergency Admin can pause. Pauses: supply, withdraw, borrow
   * @dev Does NOT pause: repay, liquidation (needed for protocol recovery)
   */
  function pause() external onlyEmergencyAdmin {
    _paused = true;
    emit ProtocolPaused(true);
  }

  /**
   * @notice Unpause the protocol after emergency is resolved
   * @dev Only Emergency Admin can unpause
   */
  function unpause() external onlyEmergencyAdmin {
    _paused = false;
    emit ProtocolPaused(false);
  }

  /**
   * @notice Check if protocol is currently paused
   * @return True if paused, false otherwise
   */
  function paused() external view returns (bool) {
    return _paused;
  }

  event ProtocolPaused(bool isPaused);

  function MAX_NUMBER_RESERVES() public view virtual override returns (uint16) {
    return ReserveConfiguration.MAX_RESERVES_COUNT;
  }

  function POOL_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() external pure virtual returns (uint256) {
    return POOL_REVISION();
  }

  // HBAR handling - native Solidity transfers (not HTS)
  receive() external payable {
    emit HBARReceived(msg.sender, msg.value);
  }
  
  fallback() external payable {
    emit HBARReceived(msg.sender, msg.value);
  }
}
