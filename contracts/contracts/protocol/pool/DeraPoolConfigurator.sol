// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {PoolConfigurator} from './PoolConfigurator.sol';
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';
import {IPool} from '../../interfaces/IPool.sol';
import {IACLManager} from '../../interfaces/IACLManager.sol';
import {Errors} from '../libraries/helpers/Errors.sol';

/**
 * @title DeraPoolConfigurator
 * @author Dera Protocol
 * @notice Concrete implementation of PoolConfigurator contract for Hedera deployment
 */
contract DeraPoolConfigurator is PoolConfigurator {
  uint256 public constant DERA_POOL_CONFIGURATOR_REVISION = 0x1;

  /**
   * @notice Initialize the PoolConfigurator contract
   * @dev Called only once during proxy initialization
   * @param provider Address of PoolAddressesProvider
   */
  function initialize(IPoolAddressesProvider provider) public override initializer {
    _addressesProvider = provider;
    _pool = IPool(provider.getPool());
  }

  /**
   * @notice Get the revision number of this pool configurator instance
   * @return The revision number
   */
  function getRevision() internal pure override returns (uint256) {
    return DERA_POOL_CONFIGURATOR_REVISION;
  }

  /**
   * @notice Set asset interest rate data
   * @dev Not implemented - placeholder function
   */
  function setAssetInterestRateData(address /* asset */, bytes calldata /* rateData */) external pure override {
    revert("Not implemented");
  }

  /**
   * @notice Update the Pool address
   * @dev CRITICAL: Used to fix Hedera contract address reuse issues
   * @dev When PoolConfigurator address is reused, its _pool variable may point to an old Pool
   * @dev Only Pool Admin can call this
   * @param newPool The new Pool contract address
   */
  function setPool(address newPool) external onlyPoolAdmin {
    require(newPool != address(0), "Invalid pool address");
    address oldPool = address(_pool);
    _pool = IPool(newPool);
    emit PoolUpdated(oldPool, newPool);
  }

  /**
   * @notice Emergency recovery function for Hedera address reuse
   * @dev CRITICAL: Used when PoolConfigurator is reused and points to old AddressesProvider
   * @dev This function can ONLY be called when _pool is address(0) or _addressesProvider is different
   * @dev No role check because old AddressesProvider would have old ACLManager
   * @param provider The new PoolAddressesProvider address
   */
  function recoverFromAddressReuse(IPoolAddressesProvider provider) external {
    require(address(provider) != address(0), "Invalid provider address");

    // Only allow recovery if pointing to a different provider (address reuse scenario)
    // This prevents anyone from arbitrarily changing the provider in normal operation
    require(address(_addressesProvider) != address(provider), "Already using this provider");

    // Additional safety: only allow if _pool is zero or doesn't match provider's pool
    address providerPool = provider.getPool();
    require(
      address(_pool) == address(0) || address(_pool) != providerPool,
      "Configuration is already correct"
    );

    // Update to new provider and pool
    address oldProvider = address(_addressesProvider);
    address oldPool = address(_pool);
    _addressesProvider = provider;
    _pool = IPool(providerPool);

    emit ProviderRecovered(oldProvider, address(provider));
    emit PoolUpdated(oldPool, providerPool);
  }

  /**
   * @notice Get the current Pool address
   * @return The Pool contract address
   */
  function getPool() external view returns (address) {
    return address(_pool);
  }

  /**
   * @notice Finalize initialization of an asset by registering tokens in the Pool
   * @param underlyingAsset The underlying asset address
   * @param dTokenProxy The dToken proxy address
   * @param variableDebtProxy The variable debt token proxy address
   * @param decimals The asset decimals
   */
  function finalizeInitAsset(address underlyingAsset, address dTokenProxy, address variableDebtProxy, uint8 decimals) external override onlyPoolAdmin {
    _pool.initAsset(underlyingAsset, dTokenProxy, variableDebtProxy);
    emit AssetInitialized(underlyingAsset, dTokenProxy, variableDebtProxy);
  }

  event AssetInitialized(address indexed asset, address indexed dToken, address indexed vToken);
  event PoolUpdated(address indexed oldPool, address indexed newPool);
  event ProviderRecovered(address indexed oldProvider, address indexed newProvider);
}