// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPoolAddressesProvider} from '../../interfaces/IPoolAddressesProvider.sol';

/**
 * @title PoolAddressesProvider
 * @author Dera
 * @notice Main registry of protocol addresses on Hedera
 * 
 * HEDERA TOOLS USED:
 * - HFS (Hedera File Service): Contract addresses can be stored in HFS for off-chain reference
 * - Mirror Nodes: Address registry changes queryable via Mirror Node REST API
 * - HCS: All address updates logged to HCS for governance transparency
 * 
 * INTEGRATION:
 * - HFS: Optional - Store address mappings in HFS file for backup/reference
 * - Mirror Node API: GET /api/v1/contracts/{contractId}/results for address change history
 * - HCS Events: All setAddress operations emit events logged to HCS
 * - Hedera SDK: Owner uses SDK to sign and submit address update transactions
 */
contract PoolAddressesProvider is Ownable, IPoolAddressesProvider {
  string private _marketId;
  mapping(bytes32 => address) private _addresses;

  bytes32 private constant POOL = 'POOL';
  bytes32 private constant POOL_CONFIGURATOR = 'POOL_CONFIGURATOR';
  bytes32 private constant PRICE_ORACLE = 'PRICE_ORACLE';
  bytes32 private constant ACL_MANAGER = 'ACL_MANAGER';
  bytes32 private constant ACL_ADMIN = 'ACL_ADMIN';
  bytes32 private constant PRICE_ORACLE_SENTINEL = 'PRICE_ORACLE_SENTINEL';
  bytes32 private constant DATA_PROVIDER = 'DATA_PROVIDER';

  constructor(string memory marketId, address owner) {
    _setMarketId(marketId);
    transferOwnership(owner);
  }

  function getMarketId() external view override returns (string memory) {
    return _marketId;
  }

  function setMarketId(string memory newMarketId) external override onlyOwner {
    _setMarketId(newMarketId);
  }

  function getAddress(bytes32 id) public view override returns (address) {
    return _addresses[id];
  }

  function setAddress(bytes32 id, address newAddress) external override onlyOwner {
    require(newAddress != address(0), "Invalid address");
    address oldAddress = _addresses[id];
    _addresses[id] = newAddress;
    emit AddressSet(id, oldAddress, newAddress);
  }

  function getPool() external view override returns (address) {
    return getAddress(POOL);
  }

  function setPoolImpl(address newPoolImpl) external override onlyOwner {
    require(newPoolImpl != address(0), "Invalid address");
    address oldPoolImpl = _addresses[POOL];
    _addresses[POOL] = newPoolImpl;
    emit PoolUpdated(oldPoolImpl, newPoolImpl);
  }

  function getPoolConfigurator() external view override returns (address) {
    return getAddress(POOL_CONFIGURATOR);
  }

  function setPoolConfiguratorImpl(address newPoolConfiguratorImpl) external override onlyOwner {
    require(newPoolConfiguratorImpl != address(0), "Invalid address");
    address oldPoolConfiguratorImpl = _addresses[POOL_CONFIGURATOR];
    _addresses[POOL_CONFIGURATOR] = newPoolConfiguratorImpl;
    emit PoolConfiguratorUpdated(oldPoolConfiguratorImpl, newPoolConfiguratorImpl);
  }

  function getPriceOracle() external view override returns (address) {
    return getAddress(PRICE_ORACLE);
  }

  function setPriceOracle(address newPriceOracle) external override onlyOwner {
    require(newPriceOracle != address(0), "Invalid address");
    address oldPriceOracle = _addresses[PRICE_ORACLE];
    _addresses[PRICE_ORACLE] = newPriceOracle;
    emit PriceOracleUpdated(oldPriceOracle, newPriceOracle);
  }

  function getACLManager() external view override returns (address) {
    return getAddress(ACL_MANAGER);
  }

  function setACLManager(address newAclManager) external override onlyOwner {
    require(newAclManager != address(0), "Invalid address");
    address oldAclManager = _addresses[ACL_MANAGER];
    _addresses[ACL_MANAGER] = newAclManager;
    emit ACLManagerUpdated(oldAclManager, newAclManager);
  }

  function getACLAdmin() external view override returns (address) {
    return getAddress(ACL_ADMIN);
  }

  function setACLAdmin(address newAclAdmin) external override onlyOwner {
    require(newAclAdmin != address(0), "Invalid address");
    address oldAclAdmin = _addresses[ACL_ADMIN];
    _addresses[ACL_ADMIN] = newAclAdmin;
    emit ACLAdminUpdated(oldAclAdmin, newAclAdmin);
  }

  function getPriceOracleSentinel() external view override returns (address) {
    return getAddress(PRICE_ORACLE_SENTINEL);
  }

  function setPriceOracleSentinel(address newPriceOracleSentinel) external override onlyOwner {
    require(newPriceOracleSentinel != address(0), "Invalid address");
    address oldPriceOracleSentinel = _addresses[PRICE_ORACLE_SENTINEL];
    _addresses[PRICE_ORACLE_SENTINEL] = newPriceOracleSentinel;
    emit PriceOracleSentinelUpdated(oldPriceOracleSentinel, newPriceOracleSentinel);
  }

  function getPoolDataProvider() external view override returns (address) {
    return getAddress(DATA_PROVIDER);
  }

  function setPoolDataProvider(address newDataProvider) external override onlyOwner {
    require(newDataProvider != address(0), "Invalid address");
    address oldDataProvider = _addresses[DATA_PROVIDER];
    _addresses[DATA_PROVIDER] = newDataProvider;
    emit PoolDataProviderUpdated(oldDataProvider, newDataProvider);
  }

  function _setMarketId(string memory newMarketId) internal {
    require(bytes(newMarketId).length > 0, "Invalid market ID");
    string memory oldMarketId = _marketId;
    _marketId = newMarketId;
    emit MarketIdSet(oldMarketId, newMarketId);
  }

  function ADDRESSES_PROVIDER_REVISION() public pure virtual returns (uint256) {
    return 1;
  }

  function getRevision() external pure virtual returns (uint256) {
    return ADDRESSES_PROVIDER_REVISION();
  }
}
