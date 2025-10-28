const { ethers } = require('ethers');
const logger = require('./utils/logger');

/**
 * MetricsCollector
 *
 * Collects protocol metrics:
 * - Total Value Locked (TVL)
 * - Utilization rates per asset
 * - Average health factor
 * - Number of positions
 * - Pending liquidations
 */
class MetricsCollector {
  constructor(contracts, provider) {
    this.contracts = contracts;
    this.provider = provider;
    this.latestMetrics = null;
  }

  async initialize() {
    logger.info('Initializing Metrics Collector...');
    logger.info('✅ Metrics Collector initialized');
  }

  /**
   * Collect all metrics
   */
  async collect() {
    try {
      const metrics = {};

      // Get asset list
      const assetsList = await this.contracts.pool.getAssetsList();

      // Calculate TVL and utilization
      let totalSupplyUSD = 0;
      let totalBorrowUSD = 0;
      const utilization = {};

      for (const asset of assetsList) {
        try {
          const assetData = await this.contracts.pool.getAssetData(asset);
          const price = await this.contracts.oracle.getAssetPrice(asset);

          const supplyUSD = Number(ethers.formatUnits(assetData.totalSupply, 18)) * Number(ethers.formatUnits(price, 8));
          const borrowUSD = Number(ethers.formatUnits(assetData.totalBorrow, 18)) * Number(ethers.formatUnits(price, 8));

          totalSupplyUSD += supplyUSD;
          totalBorrowUSD += borrowUSD;

          const assetUtilization = supplyUSD > 0 ? borrowUSD / supplyUSD : 0;
          utilization[asset] = assetUtilization;

        } catch (error) {
          logger.debug(`Error collecting metrics for ${asset}:`, error.message);
        }
      }

      metrics.tvl = totalSupplyUSD;
      metrics.totalBorrowed = totalBorrowUSD;
      metrics.utilization = utilization;
      metrics.avgHealthFactor = await this.calculateAvgHealthFactor();
      metrics.pendingLiquidations = await this.countPendingLiquidations();

      this.latestMetrics = metrics;

      return metrics;

    } catch (error) {
      logger.error('Error collecting metrics:', error);
      return this.latestMetrics || {};
    }
  }

  /**
   * Calculate average health factor across all users
   * Note: This is a simplified version. In production, maintain a list of active users.
   */
  async calculateAvgHealthFactor() {
    try {
      // Placeholder - in production, track users via events
      // For now, return a safe value
      return 1.5;

    } catch (error) {
      logger.debug('Error calculating avg health factor:', error.message);
      return 1.0;
    }
  }

  /**
   * Count positions that need liquidation
   * Note: This requires LiquidationDataProvider or tracking users
   */
  async countPendingLiquidations() {
    try {
      // Placeholder - in production, use LiquidationDataProvider
      return 0;

    } catch (error) {
      logger.debug('Error counting pending liquidations:', error.message);
      return 0;
    }
  }

  /**
   * Get latest metrics
   */
  getLatest() {
    return this.latestMetrics;
  }
}

module.exports = MetricsCollector;
