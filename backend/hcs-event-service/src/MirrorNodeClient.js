const axios = require('axios');
const logger = require('./utils/logger');

/**
 * MirrorNodeClient
 *
 * Client for querying Hedera Mirror Node REST API.
 * Used to verify HCS submissions and query historical data.
 */
class MirrorNodeClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Get messages from HCS topic
   */
  async getTopicMessages(topicId, options = {}) {
    try {
      const params = {
        limit: options.limit || 10,
        order: options.order || 'desc',
      };

      if (options.sequenceNumber) {
        params.sequencenumber = options.sequenceNumber;
      }

      if (options.timestamp) {
        params.timestamp = options.timestamp;
      }

      const response = await this.client.get(`/api/v1/topics/${topicId}/messages`, {
        params,
      });

      return response.data.messages || [];

    } catch (error) {
      logger.error(`Error fetching topic messages for ${topicId}:`, error.message);
      return [];
    }
  }

  /**
   * Get specific message by sequence number
   */
  async getMessage(topicId, sequenceNumber) {
    try {
      const response = await this.client.get(
        `/api/v1/topics/${topicId}/messages/${sequenceNumber}`
      );

      return response.data;

    } catch (error) {
      logger.error(`Error fetching message ${sequenceNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Verify event was submitted to HCS
   */
  async verifySubmission(topicId, sequenceNumber, expectedHash) {
    try {
      const message = await this.getMessage(topicId, sequenceNumber);

      if (!message) {
        return false;
      }

      // Decode message (base64)
      const messageContent = Buffer.from(message.message, 'base64').toString('utf-8');
      const messageData = JSON.parse(messageContent);

      // Verify event hash matches
      return messageData.eventHash === expectedHash;

    } catch (error) {
      logger.error('Error verifying submission:', error);
      return false;
    }
  }

  /**
   * Get topic info
   */
  async getTopicInfo(topicId) {
    try {
      const response = await this.client.get(`/api/v1/topics/${topicId}`);
      return response.data;

    } catch (error) {
      logger.error(`Error fetching topic info for ${topicId}:`, error.message);
      return null;
    }
  }

  /**
   * Get recent protocol events from all topics
   */
  async getRecentEvents(topicIds, limit = 100) {
    try {
      const allEvents = [];

      for (const topicId of topicIds) {
        const messages = await this.getTopicMessages(topicId, { limit });

        for (const message of messages) {
          try {
            const content = Buffer.from(message.message, 'base64').toString('utf-8');
            const eventData = JSON.parse(content);

            allEvents.push({
              topicId,
              sequenceNumber: message.sequence_number,
              consensusTimestamp: message.consensus_timestamp,
              ...eventData,
            });
          } catch (error) {
            logger.debug('Error parsing message:', error.message);
          }
        }
      }

      // Sort by timestamp (most recent first)
      allEvents.sort((a, b) => b.timestamp - a.timestamp);

      return allEvents.slice(0, limit);

    } catch (error) {
      logger.error('Error fetching recent events:', error);
      return [];
    }
  }

  /**
   * Get statistics for a topic
   */
  async getTopicStats(topicId) {
    try {
      const topicInfo = await this.getTopicInfo(topicId);

      if (!topicInfo) {
        return null;
      }

      return {
        topicId: topicInfo.topic_id,
        memo: topicInfo.memo,
        submitKey: topicInfo.submit_key,
        createdTimestamp: topicInfo.created_timestamp,
        totalMessages: topicInfo.sequence_number || 0,
      };

    } catch (error) {
      logger.error('Error getting topic stats:', error);
      return null;
    }
  }
}

module.exports = MirrorNodeClient;
