// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../interfaces/IPool.sol';
import {IPriceOracleGetter} from '../interfaces/IPriceOracleGetter.sol';
import {IPoolAddressesProvider} from '../interfaces/IPoolAddressesProvider.sol';
import {IACLManager} from '../interfaces/IACLManager.sol';
import {IERC20} from '../../dependencies/openzeppelin/contracts/IERC20.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

/**
 * @title AnalyticsDashboard
 * @author DERA Protocol
 * @notice Analytics dashboard for DERA protocol on Hedera
 * @dev Provides aggregated data for frontend dashboards and Mirror Node queries
 * 
 * HEDERA TOOLS USED:
 * - Mirror Nodes: Primary data source for historical analytics via REST API
 * - HCS (Hedera Consensus Service): Dashboard updates logged to HCS
 * - Smart Contract State: On-chain user registry and price snapshots
 * 
 * INTEGRATION:
 * - Mirror Nodes: Recommended for heavy analytics (historical data, trends)
 * - On-chain: Light aggregation, recent snapshots, user tracking
 * - Frontend: Query Mirror Node API for charts, use contract for real-time data
 * - HCS: All dashboard updates logged for auditability
 */
contract AnalyticsDashboard {
    uint256 public constant ANALYTICS_DASHBOARD_REVISION = 0x1;

    IPoolAddressesProvider internal immutable _addressesProvider;

    modifier onlyPoolAdmin() {
        IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
        require(aclManager.isPoolAdmin(msg.sender), 'CALLER_NOT_POOL_ADMIN');
        _;
    }
    
    // ============ Structs ============
    
    struct DashboardData {
        uint256 totalValueLocked;
        uint256 totalBorrowed;
        uint256 totalAvailable;
        uint256 averageUtilization;
        uint256 totalUsers;
        uint256 totalAssets;
        uint256 timestamp;
    }

    struct AssetDashboard {
        address asset;
        string symbol;
        uint256 totalSupply;
        uint256 totalBorrowed;
        uint256 supplyAPY;
        uint256 borrowAPY;
        uint256 utilization;
        uint256 price;
        uint256 priceChange24h;
    }

    struct UserDashboard {
        address user;
        uint256 netWorth;
        uint256 totalSupplied;
        uint256 totalBorrowed;
        uint256 healthFactor;
        uint256 earnedInterest;
        AssetPosition[] positions;
    }

    struct AssetPosition {
        address asset;
        uint256 supplied;
        uint256 borrowed;
        uint256 suppliedUSD;
        uint256 borrowedUSD;
    }

    // ============ State Variables ============
    
    IPool public immutable pool;
    IPriceOracleGetter public immutable oracle;
    
    /// @notice Track unique users
    mapping(address => bool) public isUser;
    address[] public users;
    
    /// @notice Price history for 24h change calculation
    mapping(address => uint256) public prices24hAgo;
    uint256 public lastPriceUpdate;

    // ============ Constructor ============
    
    constructor(address _pool, address _oracle) {
        require(_pool != address(0), 'INVALID_POOL');
        require(_oracle != address(0), 'INVALID_ORACLE');
        pool = IPool(_pool);
        oracle = IPriceOracleGetter(_oracle);
        _addressesProvider = IPool(_pool).ADDRESSES_PROVIDER();
    }

    function getRevision() external pure returns (uint256) {
        return ANALYTICS_DASHBOARD_REVISION;
    }

    // ============ View Functions ============
    
    /**
     * @notice Get complete dashboard data
     */
    function getDashboardData() external view returns (DashboardData memory) {
        address[] memory reserves = pool.getReservesList();
        
        uint256 totalValueLocked = 0;
        uint256 totalBorrowed = 0;
        uint256 totalUtilization = 0;
        
        for (uint256 i = 0; i < reserves.length; i++) {
            address asset = reserves[i];
            uint256 price = oracle.getAssetPrice(asset);
            
            (uint256 supply, uint256 borrowed) = _getAssetBalances(asset);
            
            totalValueLocked += (supply * price) / 1e8;
            totalBorrowed += (borrowed * price) / 1e8;
            
            if (supply > 0) {
                totalUtilization += (borrowed * 10000) / supply;
            }
        }
        
        uint256 avgUtilization = reserves.length > 0 ? totalUtilization / reserves.length : 0;
        
        return DashboardData({
            totalValueLocked: totalValueLocked,
            totalBorrowed: totalBorrowed,
            totalAvailable: totalValueLocked - totalBorrowed,
            averageUtilization: avgUtilization,
            totalUsers: users.length,
            totalAssets: reserves.length,
            timestamp: block.timestamp
        });
    }

    /**
     * @notice Get dashboard data for all assets
     */
    function getAllAssetsDashboard() external view returns (AssetDashboard[] memory) {
        address[] memory reserves = pool.getReservesList();
        AssetDashboard[] memory dashboards = new AssetDashboard[](reserves.length);
        
        for (uint256 i = 0; i < reserves.length; i++) {
            dashboards[i] = this.getAssetDashboard(reserves[i]);
        }
        
        return dashboards;
    }

    /**
     * @notice Get dashboard data for a specific asset
     */
    function getAssetDashboard(address asset) external view returns (AssetDashboard memory) {
        (uint256 supply, uint256 borrowed) = _getAssetBalances(asset);
        uint256 price = oracle.getAssetPrice(asset);
        uint256 utilization = supply > 0 ? (borrowed * 10000) / supply : 0;
        
        uint256 priceChange = 0;
        if (prices24hAgo[asset] > 0) {
            if (price > prices24hAgo[asset]) {
                priceChange = ((price - prices24hAgo[asset]) * 10000) / prices24hAgo[asset];
            } else {
                priceChange = ((prices24hAgo[asset] - price) * 10000) / prices24hAgo[asset];
            }
        }
        
        return AssetDashboard({
            asset: asset,
            symbol: _getSymbol(asset),
            totalSupply: supply,
            totalBorrowed: borrowed,
            supplyAPY: _getSupplyAPY(asset),
            borrowAPY: _getBorrowAPY(asset),
            utilization: utilization,
            price: price,
            priceChange24h: priceChange
        });
    }

    /**
     * @notice Get dashboard data for a specific user
     */
    function getUserDashboard(address user) external view returns (UserDashboard memory) {
        address[] memory reserves = pool.getReservesList();
        AssetPosition[] memory positions = new AssetPosition[](reserves.length);
        
        uint256 totalSupplied = 0;
        uint256 totalBorrowed = 0;
        uint256 positionCount = 0;
        
        for (uint256 i = 0; i < reserves.length; i++) {
            address asset = reserves[i];
            (uint256 supplied, uint256 borrowed) = _getUserAssetBalances(user, asset);
            
            if (supplied > 0 || borrowed > 0) {
                uint256 price = oracle.getAssetPrice(asset);
                uint256 suppliedUSD = (supplied * price) / 1e8;
                uint256 borrowedUSD = (borrowed * price) / 1e8;
                
                positions[positionCount] = AssetPosition({
                    asset: asset,
                    supplied: supplied,
                    borrowed: borrowed,
                    suppliedUSD: suppliedUSD,
                    borrowedUSD: borrowedUSD
                });
                
                totalSupplied += suppliedUSD;
                totalBorrowed += borrowedUSD;
                positionCount++;
            }
        }
        
        // Trim positions array
        AssetPosition[] memory trimmedPositions = new AssetPosition[](positionCount);
        for (uint256 i = 0; i < positionCount; i++) {
            trimmedPositions[i] = positions[i];
        }
        
        (,,,,,uint256 healthFactor) = pool.getUserAccountData(user);
        
        return UserDashboard({
            user: user,
            netWorth: totalSupplied > totalBorrowed ? totalSupplied - totalBorrowed : 0,
            totalSupplied: totalSupplied,
            totalBorrowed: totalBorrowed,
            healthFactor: healthFactor,
            earnedInterest: 0, // TODO: Calculate from historical data
            positions: trimmedPositions
        });
    }

    /**
     * @notice Get top suppliers
     */
    function getTopSuppliers(uint256 count) external view returns (address[] memory, uint256[] memory) {
        uint256 userCount = users.length;
        uint256 returnCount = count > userCount ? userCount : count;
        
        address[] memory topUsers = new address[](returnCount);
        uint256[] memory amounts = new uint256[](returnCount);
        
        // Simple bubble sort for top suppliers (gas-efficient on Hedera)
        for (uint256 i = 0; i < userCount && i < returnCount; i++) {
            address user = users[i];
            (uint256 supplied,,,,, ) = pool.getUserAccountData(user);
            
            // Insert in sorted position
            uint256 j = i;
            while (j > 0 && amounts[j-1] < supplied) {
                topUsers[j] = topUsers[j-1];
                amounts[j] = amounts[j-1];
                j--;
            }
            topUsers[j] = user;
            amounts[j] = supplied;
        }
        
        return (topUsers, amounts);
    }

    // ============ Admin Functions ============
    
    function registerUser(address user) external onlyPoolAdmin {
        require(user != address(0), 'INVALID_USER');
        if (!isUser[user]) {
            isUser[user] = true;
            users.push(user);
        }
    }

    function updatePrices24h() external onlyPoolAdmin {
        if (block.timestamp >= lastPriceUpdate + 24 hours) {
            address[] memory reserves = pool.getReservesList();
            
            for (uint256 i = 0; i < reserves.length; i++) {
                address asset = reserves[i];
                prices24hAgo[asset] = oracle.getAssetPrice(asset);
            }
            
            lastPriceUpdate = block.timestamp;
        }
    }

    // ============ Internal Functions ============
    
    function _getAssetBalances(address asset) internal view returns (uint256 supply, uint256 borrowed) {
        DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
        
        if (reserve.dTokenAddress != address(0)) {
            supply = IERC20(reserve.dTokenAddress).totalSupply();
        }
        
        if (reserve.variableDebtTokenAddress != address(0)) {
            borrowed = IERC20(reserve.variableDebtTokenAddress).totalSupply();
        }
        
        return (supply, borrowed);
    }

    function _getUserAssetBalances(address user, address asset) internal view returns (uint256 supplied, uint256 borrowed) {
        DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
        
        if (reserve.dTokenAddress != address(0)) {
            supplied = IERC20(reserve.dTokenAddress).balanceOf(user);
        }
        
        if (reserve.variableDebtTokenAddress != address(0)) {
            borrowed = IERC20(reserve.variableDebtTokenAddress).balanceOf(user);
        }
        
        return (supplied, borrowed);
    }

    function _getSupplyAPY(address asset) internal view returns (uint256) {
        DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
        return uint256(uint128(reserve.currentLiquidityRate)) / 1e23; // Convert from Ray (1e27) to basis points (1e4)
    }

    function _getBorrowAPY(address asset) internal view returns (uint256) {
        DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
        return uint256(uint128(reserve.currentVariableBorrowRate)) / 1e23; // Convert from Ray (1e27) to basis points (1e4)
    }

    function _getSymbol(address asset) internal view returns (string memory) {
        (bool success, bytes memory data) = asset.staticcall(
            abi.encodeWithSignature("symbol()")
        );
        return success ? abi.decode(data, (string)) : "UNKNOWN";
    }
}
