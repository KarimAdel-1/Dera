const { ethers } = require('ethers');
const { Client, TopicMessageSubmitTransaction, TopicId } = require('@hashgraph/sdk');
const EventQueue = require('./EventQueue');
const MirrorNodeClient = require('./MirrorNodeClient');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * HCSEventService
 *
 * Listens to DeraHCSEventStreamer contract events and submits them to HCS topics.
 *
 * ARCHITECTURE:
 * 1. Listen to HCSEventQueued events from DeraHCSEventStreamer contract
 * 2. Queue events locally with SQLite for persistence
 * 3. Batch process events and submit to HCS topics
 * 4. Confirm submissions back to contract
 * 5. Retry failed submissions with exponential backoff
 *
 * FLOW:
 * Smart Contract Event → EventListener → EventQueue → HCS Submission → Confirmation
 */
class HCSEventService {
  constructor() {
    this.provider = null;
    this.hederaClient = null;
    this.streamerContract = null;
    this.eventQueue = null;
    this.mirrorNodeClient = null;
    this.isRunning = false;
    this.eventListener = null;
    this.metrics = {
      totalEventsReceived: 0,
      totalEventsSubmitted: 0,
      failedSubmissions: 0,
      pendingInQueue: 0,
      lastSubmissionTime: null,
    };
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      logger.info('Initializing HCS Event Service...');

      // Initialize Hedera client
      if (config.NETWORK === 'mainnet') {
        this.hederaClient = Client.forMainnet();
      } else {
        this.hederaClient = Client.forTestnet();
      }

      this.hederaClient.setOperator(
        config.HEDERA_OPERATOR_ID,
        config.HEDERA_OPERATOR_KEY
      );

      logger.info(`✅ Hedera client initialized: ${config.NETWORK}`);

      // Initialize Ethers provider for listening to events
      this.provider = new ethers.JsonRpcProvider(config.RPC_URL);

      // Load DeraHCSEventStreamer contract
      const streamerABI = require('./abis/DeraHCSEventStreamer.json');
      this.streamerContract = new ethers.Contract(
        config.HCS_EVENT_STREAMER_ADDRESS,
        streamerABI,
        this.provider
      );

      logger.info(`✅ Contract loaded: ${config.HCS_EVENT_STREAMER_ADDRESS}`);

      // Initialize event queue (SQLite-backed)
      this.eventQueue = new EventQueue(config.DB_PATH);
      await this.eventQueue.initialize();

      logger.info('✅ Event queue initialized');

      // Initialize Mirror Node client
      this.mirrorNodeClient = new MirrorNodeClient(config.MIRROR_NODE_URL);

      logger.info('✅ Mirror Node client initialized');

      // Get pending events from queue
      const pendingCount = await this.eventQueue.getPendingCount();
      this.metrics.pendingInQueue = pendingCount;

      logger.info(`📊 Pending events in queue: ${pendingCount}`);
      logger.info('✅ HCS Event Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize service:', error);
      throw error;
    }
  }

  /**
   * Start the service
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🚀 Starting HCS Event Service...');

    // Start listening to new events from contract
    this.startEventListener();

    // Start processing queued events
    this.startQueueProcessor();

    logger.info('✅ Service started successfully');
  }

  /**
   * Listen to HCSEventQueued events from contract
   */
  startEventListener() {
    logger.info('👂 Starting event listener...');

    // Listen to HCSEventQueued events
    this.eventListener = this.streamerContract.on(
      'HCSEventQueued',
      async (topicId, eventHash, eventType, eventData, event) => {
        try {
          logger.info(`📥 New event received: ${eventType}`);
          logger.debug(`   Topic ID: ${topicId}`);
          logger.debug(`   Event Hash: ${eventHash}`);

          this.metrics.totalEventsReceived++;

          // Add to queue
          await this.eventQueue.addEvent({
            topicId: topicId.toString(),
            eventHash: eventHash,
            eventType: eventType,
            eventData: eventData,
            blockNumber: event.log.blockNumber,
            transactionHash: event.log.transactionHash,
            timestamp: Math.floor(Date.now() / 1000),
          });

          this.metrics.pendingInQueue = await this.eventQueue.getPendingCount();

          logger.info(`✅ Event queued: ${eventType} (${this.metrics.pendingInQueue} pending)`);

        } catch (error) {
          logger.error('Error handling event:', error);
        }
      }
    );

    // Also process historical events on startup
    this.processHistoricalEvents();

    logger.info('✅ Event listener started');
  }

  /**
   * Process historical events that may have been missed
   */
  async processHistoricalEvents() {
    try {
      logger.info('🔍 Checking for historical events...');

      // Get the last processed block from queue
      const lastBlock = await this.eventQueue.getLastProcessedBlock();
      const currentBlock = await this.provider.getBlockNumber();

      if (currentBlock - lastBlock > 1) {
        logger.info(`📚 Processing ${currentBlock - lastBlock} missed blocks...`);

        // Query past events
        const filter = this.streamerContract.filters.HCSEventQueued();
        const events = await this.streamerContract.queryFilter(
          filter,
          lastBlock + 1,
          currentBlock
        );

        logger.info(`Found ${events.length} historical events`);

        for (const event of events) {
          const { topicId, eventHash, eventType, eventData } = event.args;

          // Check if already processed
          const exists = await this.eventQueue.eventExists(eventHash);
          if (!exists) {
            await this.eventQueue.addEvent({
              topicId: topicId.toString(),
              eventHash: eventHash,
              eventType: eventType,
              eventData: eventData,
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
              timestamp: Math.floor(Date.now() / 1000),
            });

            logger.info(`✅ Added historical event: ${eventType}`);
          }
        }

        this.metrics.pendingInQueue = await this.eventQueue.getPendingCount();
      }

    } catch (error) {
      logger.error('Error processing historical events:', error);
    }
  }

  /**
   * Start queue processor (runs periodically)
   */
  startQueueProcessor() {
    logger.info('⚙️  Starting queue processor...');
    logger.info(`   Batch size: ${config.BATCH_SIZE}`);
    logger.info(`   Process interval: ${config.PROCESS_INTERVAL_MS}ms`);

    // Process queue immediately
    this.processQueue();

    // Then process periodically
    this.processorInterval = setInterval(
      () => this.processQueue(),
      config.PROCESS_INTERVAL_MS
    );

    logger.info('✅ Queue processor started');
  }

  /**
   * Process events from queue and submit to HCS
   */
  async processQueue() {
    try {
      // Get pending events (batch)
      const events = await this.eventQueue.getPendingEvents(config.BATCH_SIZE);

      if (events.length === 0) {
        logger.debug('No pending events to process');
        return;
      }

      logger.info(`📤 Processing ${events.length} event(s)...`);

      for (const event of events) {
        await this.submitToHCS(event);
      }

    } catch (error) {
      logger.error('Error processing queue:', error);
    }
  }

  /**
   * Submit event to HCS topic
   */
  async submitToHCS(event) {
    try {
      const { id, topicId, eventHash, eventType, eventData } = event;

      logger.info(`📨 Submitting ${eventType} to HCS topic ${topicId}...`);

      // Parse topic ID (format: "123456" -> TopicId)
      const hcsTopicId = TopicId.fromString(`0.0.${topicId}`);

      // Create HCS message
      const message = JSON.stringify({
        eventType,
        eventHash,
        eventData,
        timestamp: event.timestamp,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });

      // Submit to HCS
      const transaction = new TopicMessageSubmitTransaction({
        topicId: hcsTopicId,
        message: message,
      });

      const response = await transaction.execute(this.hederaClient);
      const receipt = await response.getReceipt(this.hederaClient);

      if (receipt.status.toString() === 'SUCCESS') {
        logger.info(`✅ HCS submission successful: ${eventType}`);
        logger.debug(`   Topic: ${hcsTopicId.toString()}`);
        logger.debug(`   Sequence: ${receipt.topicSequenceNumber.toString()}`);

        // Mark as submitted in queue
        await this.eventQueue.markAsSubmitted(id, receipt.topicSequenceNumber.toString());

        // Confirm submission on-chain (optional, can be batched)
        if (config.CONFIRM_ON_CHAIN) {
          await this.confirmSubmissionOnChain(eventHash);
        }

        this.metrics.totalEventsSubmitted++;
        this.metrics.lastSubmissionTime = new Date();

      } else {
        throw new Error(`HCS submission failed: ${receipt.status.toString()}`);
      }

    } catch (error) {
      logger.error(`❌ Failed to submit event to HCS:`, error);

      // Increment retry count
      await this.eventQueue.incrementRetryCount(event.id);

      this.metrics.failedSubmissions++;

      // If max retries exceeded, mark as failed
      if (event.retry_count >= config.MAX_RETRIES) {
        logger.error(`Max retries exceeded for event ${event.eventHash}`);
        await this.eventQueue.markAsFailed(event.id, error.message);
      }
    }

    this.metrics.pendingInQueue = await this.eventQueue.getPendingCount();
  }

  /**
   * Confirm HCS submission on-chain (optional)
   */
  async confirmSubmissionOnChain(eventHash) {
    try {
      // This would require a wallet with permissions to call confirmHCSSubmission
      // For now, we'll skip this as it requires gas costs
      logger.debug(`Skipping on-chain confirmation for ${eventHash}`);

      // Future implementation:
      // const wallet = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, this.provider);
      // const contract = this.streamerContract.connect(wallet);
      // const tx = await contract.confirmHCSSubmission(eventHash);
      // await tx.wait();

    } catch (error) {
      logger.error('Error confirming submission on-chain:', error);
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      successRate: this.metrics.totalEventsReceived > 0
        ? ((this.metrics.totalEventsSubmitted / this.metrics.totalEventsReceived) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  /**
   * Stop the service
   */
  async stop() {
    logger.info('⏸️  Stopping HCS Event Service...');

    this.isRunning = false;

    // Stop event listener
    if (this.eventListener) {
      await this.streamerContract.removeAllListeners();
      this.eventListener = null;
    }

    // Stop queue processor
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
      this.processorInterval = null;
    }

    // Close Hedera client
    if (this.hederaClient) {
      this.hederaClient.close();
    }

    // Close database
    if (this.eventQueue) {
      await this.eventQueue.close();
    }

    logger.info('✅ Service stopped');
  }

  /**
   * Shutdown gracefully
   */
  async shutdown() {
    logger.info('🛑 Shutting down HCS Event Service...');

    await this.stop();

    logger.info('📊 Final Metrics:');
    logger.info(JSON.stringify(this.getMetrics(), null, 2));
    logger.info('👋 Goodbye!');
  }
}

module.exports = HCSEventService;
