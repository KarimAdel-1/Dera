// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Multicall} from "@openzeppelin/contracts/utils/Multicall.sol";
import {VersionedInitializable} from '../../misc/dera-upgradeability/VersionedInitializable.sol';
import {Errors} from '../libraries/helpers/Errors.sol';
import {AssetConfiguration} from '../libraries/configuration/AssetConfiguration.sol';
import {PoolLogic} from '../libraries/logic/PoolLogic.sol';
import {AssetLogic} from '../libraries/logic/AssetLogic.sol';
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
  function isAssociated(address token, address account) external view returns (bool);
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
import {IDeraHCSEventStreamer} from '../../interfaces/IDeraHCSEventStreamer.sol';
import {IDeraProtocolIntegration} from '../../interfaces/IDeraProtocolIntegration.sol';
import {IDeraMirrorNodeAnalytics} from '../../interfaces/IDeraMirrorNodeAnalytics.sol';
import {IDeraNodeStaking} from '../../interfaces/IDeraNodeStaking.sol';
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
  using AssetLogic for DataTypes.PoolAssetData;

  IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
  address public immutable RESERVE_INTEREST_RATE_STRATEGY;
  IHTS private constant HTS = IHTS(address(0x167)); // HTS precompile

  // Custom errors for HTS
  error HTSError(int64 responseCode, string operation);
  error InvalidAmount();
  error ReentrancyGuard();
  error AmountExceedsInt64();
  error TokenNotAssociated(address token, address account);
  error LiquidationSlippageExceeded(uint256 actual, uint256 max);


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
    if (amount > uint256(uint64(type(int64).max))) revert AmountExceedsInt64();
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

  /**
   * @dev Checks if an account is associated with an HTS token
   * @param token HTS token address
   * @param account Account to check
   */
  function _checkHTSAssociation(address token, address account) internal view {
    if (token == address(0)) return; // Skip for HBAR
    try HTS.isAssociated(token, account) returns (bool associated) {
      if (!associated) revert TokenNotAssociated(token, account);
    } catch {
      // If isAssociated is not available, try balanceOf as fallback
      // This is a workaround for older HTS implementations
      try HTS.balanceOf(token, account) returns (uint256) {
        // If balanceOf succeeds, account is associated
        return;
      } catch {
        revert TokenNotAssociated(token, account);
      }
    }
  }

  /**
   * @dev Registers a user in the user registry for liquidation monitoring
   * @param user Address of the user to register
   */
  function _registerUser(address user) internal {
    if (!_isRegisteredUser[user] && user != address(0)) {
      _users.push(user);
      _isRegisteredUser[user] = true;
      emit UserRegistered(user, _users.length);
    }
  }

  /**
   * @dev Gets the HCS Event Streamer instance
   * @return IDeraHCSEventStreamer instance or zero address if not configured
   */
  function _getHCSStreamer() internal view returns (IDeraHCSEventStreamer) {
    if (hcsEventStreamer != address(0)) {
      return IDeraHCSEventStreamer(hcsEventStreamer);
    }
    return IDeraHCSEventStreamer(address(0));
  }

  /**
   * @notice Set HCS Event Streamer contract address
   * @dev Only Pool Admin can set this
   * @param streamer Address of DeraHCSEventStreamer contract
   */
  function setHCSEventStreamer(address streamer) external onlyPoolAdmin {
    if (streamer == address(0)) revert Errors.ZeroAddressNotValid();
    address oldStreamer = hcsEventStreamer;
    hcsEventStreamer = streamer;
    emit HCSEventStreamerUpdated(oldStreamer, streamer);
  }

  /**
   * @notice Get HCS Event Streamer address
   */
  function getHCSEventStreamer() external view returns (address) {
    return hcsEventStreamer;
  }

  /**
   * @notice Set Protocol Integration contract address
   * @dev Only Pool Admin can set this
   * @param integration Address of DeraProtocolIntegration contract
   */
  function setProtocolIntegration(address integration) external onlyPoolAdmin {
    if (integration == address(0)) revert Errors.ZeroAddressNotValid();
    emit ProtocolIntegrationUpdated(integration);
  }

  /**
   * @notice Set Node Staking contract address
   * @dev Only Pool Admin can set this
   * @param nodeStaking Address of DeraNodeStaking contract
   */
  function setNodeStakingContract(address nodeStaking) external onlyPoolAdmin {
    if (nodeStaking == address(0)) revert Errors.ZeroAddressNotValid();
    address oldContract = nodeStakingContract;
    nodeStakingContract = nodeStaking;
    emit NodeStakingContractUpdated(oldContract, nodeStaking);
  }

  /**
   * @notice Get Node Staking contract address
   */
  function getNodeStakingContract() external view returns (address) {
    return nodeStakingContract;
  }

  /**
   * @notice Set Analytics contract address
   * @dev Only Pool Admin can set this
   * @param analytics Address of DeraMirrorNodeAnalytics contract
   */
  function setAnalyticsContract(address analytics) external onlyPoolAdmin {
    if (analytics == address(0)) revert Errors.ZeroAddressNotValid();
    address oldContract = analyticsContract;
    analyticsContract = analytics;
    emit AnalyticsContractUpdated(oldContract, analytics);
  }

  /**
   * @notice Get Analytics contract address
   */
  function getAnalyticsContract() external view returns (address) {
    return analyticsContract;
  }

  /**
   * @notice Set Treasury address
   * @dev Only Pool Admin can set this
   * @param _treasury Address of Treasury contract
   */
  function setTreasury(address _treasury) external onlyPoolAdmin {
    if (_treasury == address(0)) revert Errors.ZeroAddressNotValid();
    address oldTreasury = treasury;
    treasury = _treasury;
    emit TreasuryUpdated(oldTreasury, _treasury);
  }

  /**
   * @notice Get Treasury address
   */
  function getTreasury() external view returns (address) {
    return treasury;
  }

  event HCSEventStreamerUpdated(address indexed oldStreamer, address indexed newStreamer);
  event ProtocolIntegrationUpdated(address indexed integration);
  event NodeStakingContractUpdated(address indexed oldContract, address indexed newContract);
  event AnalyticsContractUpdated(address indexed oldContract, address indexed newContract);
  event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

  // Events for HCS relay and Mirror Node indexing
  event Supply(address indexed user, address indexed asset, uint256 amount, address indexed onBehalfOf, uint16 referralCode, bytes32 hcsTopic);
  event Withdraw(address indexed user, address indexed asset, uint256 amount, address indexed to, bytes32 hcsTopic);
  event Borrow(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, address indexed onBehalfOf, uint16 referralCode, bytes32 hcsTopic);
  event Repay(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode, address indexed onBehalfOf, bytes32 hcsTopic);
  event LiquidationCall(address indexed liquidator, address indexed borrower, address collateralAsset, address debtAsset, uint256 debtToCover, bool receiveSupplyToken, bytes32 hcsTopic);
  event HTSErrorHandled(address indexed token, address indexed account, string operation, int64 responseCode);
  event PoolUpgraded(uint256 version);
  event HBARReceived(address indexed sender, uint256 amount);
  event UserRegistered(address indexed user, uint256 totalUsers);

  modifier onlyPoolConfigurator() {
    if (ADDRESSES_PROVIDER.getPoolConfigurator() != _msgSender()) revert Errors.CallerNotPoolConfigurator();
    _;
  }

  modifier onlyPoolAdmin() {
    if (!IACLManager(ADDRESSES_PROVIDER.getACLManager()).isPoolAdmin(_msgSender())) revert Errors.CallerNotPoolAdmin();
    _;
  }

  modifier onlyEmergencyAdmin() {
    if (!IACLManager(ADDRESSES_PROVIDER.getACLManager()).isEmergencyAdmin(_msgSender())) revert Errors.CallerNotPoolOrEmergencyAdmin();
    _;
  }

  modifier whenNotPaused() {
    if (_paused) revert Errors.ProtocolPaused();
    _;
  }

  constructor(IPoolAddressesProvider provider, IReserveInterestRateStrategy interestRateStrategy) {
    ADDRESSES_PROVIDER = provider;
    if (address(interestRateStrategy) == address(0)) revert Errors.ZeroAddressNotValid();
    RESERVE_INTEREST_RATE_STRATEGY = address(interestRateStrategy);
  }

  function initialize(IPoolAddressesProvider provider) external virtual;

  /**
   * @notice Supply assets to the pool
   * @dev HTS requires both sender and receiver to be associated with the token
   * @dev For native HBAR (asset = 0x0), use msg.value instead of amount parameter
   * @param asset The HTS token address (0x0 for native HBAR)
   * @param amount Amount to supply (ignored for HBAR, uses msg.value)
   * @param onBehalfOf Address receiving the dTokens
   * @param referralCode Referral code for tracking
   */
  function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) public payable virtual override nonReentrant whenNotPaused {
    // For native HBAR, use msg.value instead of amount parameter
    uint256 actualAmount = (asset == address(0)) ? msg.value : amount;
    if (actualAmount == 0) revert InvalidAmount();

    // Check if asset is listed - special handling for HBAR (address(0))
    if (asset == address(0)) {
      // For HBAR, check if it's been initialized (liquidityIndex != 0)
      if (_poolAssets[address(0)].liquidityIndex == 0) revert Errors.AssetNotListed();
    } else {
      // For HTS tokens, check normal way
      if (_poolAssets[asset].id == 0 && _assetsList[0] != asset) revert Errors.AssetNotListed();
      // Check that user is associated with the HTS token
      _checkHTSAssociation(asset, onBehalfOf);
    }

    // Register user for liquidation monitoring
    _registerUser(onBehalfOf);

    SupplyLogic.executeSupply(
      _poolAssets,
      _assetsList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteSupplyParams({
        user: _msgSender(),
        asset: asset,
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: actualAmount,
        onBehalfOf: onBehalfOf,
        referralCode: referralCode
      })
    );
    emit Supply(_msgSender(), asset, actualAmount, onBehalfOf, referralCode, HCSTopics.SUPPLY_TOPIC());

    // Queue event to HCS for Hedera-native indexing
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
      streamer.queueSupplyEvent(_msgSender(), asset, amount, onBehalfOf, referralCode);
    }

    // Protocol Integration hook
    if (address(protocolIntegration) != address(0)) {
      try IDeraProtocolIntegration(protocolIntegration).handleSupply(
        _msgSender(), asset, amount, onBehalfOf, referralCode
      ) {} catch {}
    }

    // Analytics update
    if (address(analyticsContract) != address(0)) {
      try IDeraMirrorNodeAnalytics(analyticsContract).recordSupply(
        asset, amount, _msgSender()
      ) {} catch {}
    }
  }

  // Removed: supplyWithPermit - HTS tokens don't use ERC20 permit pattern

  function withdraw(address asset, uint256 amount, address to) public virtual override nonReentrant whenNotPaused returns (uint256) {
    uint256 withdrawn = SupplyLogic.executeWithdraw(
      _poolAssets,
      _assetsList,
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

    // Queue event to HCS for Hedera-native indexing
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
      streamer.queueWithdrawEvent(_msgSender(), asset, withdrawn, to);
    }

    // Protocol Integration hook
    if (address(protocolIntegration) != address(0)) {
      try IDeraProtocolIntegration(protocolIntegration).handleWithdraw(
        _msgSender(), asset, withdrawn, to
      ) {} catch {}
    }

    // Analytics update
    if (address(analyticsContract) != address(0)) {
      try IDeraMirrorNodeAnalytics(analyticsContract).recordWithdraw(
        asset, withdrawn, _msgSender()
      ) {} catch {}
    }

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
    if (_poolAssets[asset].id == 0 && _assetsList[0] != asset) revert Errors.AssetNotListed();

    // Check that user is associated with the HTS token (skip for HBAR)
    if (asset != address(0)) {
      _checkHTSAssociation(asset, onBehalfOf);
    }

    // Register user for liquidation monitoring
    _registerUser(onBehalfOf);

    BorrowLogic.executeBorrow(
      _poolAssets,
      _assetsList,
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

    // Queue event to HCS for Hedera-native indexing
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
      streamer.queueBorrowEvent(_msgSender(), asset, amount, interestRateMode, onBehalfOf, referralCode);
    }

    // Protocol Integration hook
    if (address(protocolIntegration) != address(0)) {
      try IDeraProtocolIntegration(protocolIntegration).handleBorrow(
        _msgSender(), asset, amount, interestRateMode, onBehalfOf, referralCode
      ) {} catch {}
    }

    // Analytics update
    if (address(analyticsContract) != address(0)) {
      try IDeraMirrorNodeAnalytics(analyticsContract).recordBorrow(
        asset, amount, _msgSender()
      ) {} catch {}
    }
  }

  function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) public payable virtual override nonReentrant returns (uint256) {
    // For native HBAR repay, use msg.value instead of amount parameter
    uint256 actualAmount = (asset == address(0)) ? msg.value : amount;
    
    uint256 repaid = BorrowLogic.executeRepay(
      _poolAssets,
      _assetsList,
      _usersConfig[onBehalfOf],
      DataTypes.ExecuteRepayParams({
        asset: asset,
        user: _msgSender(),
        interestRateStrategyAddress: RESERVE_INTEREST_RATE_STRATEGY,
        amount: actualAmount,
        interestRateMode: DataTypes.InterestRateMode(interestRateMode),
        onBehalfOf: onBehalfOf,
        useSupplyTokens: false,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
    emit Repay(_msgSender(), asset, repaid, interestRateMode, onBehalfOf, HCSTopics.REPAY_TOPIC());

    // Queue event to HCS for Hedera-native indexing
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
      streamer.queueRepayEvent(_msgSender(), asset, repaid, interestRateMode, onBehalfOf);
    }

    // Protocol Integration hook
    if (address(protocolIntegration) != address(0)) {
      try IDeraProtocolIntegration(protocolIntegration).handleRepay(
        _msgSender(), asset, repaid, interestRateMode, onBehalfOf
      ) {} catch {}
    }

    // Analytics update
    if (address(analyticsContract) != address(0)) {
      try IDeraMirrorNodeAnalytics(analyticsContract).recordRepay(
        asset, repaid, _msgSender()
      ) {} catch {}
    }

    return repaid;
  }

  // Removed: repayWithPermit - HTS tokens don't use ERC20 permit pattern

  function repayWithSupplyTokens(address asset, uint256 amount, uint256 interestRateMode) public virtual override nonReentrant returns (uint256) {
    return BorrowLogic.executeRepay(
      _poolAssets,
      _assetsList,
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

  function setUserUseAssetAsCollateral(address asset, bool useAsCollateral) public virtual override nonReentrant {
    SupplyLogic.executeUseAssetAsCollateral(
      _poolAssets,
      _assetsList,
      _usersConfig[_msgSender()],
      _msgSender(),
      asset,
      useAsCollateral,
      ADDRESSES_PROVIDER.getPriceOracle()
    );
  }

  function liquidationCall(address collateralAsset, address debtAsset, address borrower, uint256 debtToCover, bool receiveSupplyToken) public virtual override nonReentrant {
    // Call with no slippage limit (type(uint256).max means unlimited)
    _executeLiquidation(collateralAsset, debtAsset, borrower, debtToCover, receiveSupplyToken, type(uint256).max);
  }

  /**
   * @notice Liquidate undercollateralized position with slippage protection
   * @param collateralAsset The collateral asset to liquidate
   * @param debtAsset The debt asset being repaid
   * @param borrower The borrower being liquidated
   * @param debtToCover Amount of debt to cover
   * @param receiveSupplyToken True to receive dTokens, false to receive underlying
   * @param maxCollateralToLiquidate Maximum collateral willing to receive (slippage protection)
   */
  function liquidationCallWithSlippage(
    address collateralAsset,
    address debtAsset,
    address borrower,
    uint256 debtToCover,
    bool receiveSupplyToken,
    uint256 maxCollateralToLiquidate
  ) external nonReentrant {
    _executeLiquidation(collateralAsset, debtAsset, borrower, debtToCover, receiveSupplyToken, maxCollateralToLiquidate);
  }

  function _executeLiquidation(
    address collateralAsset,
    address debtAsset,
    address borrower,
    uint256 debtToCover,
    bool receiveSupplyToken,
    uint256 maxCollateralToLiquidate
  ) internal {
    if (debtToCover == 0) revert InvalidAmount();

    (uint256 actualCollateralLiquidated) = LiquidationLogic.executeLiquidationCall(
      _poolAssets,
      _assetsList,
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

    // Check slippage protection
    if (actualCollateralLiquidated > maxCollateralToLiquidate) {
      revert LiquidationSlippageExceeded(actualCollateralLiquidated, maxCollateralToLiquidate);
    }

    emit LiquidationCall(_msgSender(), borrower, collateralAsset, debtAsset, debtToCover, receiveSupplyToken, HCSTopics.LIQUIDATION_TOPIC());

    // Queue event to HCS for Hedera-native indexing
    // Note: liquidatedCollateral approximated as debtToCover for now
    // TODO: Modify LiquidationLogic to return actual liquidatedCollateral
    uint256 liquidatedCollateral = debtToCover; // Approximation
    IDeraHCSEventStreamer streamer = _getHCSStreamer();
    if (address(streamer) != address(0)) {
      streamer.queueLiquidationEvent(_msgSender(), borrower, collateralAsset, debtAsset, debtToCover, liquidatedCollateral, receiveSupplyToken);
    }

    // Protocol Integration hook
    if (address(protocolIntegration) != address(0)) {
      try IDeraProtocolIntegration(protocolIntegration).handleLiquidation(
        _msgSender(), borrower, collateralAsset, debtAsset, debtToCover, liquidatedCollateral
      ) {} catch {}
    }

    // Analytics update
    if (address(analyticsContract) != address(0)) {
      try IDeraMirrorNodeAnalytics(analyticsContract).recordLiquidation(
        collateralAsset, debtAsset, debtToCover, liquidatedCollateral, _msgSender(), borrower
      ) {} catch {}
    }
  }



  function mintToTreasury(address[] calldata assets) external virtual override {
    PoolLogic.executeMintToTreasury(_poolAssets, assets);
  }

  function getUserAccountData(address user) external view virtual override returns (uint256, uint256, uint256, uint256, uint256, uint256) {
    return PoolLogic.executeGetUserAccountData(
      _poolAssets,
      _assetsList,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: _usersConfig[user],
        user: user,
        oracle: ADDRESSES_PROVIDER.getPriceOracle()
      })
    );
  }

  function getAssetData(address asset) external view virtual override returns (DataTypes.AssetDataLegacy memory res) {
    DataTypes.PoolAssetData storage assetData = _poolAssets[asset];
    res.configuration = assetData.configuration;
    res.liquidityIndex = assetData.liquidityIndex;
    res.currentLiquidityRate = assetData.currentLiquidityRate;
    res.variableBorrowIndex = assetData.variableBorrowIndex;
    res.currentVariableBorrowRate = assetData.currentVariableBorrowRate;
    res.lastUpdateTimestamp = assetData.lastUpdateTimestamp;
    res.id = assetData.id;
    res.supplyTokenAddress = assetData.supplyTokenAddress;
    res.borrowTokenAddress = assetData.borrowTokenAddress;
  }

  function getConfiguration(address asset) external view virtual override returns (DataTypes.AssetConfigurationMap memory) {
    return _poolAssets[asset].configuration;
  }

  function getUserConfiguration(address user) external view virtual override returns (DataTypes.UserConfigurationMap memory) {
    return _usersConfig[user];
  }

  function getAssetNormalizedIncome(address asset) external view virtual override returns (uint256) {
    return _poolAssets[asset].getNormalizedIncome();
  }

  function getAssetNormalizedVariableDebt(address asset) external view virtual override returns (uint256) {
    return _poolAssets[asset].getNormalizedDebt();
  }

  function getAssetsList() external view virtual override returns (address[] memory) {
    uint256 reservesListCount = _assetsCount;
    uint256 droppedReservesCount = 0;
    address[] memory assetsList = new address[](reservesListCount);

    // Gas optimized loop
    for (uint256 i; i < reservesListCount; ) {
      if (_assetsList[i] != address(0)) {
        assetsList[i - droppedReservesCount] = _assetsList[i];
      } else {
        unchecked { droppedReservesCount++; }
      }
      unchecked { ++i; }
    }

    assembly {
      mstore(assetsList, sub(reservesListCount, droppedReservesCount))
    }
    return assetsList;
  }

  function initAsset(address asset, address supplyTokenAddress, address variableDebtAddress) external virtual override onlyPoolConfigurator {
    if (PoolLogic.executeInitAsset(_poolAssets, _assetsList, DataTypes.InitPoolAssetParams({
      asset: asset,
      supplyTokenAddress: supplyTokenAddress,
      variableDebtAddress: variableDebtAddress,
      assetsCount: _assetsCount,
      maxNumberAssets: AssetConfiguration.MAX_RESERVES_COUNT
    }))) {
      _assetsCount++;
    }
  }

  function setConfiguration(address asset, DataTypes.AssetConfigurationMap calldata configuration) external virtual override onlyPoolConfigurator {
    // Check if asset is listed - special handling for HBAR (address(0))
    if (asset == address(0)) {
      // For HBAR, check if it's been initialized (liquidityIndex != 0)
      if (_poolAssets[address(0)].liquidityIndex == 0) revert Errors.AssetNotListed();
    } else {
      // For HTS tokens, check normal way
      if (_poolAssets[asset].id == 0 && _assetsList[0] != asset) revert Errors.AssetNotListed();
    }
    _poolAssets[asset].configuration = configuration;
  }

  function dropAsset(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeDropAsset(_poolAssets, _assetsList, asset);
  }

  function syncIndexesState(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeSyncIndexesState(_poolAssets[asset]);
  }

  function syncRatesState(address asset) external virtual override onlyPoolConfigurator {
    PoolLogic.executeSyncRatesState(_poolAssets[asset], asset, RESERVE_INTEREST_RATE_STRATEGY);
  }



  function setLiquidationGracePeriod(address asset, uint40 until) external virtual override onlyPoolConfigurator {
    // Check if asset is listed - special handling for HBAR (address(0))
    if (asset == address(0)) {
      // For HBAR, check if it's been initialized (liquidityIndex != 0)
      if (_poolAssets[address(0)].liquidityIndex == 0) revert Errors.AssetNotListed();
    } else {
      // For HTS tokens, check normal way
      if (_poolAssets[asset].id == 0 && _assetsList[0] != asset) revert Errors.AssetNotListed();
    }
    PoolLogic.executeSetLiquidationGracePeriod(_poolAssets, asset, until);
  }

  function getLiquidationGracePeriod(address asset) external view virtual override returns (uint40) {
    return _poolAssets[asset].liquidationGracePeriodUntil;
  }

  function rescueTokens(address token, address to, uint256 amount) external virtual override onlyPoolAdmin {
    PoolLogic.executeRescueTokens(token, to, amount);
  }

  function finalizeTransfer(address asset, address from, address to, uint256 scaledAmount, uint256 scaledBalanceFromBefore, uint256 scaledBalanceToBefore) external virtual override {
    if (_msgSender() != _poolAssets[asset].supplyTokenAddress) revert Errors.CallerNotSupplyToken();
    SupplyLogic.executeFinalizeTransfer(
      _poolAssets,
      _assetsList,
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

  function getAssetSupplyToken(address asset) external view virtual returns (address) {
    return _poolAssets[asset].supplyTokenAddress;
  }

  function getAssetBorrowToken(address asset) external view virtual returns (address) {
    return _poolAssets[asset].borrowTokenAddress;
  }

  function getVirtualUnderlyingBalance(address asset) external view virtual override returns (uint128) {
    return _poolAssets[asset].virtualUnderlyingBalance;
  }

  function getAssetsCount() external view virtual override returns (uint256) {
    return _assetsCount;
  }

  function getAssetAddressById(uint16 id) external view returns (address) {
    return _assetsList[id];
  }

  function getAssetDeficit(address asset) external view virtual returns (uint256) {
    return _poolAssets[asset].deficit;
  }

  /**
   * @notice Cover bad debt (deficit) for a reserve using protocol treasury funds
   * @dev Only Pool Admin can call this function to socialize bad debt
   * @param asset The address of the reserve with deficit
   * @param amount Amount of deficit to cover
   */
  function coverAssetDeficit(address asset, uint256 amount) external virtual nonReentrant onlyPoolAdmin {
    DataTypes.PoolAssetData storage assetData = _poolAssets[asset];
    if (assetData.deficit == 0) revert Errors.NoDebtToCover();
    if (amount > assetData.deficit) revert Errors.AmountExceedsDeficit();

    uint256 amountToCover = amount;
    if (amount > assetData.deficit) {
      amountToCover = assetData.deficit;
    }

    // Transfer tokens from treasury to dToken contract via HTS
    _safeHTSTransfer(asset, treasury, assetData.supplyTokenAddress, amountToCover);

    // Reduce deficit
    assetData.deficit -= uint128(amountToCover);

    emit DeficitCovered(asset, amountToCover, assetData.deficit);
  }

  /**
   * @notice Socialize bad debt (deficit) across all lenders when treasury cannot cover
   * @dev This reduces the liquidity index proportionally, spreading losses
   * @param asset The address of the reserve with deficit
   * @dev WARNING: This reduces all lender balances proportionally. Use as last resort.
   */
  function socializeAssetDeficit(address asset) external virtual nonReentrant onlyPoolAdmin {
    DataTypes.PoolAssetData storage assetData = _poolAssets[asset];
    if (assetData.deficit == 0) revert Errors.NoDebtToCover();

    address supplyToken = assetData.supplyTokenAddress;
    uint256 totalSupply = IDeraSupplyToken(supplyToken).totalSupply();

    if (totalSupply == 0) {
      // No lenders to socialize to, just clear deficit
      assetData.deficit = 0;
      emit DeficitSocialized(asset, 0, 0);
      return;
    }

    // Calculate reduction factor: (totalSupply - deficit) / totalSupply
    // This effectively reduces the liquidity index proportionally
    uint256 deficit = assetData.deficit;
    uint256 lossPercentage = (deficit * 1e18) / totalSupply;

    // Reduce liquidity index to socialize losses
    uint256 currentIndex = assetData.liquidityIndex;
    uint256 reductionFactor = 1e18 - lossPercentage;
    uint256 newIndex = (currentIndex * reductionFactor) / 1e18;

    assetData.liquidityIndex = uint128(newIndex);
    assetData.deficit = 0;

    emit DeficitSocialized(asset, deficit, lossPercentage);
  }

  event DeficitCovered(address indexed asset, uint256 amountCovered, uint256 remainingDeficit);
  event DeficitSocialized(address indexed asset, uint256 deficitAmount, uint256 lossPercentage);

  /**
   * @notice Set minimum liquidation threshold (minimum USD value for liquidatable position)
   * @dev Only Pool Admin can call this
   * @param threshold Minimum threshold in base currency (8 decimals)
   */
  function setMinLiquidationThreshold(uint256 threshold) external onlyPoolAdmin {
    _minLiquidationThreshold = threshold;
    emit MinLiquidationThresholdUpdated(threshold);
  }

  /**
   * @notice Get minimum liquidation threshold
   * @return Minimum threshold in base currency (8 decimals)
   */
  function getMinLiquidationThreshold() external view returns (uint256) {
    return _minLiquidationThreshold == 0 ? 1000e8 : _minLiquidationThreshold; // Default $1000
  }

  event MinLiquidationThresholdUpdated(uint256 threshold);

  /**
   * @notice Reconcile virtual balance with actual balance for an asset
   * @dev Only Pool Admin can call this function
   * @param asset The asset to reconcile
   */
  function reconcileVirtualBalance(address asset) external onlyPoolAdmin {
    DataTypes.PoolAssetData storage assetData = _poolAssets[asset];
    address supplyToken = assetData.supplyTokenAddress;

    // Get actual balance
    uint256 actualBalance;
    if (asset == address(0)) {
      // For HBAR, use contract balance
      actualBalance = address(supplyToken).balance;
    } else {
      // For HTS tokens, use balanceOf
      actualBalance = _safeHTSBalanceOf(asset, supplyToken);
    }

    uint256 virtualBalance = assetData.virtualUnderlyingBalance;
    uint256 difference;
    bool isPositive;

    if (actualBalance > virtualBalance) {
      difference = actualBalance - virtualBalance;
      isPositive = true;
      assetData.virtualUnderlyingBalance = uint128(actualBalance);
    } else if (virtualBalance > actualBalance) {
      difference = virtualBalance - actualBalance;
      isPositive = false;
      assetData.virtualUnderlyingBalance = uint128(actualBalance);
    }

    if (difference > 0) {
      emit VirtualBalanceReconciled(asset, virtualBalance, actualBalance, difference, isPositive);
    }
  }

  event VirtualBalanceReconciled(
    address indexed asset,
    uint256 oldVirtualBalance,
    uint256 actualBalance,
    uint256 difference,
    bool isPositive
  );

  /**
   * @notice Pause a specific asset in emergency situations
   * @dev Only Emergency Admin can pause individual assets
   * @param asset The asset to pause
   * @param paused True to pause, false to unpause
   */
  function setAssetPause(address asset, bool paused) external onlyEmergencyAdmin {
    DataTypes.PoolAssetData storage assetData = _poolAssets[asset];
    assetData.configuration.setPaused(paused);
    emit AssetPaused(asset, paused);
  }

  /**
   * @notice Check if a specific asset is paused
   * @param asset The asset to check
   * @return True if paused, false otherwise
   */
  function isAssetPaused(address asset) external view returns (bool) {
    return _poolAssets[asset].configuration.getPaused();
  }

  event AssetPaused(address indexed asset, bool isPaused);

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
    return AssetConfiguration.MAX_RESERVES_COUNT;
  }

  function POOL_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() internal pure virtual override(VersionedInitializable, PoolStorage) returns (uint256) {
    return POOL_REVISION();
  }

  // ============ User Registry Functions ============

  /**
   * @notice Get all registered users
   * @dev Returns array of all users who have supplied or borrowed
   * @return Array of user addresses
   */
  function getAllUsers() external view returns (address[] memory) {
    return _users;
  }

  /**
   * @notice Get total number of registered users
   * @return Total count of registered users
   */
  function getUserCount() external view returns (uint256) {
    return _users.length;
  }

  /**
   * @notice Get user at specific index
   * @param index Index in the users array
   * @return User address at the given index
   */
  function getUserAtIndex(uint256 index) external view returns (address) {
    if (index >= _users.length) revert("Index out of bounds");
    return _users[index];
  }

  /**
   * @notice Check if an address is a registered user
   * @param user Address to check
   * @return True if user is registered, false otherwise
   */
  function isRegisteredUser(address user) external view returns (bool) {
    return _isRegisteredUser[user];
  }

  /**
   * @notice Get paginated list of users
   * @dev Useful for liquidation bots to iterate through users efficiently
   * @param startIndex Starting index for pagination
   * @param count Number of users to return
   * @return users Array of user addresses
   * @return nextIndex Next index for pagination (0 if end reached)
   */
  function getUsersPaginated(uint256 startIndex, uint256 count)
    external
    view
    returns (address[] memory users, uint256 nextIndex)
  {
    if (startIndex >= _users.length) revert("Start index out of bounds");

    uint256 endIndex = startIndex + count;
    if (endIndex > _users.length) {
      endIndex = _users.length;
    }

    uint256 resultLength = endIndex - startIndex;
    users = new address[](resultLength);

    for (uint256 i = 0; i < resultLength; i++) {
      users[i] = _users[startIndex + i];
    }

    nextIndex = endIndex < _users.length ? endIndex : 0;
    return (users, nextIndex);
  }

  // HBAR handling - native Solidity transfers (not HTS)
  receive() external payable {
    emit HBARReceived(msg.sender, msg.value);
  }
  
  fallback() external payable {
    emit HBARReceived(msg.sender, msg.value);
  }
  
  /**
   * @notice Get the contract's HBAR balance
   * @return HBAR balance in tinybars
   */
  function getHBARBalance() external view returns (uint256) {
    return address(this).balance;
  }
}
