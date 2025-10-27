// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from '../interfaces/IPool.sol';
import {IPriceOracleGetter} from '../interfaces/IPriceOracleGetter.sol';
import {IPoolAddressesProvider} from '../interfaces/IPoolAddressesProvider.sol';
import {IACLManager} from '../interfaces/IACLManager.sol';
import {DataTypes} from '../protocol/libraries/types/DataTypes.sol';

/**
 * @title ProtocolMonitor
 * @author DERA Protocol
 * @notice Real-time monitoring and analytics for DERA protocol on Hedera
 * @dev Optimized for Hedera's low gas costs and Mirror Node integration
 * 
 * HEDERA TOOLS USED:
 * - Mirror Nodes: Primary data source for historical metrics via REST API
 * - HCS (Hedera Consensus Service): All events logged to HCS for auditability
 * - Smart Contract State: On-chain metrics storage for recent snapshots
 * 
 * INTEGRATION:
 * - Mirror Nodes: Query transaction history, event logs, token balances
 * - HCS Events: MetricsUpdated, AlertTriggered logged to HCS
 * - Off-chain Service: Recommended to use Mirror Node API for heavy analytics
 * - On-chain: Light monitoring, alerts, recent metrics (last 100 snapshots)
 */
contract ProtocolMonitor {
    uint256 public constant PROTOCOL_MONITOR_REVISION = 0x1;

    IPoolAddressesProvider internal immutable _addressesProvider;

    modifier onlyPoolAdmin() {
        IACLManager aclManager = IACLManager(_addressesProvider.getACLManager());
        require(aclManager.isPoolAdmin(msg.sender), 'CALLER_NOT_POOL_ADMIN');
        _;
    }
    
    // ============ Structs ============
    
    struct ProtocolMetrics {
        uint256 totalValueLocked;
        uint256 totalBorrowed;
        uint256 totalCollateral;
        uint256 utilizationRate;
        uint256 timestamp;
    }

    struct AssetMetrics {
        address asset;
        uint256 totalSupply;
        uint256 totalBorrowed;
        uint256 availableLiquidity;
        uint256 utilizationRate;
        uint256 supplyAPY;
        uint256 borrowAPY;
        uint256 price;
    }

    struct UserMetrics {
        address user;
        uint256 totalCollateralUSD;
        uint256 totalDebtUSD;
        uint256 availableBorrowsUSD;
        uint256 healthFactor;
        bool isLiquidatable;
    }

    struct AlertData {
        uint256 timestamp;
        string alertType;
        address asset;
        address user;
        uint256 value;
        string message;
    }

    // ============ State Variables ============
    
    IPool public immutable pool;
    IPriceOracleGetter public immutable oracle;
    
    /// @notice Historical metrics (last 100 snapshots)
    ProtocolMetrics[] public metricsHistory;
    uint256 public constant MAX_HISTORY = 100;

    /// @notice Alerts log
    AlertData[] public alerts;
    uint256 public constant MAX_ALERTS = 1000;

    /// @notice Alert thresholds
    uint256 public highUtilizationThreshold = 90; // 90%
    uint256 public lowHealthFactorThreshold = 110; // 1.1
    uint256 public largeLiquidationThreshold = 10000e8; // $10,000

    // ============ Events ============
    
    event MetricsUpdated(uint256 tvl, uint256 borrowed, uint256 utilization);
    event AlertTriggered(string alertType, address indexed asset, address indexed user, uint256 value);

    // ============ Constructor ============
    
    constructor(address _pool, address _oracle) {
        require(_pool != address(0), 'INVALID_POOL');
        require(_oracle != address(0), 'INVALID_ORACLE');
        pool = IPool(_pool);
        oracle = IPriceOracleGetter(_oracle);
        _addressesProvider = IPool(_pool).ADDRESSES_PROVIDER();
    }

    function getRevision() external pure returns (uint256) {
        return PROTOCOL_MONITOR_REVISION;
    }

    // ============ View Functions ============
    
    /**
     * @notice Get current protocol metrics
     */
    function getProtocolMetrics() external view returns (ProtocolMetrics memory) {
        address[] memory reserves = pool.getReservesList();
        
        uint256 totalValueLocked = 0;
        uint256 totalBorrowed = 0;
        
        for (uint256 i = 0; i < reserves.length; i++) {
            address asset = reserves[i];
            DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
            uint256 price = oracle.getAssetPrice(asset);
            
            uint256 totalSupply = reserve.dTokenAddress != address(0) 
                ? _getTokenBalance(reserve.dTokenAddress) 
                : 0;
            uint256 totalDebt = reserve.variableDebtTokenAddress != address(0)
                ? _getTokenBalance(reserve.variableDebtTokenAddress)
                : 0;
            
            totalValueLocked += (totalSupply * price) / 1e8;
            totalBorrowed += (totalDebt * price) / 1e8;
        }
        
        uint256 utilization = totalValueLocked > 0 
            ? (totalBorrowed * 10000) / totalValueLocked 
            : 0;
        
        return ProtocolMetrics({
            totalValueLocked: totalValueLocked,
            totalBorrowed: totalBorrowed,
            totalCollateral: totalValueLocked - totalBorrowed,
            utilizationRate: utilization,
            timestamp: block.timestamp
        });
    }

    /**
     * @notice Get metrics for a specific asset
     */
    function getAssetMetrics(address asset) external view returns (AssetMetrics memory) {
        DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
        uint256 price = oracle.getAssetPrice(asset);
        
        uint256 totalSupply = _getTokenBalance(reserve.dTokenAddress);
        uint256 totalBorrowed = _getTokenBalance(reserve.variableDebtTokenAddress);
        uint256 availableLiquidity = totalSupply - totalBorrowed;
        uint256 utilization = totalSupply > 0 ? (totalBorrowed * 10000) / totalSupply : 0;
        
        return AssetMetrics({
            asset: asset,
            totalSupply: totalSupply,
            totalBorrowed: totalBorrowed,
            availableLiquidity: availableLiquidity,
            utilizationRate: utilization,
            supplyAPY: _calculateSupplyAPY(reserve),
            borrowAPY: _calculateBorrowAPY(reserve),
            price: price
        });
    }

    /**
     * @notice Get metrics for a specific user
     */
    function getUserMetrics(address user) external view returns (UserMetrics memory) {
        (
            uint256 totalCollateralUSD,
            uint256 totalDebtUSD,
            uint256 availableBorrowsUSD,
            ,
            ,
            uint256 healthFactor
        ) = pool.getUserAccountData(user);
        
        bool isLiquidatable = healthFactor < 1e18 && healthFactor > 0;
        
        return UserMetrics({
            user: user,
            totalCollateralUSD: totalCollateralUSD,
            totalDebtUSD: totalDebtUSD,
            availableBorrowsUSD: availableBorrowsUSD,
            healthFactor: healthFactor,
            isLiquidatable: isLiquidatable
        });
    }

    /**
     * @notice Get historical metrics
     */
    function getMetricsHistory(uint256 count) external view returns (ProtocolMetrics[] memory) {
        uint256 length = metricsHistory.length;
        uint256 returnCount = count > length ? length : count;
        
        ProtocolMetrics[] memory history = new ProtocolMetrics[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            history[i] = metricsHistory[length - returnCount + i];
        }
        
        return history;
    }

    /**
     * @notice Get recent alerts
     */
    function getRecentAlerts(uint256 count) external view returns (AlertData[] memory) {
        uint256 length = alerts.length;
        uint256 returnCount = count > length ? length : count;
        
        AlertData[] memory recentAlerts = new AlertData[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            recentAlerts[i] = alerts[length - returnCount + i];
        }
        
        return recentAlerts;
    }

    /**
     * @notice Check if any alerts should be triggered
     */
    function checkAlerts() external returns (uint256) {
        uint256 alertCount = 0;
        address[] memory reserves = pool.getReservesList();
        
        // Check utilization rates
        for (uint256 i = 0; i < reserves.length; i++) {
            address asset = reserves[i];
            DataTypes.ReserveData memory reserve = pool.getReserveData(asset);
            
            uint256 totalSupply = _getTokenBalance(reserve.dTokenAddress);
            uint256 totalBorrowed = _getTokenBalance(reserve.variableDebtTokenAddress);
            
            if (totalSupply > 0) {
                uint256 utilization = (totalBorrowed * 100) / totalSupply;
                
                if (utilization >= highUtilizationThreshold) {
                    _triggerAlert("HIGH_UTILIZATION", asset, address(0), utilization, "Asset utilization above threshold");
                    alertCount++;
                }
            }
        }
        
        return alertCount;
    }

    // ============ Admin Functions ============
    
    function updateMetrics() external onlyPoolAdmin {
        ProtocolMetrics memory metrics = this.getProtocolMetrics();
        
        if (metricsHistory.length >= MAX_HISTORY) {
            // Remove oldest entry
            for (uint256 i = 0; i < metricsHistory.length - 1; i++) {
                metricsHistory[i] = metricsHistory[i + 1];
            }
            metricsHistory.pop();
        }
        
        metricsHistory.push(metrics);
        emit MetricsUpdated(metrics.totalValueLocked, metrics.totalBorrowed, metrics.utilizationRate);
    }

    function setAlertThresholds(
        uint256 _highUtilization,
        uint256 _lowHealthFactor,
        uint256 _largeLiquidation
    ) external onlyPoolAdmin {
        highUtilizationThreshold = _highUtilization;
        lowHealthFactorThreshold = _lowHealthFactor;
        largeLiquidationThreshold = _largeLiquidation;
    }

    // ============ Internal Functions ============
    
    function _getTokenBalance(address token) internal view returns (uint256) {
        if (token == address(0)) return 0;
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("totalSupply()")
        );
        if (!success) return 0;
        return abi.decode(data, (uint256));
    }

    function _calculateSupplyAPY(DataTypes.ReserveData memory reserve) internal pure returns (uint256) {
        return uint256(uint128(reserve.currentLiquidityRate)) / 1e23; // Convert from Ray (1e27) to basis points (1e4)
    }

    function _calculateBorrowAPY(DataTypes.ReserveData memory reserve) internal pure returns (uint256) {
        return uint256(uint128(reserve.currentVariableBorrowRate)) / 1e23; // Convert from Ray (1e27) to basis points (1e4)
    }

    function _triggerAlert(
        string memory alertType,
        address asset,
        address user,
        uint256 value,
        string memory message
    ) internal {
        if (alerts.length >= MAX_ALERTS) {
            // Remove oldest alert
            for (uint256 i = 0; i < alerts.length - 1; i++) {
                alerts[i] = alerts[i + 1];
            }
            alerts.pop();
        }
        
        alerts.push(AlertData({
            timestamp: block.timestamp,
            alertType: alertType,
            asset: asset,
            user: user,
            value: value,
            message: message
        }));
        
        emit AlertTriggered(alertType, asset, user, value);
    }
}
