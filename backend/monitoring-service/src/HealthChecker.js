const axios = require('axios');
const { ethers } = require('ethers');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * HealthChecker
 *
 * Checks health of:
 * - Smart contracts (Pool, Oracle, Staking)
 * - Backend services (Liquidation bot, HCS service, Staking service)
 * - External dependencies (RPC, Mirror Node, Pyth)
 */
class HealthChecker {
  constructor(contracts) {
    this.contracts = contracts;
  }

  async initialize() {
    logger.info('Initializing Health Checker...');
    logger.info('✅ Health Checker initialized');
  }

  /**
   * Check all components
   */
  async checkAll() {
    const results = [];

    // Check contracts
    results.push(await this.checkPool());
    results.push(await this.checkOracle());
    results.push(await this.checkStaking());

    // Check backend services
    results.push(await this.checkLiquidationBot());
    results.push(await this.checkHCSService());
    results.push(await this.checkStakingService());

    // Check external dependencies
    results.push(await this.checkRPC());
    results.push(await this.checkMirrorNode());

    return results;
  }

  /**
   * Check Pool contract
   */
  async checkPool() {
    try {
      // Check if paused
      const isPaused = await this.contracts.pool.paused();

      if (isPaused) {
        return {
          name: 'Pool Contract',
          status: 'unhealthy',
          severity: 'CRITICAL',
          message: 'Protocol is paused',
          shouldPause: false,
        };
      }

      // Check basic functionality
      const assetsList = await this.contracts.pool.getAssetsList();

      return {
        name: 'Pool Contract',
        status: 'healthy',
        severity: 'INFO',
        message: `${assetsList.length} assets configured`,
      };

    } catch (error) {
      return {
        name: 'Pool Contract',
        status: 'unhealthy',
        severity: 'CRITICAL',
        message: 'Unable to query Pool contract',
        details: { error: error.message },
        shouldPause: false,
      };
    }
  }

  /**
   * Check Oracle
   */
  async checkOracle() {
    try {
      // Test oracle by getting a price
      // Assumes at least one asset is configured
      const assetsList = await this.contracts.pool.getAssetsList();

      if (assetsList.length === 0) {
        return {
          name: 'Oracle',
          status: 'healthy',
          severity: 'INFO',
          message: 'No assets to check prices for',
        };
      }

      const asset = assetsList[0];
      const price = await this.contracts.oracle.getAssetPrice(asset);

      if (price === 0n) {
        return {
          name: 'Oracle',
          status: 'unhealthy',
          severity: 'CRITICAL',
          message: `Zero price returned for ${asset}`,
          shouldPause: true,
        };
      }

      return {
        name: 'Oracle',
        status: 'healthy',
        severity: 'INFO',
        message: 'Oracle responding correctly',
      };

    } catch (error) {
      return {
        name: 'Oracle',
        status: 'unhealthy',
        severity: 'CRITICAL',
        message: 'Oracle not responding',
        details: { error: error.message },
        shouldPause: true,
      };
    }
  }

  /**
   * Check Staking contract
   */
  async checkStaking() {
    try {
      const stakingInfo = await this.contracts.staking.getStakingInfo();

      return {
        name: 'Staking Contract',
        status: 'healthy',
        severity: 'INFO',
        message: `${ethers.formatEther(stakingInfo.currentlyStaked)} HBAR staked`,
      };

    } catch (error) {
      return {
        name: 'Staking Contract',
        status: 'unhealthy',
        severity: 'WARNING',
        message: 'Unable to query Staking contract',
        details: { error: error.message },
      };
    }
  }

  /**
   * Check Liquidation Bot service
   */
  async checkLiquidationBot() {
    try {
      // Attempt HTTP health check if bot exposes endpoint
      // For now, just check if process is running via config
      const isRunning = await this.checkServiceHealth(config.LIQUIDATION_BOT_HEALTH_URL);

      if (!isRunning) {
        return {
          name: 'Liquidation Bot',
          status: 'unhealthy',
          severity: 'CRITICAL',
          message: 'Liquidation bot is not responding',
          shouldPause: false,
        };
      }

      return {
        name: 'Liquidation Bot',
        status: 'healthy',
        severity: 'INFO',
        message: 'Service operational',
      };

    } catch (error) {
      return {
        name: 'Liquidation Bot',
        status: 'unknown',
        severity: 'WARNING',
        message: 'Unable to check service status',
        details: { error: error.message },
      };
    }
  }

  /**
   * Check HCS Event Service
   */
  async checkHCSService() {
    try {
      const isRunning = await this.checkServiceHealth(config.HCS_SERVICE_HEALTH_URL);

      if (!isRunning) {
        return {
          name: 'HCS Service',
          status: 'unhealthy',
          severity: 'WARNING',
          message: 'HCS service is not responding',
        };
      }

      return {
        name: 'HCS Service',
        status: 'healthy',
        severity: 'INFO',
        message: 'Service operational',
      };

    } catch (error) {
      return {
        name: 'HCS Service',
        status: 'unknown',
        severity: 'WARNING',
        message: 'Unable to check service status',
      };
    }
  }

  /**
   * Check Staking Service
   */
  async checkStakingService() {
    try {
      const isRunning = await this.checkServiceHealth(config.STAKING_SERVICE_HEALTH_URL);

      if (!isRunning) {
        return {
          name: 'Staking Service',
          status: 'unhealthy',
          severity: 'WARNING',
          message: 'Staking service is not responding',
        };
      }

      return {
        name: 'Staking Service',
        status: 'healthy',
        severity: 'INFO',
        message: 'Service operational',
      };

    } catch (error) {
      return {
        name: 'Staking Service',
        status: 'unknown',
        severity: 'WARNING',
        message: 'Unable to check service status',
      };
    }
  }

  /**
   * Check RPC endpoint
   */
  async checkRPC() {
    try {
      const blockNumber = await this.contracts.pool.provider.getBlockNumber();

      if (!blockNumber || blockNumber === 0) {
        return {
          name: 'RPC Endpoint',
          status: 'unhealthy',
          severity: 'CRITICAL',
          message: 'RPC not returning block number',
          shouldPause: true,
        };
      }

      return {
        name: 'RPC Endpoint',
        status: 'healthy',
        severity: 'INFO',
        message: `Block: ${blockNumber}`,
      };

    } catch (error) {
      return {
        name: 'RPC Endpoint',
        status: 'unhealthy',
        severity: 'CRITICAL',
        message: 'RPC endpoint not responding',
        details: { error: error.message },
        shouldPause: true,
      };
    }
  }

  /**
   * Check Mirror Node
   */
  async checkMirrorNode() {
    try {
      const response = await axios.get(`${config.MIRROR_NODE_URL}/api/v1/network/nodes`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        return {
          name: 'Mirror Node',
          status: 'healthy',
          severity: 'INFO',
          message: 'Mirror Node API responding',
        };
      }

      return {
        name: 'Mirror Node',
        status: 'unhealthy',
        severity: 'WARNING',
        message: `Mirror Node returned status ${response.status}`,
      };

    } catch (error) {
      return {
        name: 'Mirror Node',
        status: 'unhealthy',
        severity: 'WARNING',
        message: 'Mirror Node not responding',
        details: { error: error.message },
      };
    }
  }

  /**
   * Generic service health check via HTTP
   */
  async checkServiceHealth(url) {
    if (!url) {
      return false;
    }

    try {
      const response = await axios.get(url, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = HealthChecker;
