const Database = require('better-sqlite3');
const logger = require('./utils/logger');

/**
 * EventQueue
 *
 * SQLite-backed queue for managing HCS event submissions.
 * Provides persistence, retry logic, and failure tracking.
 */
class EventQueue {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database and create tables
   */
  async initialize() {
    try {
      this.db = new Database(this.dbPath);

      // Create events table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id TEXT NOT NULL,
          event_hash TEXT UNIQUE NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT NOT NULL,
          block_number INTEGER NOT NULL,
          transaction_hash TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          retry_count INTEGER DEFAULT 0,
          hcs_sequence_number TEXT,
          error_message TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      // Create indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_status ON events(status);
        CREATE INDEX IF NOT EXISTS idx_event_hash ON events(event_hash);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
      `);

      // Create metadata table for tracking
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);

      logger.info('✅ Database initialized');

    } catch (error) {
      logger.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Add event to queue
   */
  async addEvent(event) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO events (
          topic_id, event_hash, event_type, event_data,
          block_number, transaction_hash, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        event.topicId,
        event.eventHash,
        event.eventType,
        event.eventData,
        event.blockNumber,
        event.transactionHash,
        event.timestamp
      );

      return true;
    } catch (error) {
      // Ignore duplicate events
      if (error.message.includes('UNIQUE constraint failed')) {
        logger.debug(`Event already exists: ${event.eventHash}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Get pending events (not yet submitted)
   */
  async getPendingEvents(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT * FROM events
      WHERE status = 'pending'
      AND retry_count < ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);

    return stmt.all(10, limit); // Max 10 retries
  }

  /**
   * Mark event as submitted
   */
  async markAsSubmitted(id, hcsSequenceNumber) {
    const stmt = this.db.prepare(`
      UPDATE events
      SET status = 'submitted',
          hcs_sequence_number = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(hcsSequenceNumber, id);
  }

  /**
   * Mark event as failed
   */
  async markAsFailed(id, errorMessage) {
    const stmt = this.db.prepare(`
      UPDATE events
      SET status = 'failed',
          error_message = ?,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(errorMessage, id);
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(id) {
    const stmt = this.db.prepare(`
      UPDATE events
      SET retry_count = retry_count + 1,
          updated_at = strftime('%s', 'now')
      WHERE id = ?
    `);

    stmt.run(id);
  }

  /**
   * Check if event exists
   */
  async eventExists(eventHash) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM events WHERE event_hash = ?
    `);

    const result = stmt.get(eventHash);
    return result.count > 0;
  }

  /**
   * Get pending count
   */
  async getPendingCount() {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM events WHERE status = 'pending'
    `);

    const result = stmt.get();
    return result.count;
  }

  /**
   * Get last processed block number
   */
  async getLastProcessedBlock() {
    const stmt = this.db.prepare(`
      SELECT MAX(block_number) as max_block FROM events
    `);

    const result = stmt.get();
    return result.max_block || 0;
  }

  /**
   * Get statistics
   */
  async getStats() {
    const stmt = this.db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        AVG(retry_count) as avg_retries
      FROM events
      GROUP BY status
    `);

    return stmt.all();
  }

  /**
   * Clean old events (older than 30 days)
   */
  async cleanup(daysToKeep = 30) {
    const cutoffTime = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);

    const stmt = this.db.prepare(`
      DELETE FROM events
      WHERE status = 'submitted'
      AND timestamp < ?
    `);

    const result = stmt.run(cutoffTime);
    logger.info(`Cleaned up ${result.changes} old events`);
  }

  /**
   * Close database
   */
  async close() {
    if (this.db) {
      this.db.close();
      logger.info('Database closed');
    }
  }
}

module.exports = EventQueue;
