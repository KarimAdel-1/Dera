const nodemailer = require('nodemailer');
const axios = require('axios');
const logger = require('./utils/logger');
const config = require('./config');

/**
 * AlertManager
 *
 * Manages alert notifications via multiple channels:
 * - Email (via nodemailer)
 * - Telegram (via bot API)
 * - Webhook (generic HTTP POST)
 * - Log files (always)
 */
class AlertManager {
  constructor() {
    this.emailTransporter = null;
    this.alertHistory = [];
    this.alertCounts = {
      INFO: 0,
      WARNING: 0,
      CRITICAL: 0,
      EMERGENCY: 0,
    };
  }

  /**
   * Initialize alert channels
   */
  async initialize() {
    logger.info('Initializing Alert Manager...');

    // Initialize email if configured
    if (config.EMAIL_ENABLED) {
      this.emailTransporter = nodemailer.createTransporter({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_SECURE,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
      });

      logger.info('✅ Email alerts enabled');
    }

    // Test Telegram if configured
    if (config.TELEGRAM_ENABLED) {
      try {
        await this.testTelegram();
        logger.info('✅ Telegram alerts enabled');
      } catch (error) {
        logger.warn('Telegram test failed:', error.message);
      }
    }

    // Test Webhook if configured
    if (config.WEBHOOK_URL) {
      logger.info('✅ Webhook alerts enabled');
    }

    logger.info('✅ Alert Manager initialized');
  }

  /**
   * Send alert via all configured channels
   */
  async sendAlert(alert) {
    try {
      const {
        level = 'INFO',
        title,
        message,
        details = {},
      } = alert;

      // Update counts
      this.alertCounts[level]++;

      // Add to history
      this.alertHistory.push({
        ...alert,
        timestamp: new Date().toISOString(),
      });

      // Keep last 1000 alerts
      if (this.alertHistory.length > 1000) {
        this.alertHistory.shift();
      }

      // Log alert
      const logLevel = this.getLogLevel(level);
      logger[logLevel](`[${level}] ${title}: ${message}`);

      // Send via configured channels
      const promises = [];

      if (config.EMAIL_ENABLED) {
        promises.push(this.sendEmail(level, title, message, details));
      }

      if (config.TELEGRAM_ENABLED) {
        promises.push(this.sendTelegram(level, title, message, details));
      }

      if (config.WEBHOOK_URL) {
        promises.push(this.sendWebhook(level, title, message, details));
      }

      await Promise.allSettled(promises);

    } catch (error) {
      logger.error('Error sending alert:', error);
    }
  }

  /**
   * Send email alert
   */
  async sendEmail(level, title, message, details) {
    try {
      const emoji = this.getEmoji(level);
      const color = this.getColor(level);

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2>${emoji} ${title}</h2>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px;">
            <p><strong>Level:</strong> ${level}</p>
            <p><strong>Message:</strong> ${message}</p>
            ${Object.keys(details).length > 0 ? `
              <p><strong>Details:</strong></p>
              <pre style="background: white; padding: 10px; border-radius: 3px; overflow-x: auto;">${JSON.stringify(details, null, 2)}</pre>
            ` : ''}
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Sent by Dera Protocol Monitoring Service<br>
              ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `;

      await this.emailTransporter.sendMail({
        from: config.EMAIL_FROM,
        to: config.EMAIL_TO,
        subject: `[${level}] ${title} - Dera Protocol`,
        html,
      });

      logger.debug('Email alert sent');
    } catch (error) {
      logger.error('Error sending email:', error.message);
    }
  }

  /**
   * Send Telegram alert
   */
  async sendTelegram(level, title, message, details) {
    try {
      const emoji = this.getEmoji(level);

      let text = `${emoji} *${title}*\n\n`;
      text += `*Level:* ${level}\n`;
      text += `*Message:* ${message}\n`;

      if (Object.keys(details).length > 0) {
        text += `\n*Details:*\n\`\`\`\n${JSON.stringify(details, null, 2)}\n\`\`\``;
      }

      text += `\n\n_${new Date().toISOString()}_`;

      await axios.post(
        `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: config.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        }
      );

      logger.debug('Telegram alert sent');
    } catch (error) {
      logger.error('Error sending Telegram:', error.message);
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhook(level, title, message, details) {
    try {
      await axios.post(config.WEBHOOK_URL, {
        level,
        title,
        message,
        details,
        timestamp: new Date().toISOString(),
        service: 'dera-monitoring',
      });

      logger.debug('Webhook alert sent');
    } catch (error) {
      logger.error('Error sending webhook:', error.message);
    }
  }

  /**
   * Test Telegram connection
   */
  async testTelegram() {
    const response = await axios.get(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getMe`
    );

    if (!response.data.ok) {
      throw new Error('Telegram bot token invalid');
    }
  }

  /**
   * Get log level for alert level
   */
  getLogLevel(level) {
    switch (level) {
      case 'INFO': return 'info';
      case 'WARNING': return 'warn';
      case 'CRITICAL': return 'error';
      case 'EMERGENCY': return 'error';
      default: return 'info';
    }
  }

  /**
   * Get emoji for alert level
   */
  getEmoji(level) {
    switch (level) {
      case 'INFO': return 'ℹ️';
      case 'WARNING': return '⚠️';
      case 'CRITICAL': return '🚨';
      case 'EMERGENCY': return '🛑';
      default: return '📢';
    }
  }

  /**
   * Get color for alert level
   */
  getColor(level) {
    switch (level) {
      case 'INFO': return '#17a2b8';
      case 'WARNING': return '#ffc107';
      case 'CRITICAL': return '#dc3545';
      case 'EMERGENCY': return '#8B0000';
      default: return '#6c757d';
    }
  }

  /**
   * Get alert statistics
   */
  getStats() {
    return {
      total: this.alertHistory.length,
      counts: this.alertCounts,
      recent: this.alertHistory.slice(-10),
    };
  }
}

module.exports = AlertManager;
