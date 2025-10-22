const database = require('../../utils/database');
const logger = require('../../utils/logger');

/**
 * iScore Calculator Service
 * Calculates and maintains credit scores for users
 *
 * Score Calculation:
 * - Payment History (40%): Percentage of on-time repayments
 * - Total Volume (20%): Total HBAR repaid (normalized to 100K)
 * - Account Age (10%): Days since first loan (normalized to 365)
 * - Health Maintenance (15%): Bonus for never dropping below HF 1.2
 * - Liquidations (15%): -50 points per liquidation
 */
class IScoreCalculator {
  constructor() {
    this.scoreCache = new Map();
    this.cacheTTL = parseInt(process.env.ISCORE_CACHE_TTL || '3600') * 1000; // 1 hour
  }

  async initialize() {
    logger.info('iScore Calculator Service initialized');
  }

  /**
   * Calculate iScore for a user
   */
  async calculateScore(walletAddress) {
    try {
      // Check cache
      const cached = this.scoreCache.get(walletAddress);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.score;
      }

      // Get user data
      let user = await database.getUser(walletAddress);

      if (!user) {
        // New user - default score
        user = await database.upsertUser({
          wallet_address: walletAddress,
          iscore: 500,
          total_loans: 0,
          total_repaid: 0,
          total_liquidations: 0,
          on_time_repayments: 0,
          account_created_at: new Date().toISOString(),
        });
      }

      const loanHistory = await database.getUserLoanHistory(walletAddress);

      // Calculate score components
      const paymentScore = this.calculatePaymentScore(user, loanHistory);
      const volumeScore = this.calculateVolumeScore(user);
      const ageScore = this.calculateAgeScore(user);
      const healthScore = this.calculateHealthScore(loanHistory);
      const liquidationPenalty = this.calculateLiquidationPenalty(user);

      // Total score (300-1000)
      let totalScore = 300 + // Base score
        (paymentScore * 0.40) +
        (volumeScore * 0.20) +
        (ageScore * 0.10) +
        (healthScore * 0.15) +
        (liquidationPenalty * 0.15);

      // Clamp to 300-1000
      totalScore = Math.max(300, Math.min(1000, Math.round(totalScore)));

      // Update user record
      await database.upsertUser({
        wallet_address: walletAddress,
        iscore: totalScore,
        last_score_update: new Date().toISOString(),
      });

      // Cache result
      this.scoreCache.set(walletAddress, {
        score: totalScore,
        timestamp: Date.now(),
      });

      logger.info(`Calculated iScore for ${walletAddress}: ${totalScore}`);

      return totalScore;
    } catch (error) {
      logger.error(`Failed to calculate iScore for ${walletAddress}:`, error);
      return 500; // Default score on error
    }
  }

  calculatePaymentScore(user, loanHistory) {
    if (user.total_loans === 0) return 0;

    const onTimeRate = user.on_time_repayments / user.total_loans;
    return onTimeRate * 400; // Max 400 points (40% of 1000)
  }

  calculateVolumeScore(user) {
    const normalized = Math.min(user.total_repaid / 100000, 1); // Normalize to 100K HBAR
    return normalized * 200; // Max 200 points (20% of 1000)
  }

  calculateAgeScore(user) {
    const daysSinceCreation = (Date.now() - new Date(user.account_created_at).getTime()) / (1000 * 60 * 60 * 24);
    const normalized = Math.min(daysSinceCreation / 365, 1); // Normalize to 1 year
    return normalized * 100; // Max 100 points (10% of 1000)
  }

  calculateHealthScore(loanHistory) {
    // Check if user ever dropped below HF 1.2
    const everBelowThreshold = loanHistory.some(loan =>
      loan.health_factor !== null && loan.health_factor < 1.2
    );

    return everBelowThreshold ? 0 : 150; // Max 150 points (15% of 1000)
  }

  calculateLiquidationPenalty(user) {
    return -50 * user.total_liquidations; // -50 points per liquidation
  }

  /**
   * Update score after loan event
   */
  async updateScoreAfterEvent(walletAddress, eventType, eventData) {
    try {
      const user = await database.getUser(walletAddress);

      if (!user) return;

      switch (eventType) {
        case 'loan_created':
          await database.upsertUser({
            wallet_address: walletAddress,
            total_loans: (user.total_loans || 0) + 1,
          });
          break;

        case 'loan_repaid':
          await database.upsertUser({
            wallet_address: walletAddress,
            total_repaid: (user.total_repaid || 0) + eventData.amount,
            on_time_repayments: (user.on_time_repayments || 0) + (eventData.onTime ? 1 : 0),
          });
          break;

        case 'loan_liquidated':
          await database.upsertUser({
            wallet_address: walletAddress,
            total_liquidations: (user.total_liquidations || 0) + 1,
          });
          break;
      }

      // Recalculate score
      await this.calculateScore(walletAddress);
    } catch (error) {
      logger.error(`Failed to update score after ${eventType}:`, error);
    }
  }

  /**
   * Clear cache for a user
   */
  clearCache(walletAddress) {
    this.scoreCache.delete(walletAddress);
  }
}

module.exports = IScoreCalculator;
