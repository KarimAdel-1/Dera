const { ethers } = require('ethers');
const winston = require('winston');
const config = require('./config');
const PoolABI = require('./abis/Pool.json');

// Configure logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'rate-updater.log' })
  ]
});

class RateUpdater {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.poolContract = null;
    this.isRunning = false;
    this.updateCount = 0;
    this.failureCount = 0;
    this.lastUpdateTime = null;
    this.updateInterval = null;
  }

  /**
   * Initialize the Rate Updater
   */
  async initialize() {
    try {
      logger.info('Initializing Rate Updater Service...');

      // Validate configuration
      this._validateConfig();

      // Setup provider and wallet
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
      this.wallet = new ethers.Wallet(config.HEDERA_PRIVATE_KEY, this.provider);

      // Initialize Pool contract
      this.poolContract = new ethers.Contract(
        config.POOL_ADDRESS,
        PoolABI.abi,
        this.wallet
      );

      // Test connection
      await this._testConnection();

      logger.info('✅ Rate Updater Service initialized successfully');
      logger.info(`📊 Update interval: ${config.UPDATE_INTERVAL_MS}ms`);
      logger.info(`🎯 Assets to update: ${config.ASSETS.length || 'ALL'}`);
      logger.info(`🔧 Dry run mode: ${config.DRY_RUN ? 'ON' : 'OFF'}`);

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize Rate Updater:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  _validateConfig() {
    if (!config.POOL_ADDRESS) {
      throw new Error('POOL_ADDRESS is required');
    }
    if (!config.HEDERA_PRIVATE_KEY) {
      throw new Error('HEDERA_PRIVATE_KEY is required');
    }
    if (!config.RPC_URL) {
      throw new Error('RPC_URL is required');
    }
  }

  /**
   * Test connection to Pool contract
   */
  async _testConnection() {
    try {
      // Try to call a view function
      const paused = await this.poolContract.paused();
      logger.info(`Pool contract connection test: ${paused ? 'PAUSED' : 'ACTIVE'}`);

      if (paused) {
        logger.warn('⚠️  WARNING: Pool contract is currently PAUSED!');
      }
    } catch (error) {
      throw new Error(`Failed to connect to Pool contract: ${error.message}`);
    }
  }

  /**
   * Start the rate updater service
   */
  start() {
    if (this.isRunning) {
      logger.warn('Rate Updater is already running');
      return;
    }

    logger.info('🚀 Starting Rate Updater Service...');
    this.isRunning = true;

    // Run immediately on start
    this.updateRates();

    // Then run on interval
    this.updateInterval = setInterval(() => {
      this.updateRates();
    }, config.UPDATE_INTERVAL_MS);

    logger.info(`✅ Rate Updater Service started (updates every ${config.UPDATE_INTERVAL_MS}ms)`);
  }

  /**
   * Stop the rate updater service
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Rate Updater is not running');
      return;
    }

    logger.info('🛑 Stopping Rate Updater Service...');
    this.isRunning = false;

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    logger.info('✅ Rate Updater Service stopped');
    logger.info(`📊 Total updates: ${this.updateCount}, Failures: ${this.failureCount}`);
  }

  /**
   * Update interest rates for all configured assets
   */
  async updateRates() {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();
    logger.info('🔄 Starting rate update cycle...');

    try {
      // Get list of assets
      const assetsToUpdate = await this._getAssetsToUpdate();

      if (assetsToUpdate.length === 0) {
        logger.warn('⚠️  No assets to update');
        return;
      }

      logger.info(`📋 Found ${assetsToUpdate.length} assets to update`);

      // Process assets in batches
      const results = await this._processAssetsBatch(assetsToUpdate);

      // Log results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      this.updateCount++;
      this.lastUpdateTime = new Date();

      const duration = Date.now() - startTime;
      logger.info(`✅ Rate update complete: ${successful} successful, ${failed} failed (${duration}ms)`);

      if (failed > 0) {
        this.failureCount++;
        await this._sendAlert('Rate update had failures', { successful, failed, results });
      }

    } catch (error) {
      this.failureCount++;
      logger.error('❌ Rate update cycle failed:', error);
      await this._sendAlert('Rate update cycle failed', { error: error.message });
    }
  }

  /**
   * Get list of assets to update
   */
  async _getAssetsToUpdate() {
    try {
      // If specific assets configured, use those
      if (config.ASSETS && config.ASSETS.length > 0) {
        logger.info(`Using configured assets: ${config.ASSETS.length}`);
        return config.ASSETS;
      }

      // Otherwise get all assets from Pool
      logger.info('Fetching all assets from Pool...');
      const assetList = await this.poolContract.getAssetsList();
      logger.info(`Found ${assetList.length} assets in Pool`);
      return assetList;
    } catch (error) {
      logger.error('Failed to get assets list:', error);
      throw error;
    }
  }

  /**
   * Process assets in batches
   */
  async _processAssetsBatch(assets) {
    const results = [];
    const batchSize = config.BATCH_SIZE;

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assets.length / batchSize)}`);

      const batchResults = await Promise.all(
        batch.map(asset => this._updateAssetRate(asset))
      );

      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the network
      if (i + batchSize < assets.length) {
        await this._sleep(1000);
      }
    }

    return results;
  }

  /**
   * Update rate for a single asset
   */
  async _updateAssetRate(asset) {
    const result = {
      asset,
      success: false,
      error: null,
      txHash: null,
      gasUsed: null
    };

    try {
      logger.info(`📊 Updating rate for asset: ${asset}`);

      // Dry run mode - simulate without sending transaction
      if (config.DRY_RUN) {
        logger.info(`[DRY RUN] Would update rate for ${asset}`);
        result.success = true;
        return result;
      }

      // Call syncRatesState for the asset
      // This updates the liquidity and borrow rates based on current utilization
      const tx = await this.poolContract.syncRatesState(asset, {
        gasLimit: config.GAS_LIMIT
      });

      logger.info(`🔄 Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      result.success = true;
      result.txHash = receipt.hash;
      result.gasUsed = receipt.gasUsed.toString();

      logger.info(`✅ Rate updated for ${asset} (gas: ${result.gasUsed})`);

      // Log rate changes if available from events
      await this._logRateChanges(receipt, asset);

    } catch (error) {
      result.error = error.message;
      logger.error(`❌ Failed to update rate for ${asset}:`, error.message);

      // Retry logic
      if (config.MAX_RETRIES > 0) {
        logger.info(`🔄 Retrying... (max ${config.MAX_RETRIES} retries)`);
        return await this._retryUpdateAssetRate(asset);
      }
    }

    return result;
  }

  /**
   * Retry updating asset rate
   */
  async _retryUpdateAssetRate(asset, attempt = 1) {
    if (attempt > config.MAX_RETRIES) {
      return {
        asset,
        success: false,
        error: `Failed after ${config.MAX_RETRIES} retries`
      };
    }

    logger.info(`Retry attempt ${attempt}/${config.MAX_RETRIES} for ${asset}`);
    await this._sleep(config.RETRY_DELAY_MS);

    try {
      return await this._updateAssetRate(asset);
    } catch (error) {
      return await this._retryUpdateAssetRate(asset, attempt + 1);
    }
  }

  /**
   * Log rate changes from transaction receipt
   */
  async _logRateChanges(receipt, asset) {
    try {
      // Look for AssetDataUpdated or similar events
      const events = receipt.logs
        .map(log => {
          try {
            return this.poolContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event !== null);

      for (const event of events) {
        if (event.name === 'AssetDataUpdated' || event.name === 'RatesUpdated') {
          logger.info(`📈 Rate Change Event:`, {
            asset: event.args.asset || asset,
            liquidityRate: event.args.liquidityRate?.toString(),
            borrowRate: event.args.borrowRate?.toString()
          });
        }
      }
    } catch (error) {
      // Ignore errors in event parsing
    }
  }

  /**
   * Send alert on failure
   */
  async _sendAlert(title, data) {
    if (!config.ALERT_ON_FAILURE || !config.ALERT_WEBHOOK_URL) {
      return;
    }

    try {
      const axios = require('axios');
      await axios.post(config.ALERT_WEBHOOK_URL, {
        title,
        timestamp: new Date().toISOString(),
        data
      });
    } catch (error) {
      logger.error('Failed to send alert:', error.message);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      updateCount: this.updateCount,
      failureCount: this.failureCount,
      lastUpdateTime: this.lastUpdateTime,
      successRate: this.updateCount > 0
        ? ((this.updateCount - this.failureCount) / this.updateCount * 100).toFixed(2) + '%'
        : 'N/A',
      configuration: {
        poolAddress: config.POOL_ADDRESS,
        updateInterval: config.UPDATE_INTERVAL_MS,
        assetsCount: config.ASSETS.length || 'ALL',
        dryRun: config.DRY_RUN
      }
    };
  }

  /**
   * Sleep utility
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RateUpdater;
