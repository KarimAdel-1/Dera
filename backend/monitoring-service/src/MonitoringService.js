const { ethers } = require('ethers');
const AlertManager = require('./AlertManager');
const HealthChecker = require('./HealthChecker');
const MetricsCollector = require('./MetricsCollector');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * MonitoringService
 *
 * Real-time monitoring and emergency control system for Dera Protocol.
 *
 * RESPONSIBILITIES:
 * 1. Monitor protocol health metrics (TVL, utilization, health factors)
 * 2. Detect anomalies and critical events
 * 3. Send alerts to admins (email, Telegram, webhook)
 * 4. Health check all backend services
 * 5. Trigger emergency pause if critical thresholds exceeded
 * 6. Provide real-time dashboard
 *
 * MONITORED METRICS:
 * - Total Value Locked (TVL)
 * - Utilization rates per asset
 * - Average health factor
 * - Pending liquidations count
 * - Oracle price deviations
 * - Service uptime (liquidation bot, HCS service, staking service)
 * - Gas prices
 * - Unusual transaction patterns
 *
 * ALERT LEVELS:
 * - INFO: Normal operations, periodic reports
 * - WARNING: Attention needed, but not critical
 * - CRITICAL: Immediate action required
 * - EMERGENCY: Auto-trigger pause if configured
 */
class MonitoringService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contracts = {};
    this.alertManager = null;
    this.healthChecker = null;
    this.metricsCollector = null;
    this.isRunning = false;
    this.metrics = {
      totalAlerts: 0,
      criticalAlerts: 0,
      lastCheck: null,
      uptime: 0,
      servicesUp: 0,
      servicesDown: 0,
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      logger.info('Initializing Monitoring Service...');

      // Initialize Ethers provider
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL);
      this.wallet = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, this.provider);

      // Load contracts
      await this.loadContracts();

      // Initialize sub-services
      this.alertManager = new AlertManager();
      await this.alertManager.initialize();

      this.healthChecker = new HealthChecker(this.contracts);
      await this.healthChecker.initialize();

      this.metricsCollector = new MetricsCollector(this.contracts, this.provider);
      await this.metricsCollector.initialize();

      logger.info('✅ Monitoring Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Load contract instances
   */
  async loadContracts() {
    const poolABI = require('./abis/Pool.json');
    const configuratorABI = require('./abis/PoolConfigurator.json');
    const oracleABI = require('./abis/DeraOracle.json');
    const stakingABI = require('./abis/DeraNodeStaking.json');

    this.contracts.pool = new ethers.Contract(
      config.POOL_ADDRESS,
      poolABI,
      this.wallet
    );

    this.contracts.configurator = new ethers.Contract(
      config.POOL_CONFIGURATOR_ADDRESS,
      configuratorABI,
      this.wallet
    );

    this.contracts.oracle = new ethers.Contract(
      config.ORACLE_ADDRESS,
      oracleABI,
      this.provider
    );

    this.contracts.staking = new ethers.Contract(
      config.NODE_STAKING_CONTRACT_ADDRESS,
      stakingABI,
      this.provider
    );

    logger.info('✅ Contracts loaded');
  }

  /**
   * Start monitoring
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting Monitoring Service...');

    // Start health checks
    this.startHealthChecks();

    // Start metrics collection
    this.startMetricsCollection();

    // Start event monitoring
    this.startEventMonitoring();

    // Send startup notification
    await this.alertManager.sendAlert({
      level: 'INFO',
      title: 'Monitoring Service Started',
      message: 'Dera Protocol monitoring service is now active',
    });

    logger.info('✅ Service started successfully');
  }

  /**
   * Start health checks (periodic)
   */
  startHealthChecks() {
    logger.info('💓 Starting health checks...');
    logger.info(`   Interval: ${config.HEALTH_CHECK_INTERVAL_MS}ms`);

    // Run immediately
    this.performHealthCheck();

    // Then periodically
    this.healthCheckInterval = setInterval(
      () => this.performHealthCheck(),
      config.HEALTH_CHECK_INTERVAL_MS
    );
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    try {
      logger.debug('🔍 Performing health check...');

      const results = await this.healthChecker.checkAll();

      this.metrics.lastCheck = Date.now();

      // Count services
      this.metrics.servicesUp = results.filter(r => r.status === 'healthy').length;
      this.metrics.servicesDown = results.filter(r => r.status === 'unhealthy').length;

      // Check for critical issues
      const criticalIssues = results.filter(r => r.severity === 'CRITICAL');

      if (criticalIssues.length > 0) {
        logger.error(`🚨 ${criticalIssues.length} critical issue(s) detected!`);

        for (const issue of criticalIssues) {
          await this.handleCriticalIssue(issue);
        }
      }

      // Check for warnings
      const warnings = results.filter(r => r.severity === 'WARNING');

      if (warnings.length > 0) {
        logger.warn(`⚠️  ${warnings.length} warning(s) detected`);

        for (const warning of warnings) {
          await this.alertManager.sendAlert({
            level: 'WARNING',
            title: warning.name,
            message: warning.message,
            details: warning.details,
          });
        }
      }

      logger.debug('✅ Health check complete');

    } catch (error) {
      logger.error('Error performing health check:', error);
    }
  }

  /**
   * Handle critical issues
   */
  async handleCriticalIssue(issue) {
    try {
      logger.error(`🚨 CRITICAL: ${issue.name}`);
      logger.error(`   ${issue.message}`);

      this.metrics.criticalAlerts++;

      // Send critical alert
      await this.alertManager.sendAlert({
        level: 'CRITICAL',
        title: issue.name,
        message: issue.message,
        details: issue.details,
      });

      // Check if auto-pause is enabled and should trigger
      if (config.AUTO_PAUSE_ENABLED && issue.shouldPause) {
        logger.error('🛑 AUTO-PAUSE TRIGGERED');
        await this.triggerEmergencyPause(issue);
      }

    } catch (error) {
      logger.error('Error handling critical issue:', error);
    }
  }

  /**
   * Trigger emergency pause
   */
  async triggerEmergencyPause(reason) {
    try {
      logger.error('🛑 EMERGENCY PAUSE INITIATED');
      logger.error(`   Reason: ${reason.name}`);

      // Check if already paused
      const isPaused = await this.contracts.pool.paused();

      if (isPaused) {
        logger.warn('Protocol is already paused');
        return;
      }

      // Pause the protocol
      const tx = await this.contracts.pool.pause();
      logger.error(`⏳ Pause transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        logger.error('✅ PROTOCOL PAUSED SUCCESSFULLY');

        // Send emergency alert
        await this.alertManager.sendAlert({
          level: 'EMERGENCY',
          title: '🛑 EMERGENCY PAUSE ACTIVATED',
          message: `Protocol has been paused due to: ${reason.message}`,
          details: {
            reason: reason.name,
            transactionHash: tx.hash,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        logger.error('❌ Pause transaction failed');
      }

    } catch (error) {
      logger.error('Error triggering emergency pause:', error);

      // Alert that auto-pause failed
      await this.alertManager.sendAlert({
        level: 'EMERGENCY',
        title: '❌ AUTO-PAUSE FAILED',
        message: 'Emergency pause was triggered but transaction failed!',
        details: { error: error.message },
      });
    }
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    logger.info('📊 Starting metrics collection...');
    logger.info(`   Interval: ${config.METRICS_COLLECTION_INTERVAL_MS}ms`);

    // Collect immediately
    this.collectMetrics();

    // Then periodically
    this.metricsInterval = setInterval(
      () => this.collectMetrics(),
      config.METRICS_COLLECTION_INTERVAL_MS
    );
  }

  /**
   * Collect protocol metrics
   */
  async collectMetrics() {
    try {
      logger.debug('📊 Collecting metrics...');

      const metrics = await this.metricsCollector.collect();

      // Check thresholds
      await this.checkThresholds(metrics);

      logger.debug('✅ Metrics collected');

    } catch (error) {
      logger.error('Error collecting metrics:', error);
    }
  }

  /**
   * Check if metrics exceed thresholds
   */
  async checkThresholds(metrics) {
    const alerts = [];

    // Check average health factor
    if (metrics.avgHealthFactor < config.MIN_HEALTH_FACTOR_THRESHOLD) {
      alerts.push({
        level: 'CRITICAL',
        title: 'Low Average Health Factor',
        message: `Average health factor is ${metrics.avgHealthFactor.toFixed(4)} (threshold: ${config.MIN_HEALTH_FACTOR_THRESHOLD})`,
        shouldPause: true,
      });
    }

    // Check utilization rates
    for (const [asset, utilization] of Object.entries(metrics.utilization)) {
      if (utilization > config.MAX_UTILIZATION_THRESHOLD) {
        alerts.push({
          level: 'WARNING',
          title: 'High Utilization',
          message: `${asset} utilization is ${(utilization * 100).toFixed(2)}% (threshold: ${config.MAX_UTILIZATION_THRESHOLD * 100}%)`,
        });
      }
    }

    // Check pending liquidations
    if (metrics.pendingLiquidations > config.MAX_PENDING_LIQUIDATIONS) {
      alerts.push({
        level: 'CRITICAL',
        title: 'High Pending Liquidations',
        message: `${metrics.pendingLiquidations} positions need liquidation (threshold: ${config.MAX_PENDING_LIQUIDATIONS})`,
        shouldPause: false, // Don't auto-pause, but alert
      });
    }

    // Send alerts
    for (const alert of alerts) {
      if (alert.level === 'CRITICAL') {
        await this.handleCriticalIssue(alert);
      } else {
        await this.alertManager.sendAlert(alert);
      }
    }
  }

  /**
   * Start event monitoring
   */
  startEventMonitoring() {
    logger.info('👂 Starting event monitoring...');

    // Monitor emergency pause events
    this.contracts.pool.on('Paused', async (event) => {
      logger.error('🛑 Protocol Paused event detected');

      await this.alertManager.sendAlert({
        level: 'EMERGENCY',
        title: '🛑 Protocol Paused',
        message: 'The protocol has been paused',
      });
    });

    // Monitor unpause events
    this.contracts.pool.on('Unpaused', async (event) => {
      logger.info('▶️  Protocol Unpaused event detected');

      await this.alertManager.sendAlert({
        level: 'INFO',
        title: '▶️  Protocol Unpaused',
        message: 'The protocol has been unpaused and is operational',
      });
    });

    // Monitor large liquidations
    this.contracts.pool.on('LiquidationCall', async (
      collateralAsset,
      debtAsset,
      user,
      debtToCover,
      liquidatedCollateral,
      liquidator,
      receiveSupplyToken,
      event
    ) => {
      const debtUSD = Number(ethers.formatEther(debtToCover));

      if (debtUSD > config.LARGE_LIQUIDATION_THRESHOLD) {
        await this.alertManager.sendAlert({
          level: 'WARNING',
          title: 'Large Liquidation',
          message: `Liquidation of $${debtUSD.toFixed(2)} detected`,
          details: {
            user,
            liquidator,
            debtToCover: debtUSD,
            txHash: event.log.transactionHash,
          },
        });
      }
    });

    logger.info('✅ Event monitoring started');
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      uptime: this.metrics.lastCheck
        ? Date.now() - this.metrics.lastCheck + this.metrics.uptime
        : 0,
    };
  }

  /**
   * Stop the service
   */
  async stop() {
    logger.info('⏸️  Stopping Monitoring Service...');

    this.isRunning = false;

    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Remove event listeners
    if (this.contracts.pool) {
      await this.contracts.pool.removeAllListeners();
    }

    logger.info('✅ Service stopped');
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    logger.info('🛑 Shutting down Monitoring Service...');

    await this.stop();

    // Send shutdown notification
    await this.alertManager.sendAlert({
      level: 'WARNING',
      title: 'Monitoring Service Stopped',
      message: 'Dera Protocol monitoring service has been stopped',
    });

    logger.info('📊 Final Metrics:');
    logger.info(JSON.stringify(this.getMetrics(), null, 2));
    logger.info('👋 Goodbye!');
  }
}

module.exports = MonitoringService;
