import { supabase } from './supabaseService';
import { priceService } from './priceService';

class LendingBorrowingService {
  constructor() {
    console.log('💰 LendingBorrowingService initialized');
  }

  // ============================================
  // LENDING OPERATIONS
  // ============================================

  /**
   * Fetch pool statistics for all tiers
   */
  async getPoolStats() {
    try {
      console.log('📊 Fetching pool stats...');

      const { data, error } = await supabase
        .from('pool_stats')
        .select('*')
        .order('last_update', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      console.log('✅ Pool stats fetched:', data);
      return {
        tier1_total: parseFloat(data.tier1_total),
        tier2_total: parseFloat(data.tier2_total),
        tier3_total: parseFloat(data.tier3_total),
        tier1_borrowed: parseFloat(data.tier1_borrowed),
        tier2_borrowed: parseFloat(data.tier2_borrowed),
        tier3_borrowed: parseFloat(data.tier3_borrowed),
        tier1_utilization: parseFloat(data.tier1_utilization),
        tier2_utilization: parseFloat(data.tier2_utilization),
        tier3_utilization: parseFloat(data.tier3_utilization),
        tier1_apy: parseFloat(data.tier1_apy),
        tier2_apy: parseFloat(data.tier2_apy),
        tier3_apy: parseFloat(data.tier3_apy),
        total_volume: parseFloat(data.total_volume),
        last_update: data.last_update,
      };
    } catch (error) {
      console.error('❌ Error fetching pool stats:', error);
      // Return default values
      return {
        tier1_total: 0,
        tier2_total: 0,
        tier3_total: 0,
        tier1_borrowed: 0,
        tier2_borrowed: 0,
        tier3_borrowed: 0,
        tier1_utilization: 0,
        tier2_utilization: 0,
        tier3_utilization: 0,
        tier1_apy: 4.5,
        tier2_apy: 5.85,
        tier3_apy: 7.65,
        total_volume: 0,
      };
    }
  }

  /**
   * Get user's deposits
   * @param {string} walletAddress - User's wallet address
   */
  async getUserDeposits(walletAddress) {
    try {
      console.log('🔍 Fetching deposits for wallet:', walletAddress);

      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Deposits fetched:', data?.length || 0);
      return {
        deposits: data || [],
      };
    } catch (error) {
      console.error('❌ Error fetching user deposits:', error);
      return { deposits: [] };
    }
  }

  /**
   * Create a new deposit
   * @param {string} walletAddress - User's wallet address
   * @param {number} tier - Tier (1, 2, or 3)
   * @param {number} amount - Amount in HBAR
   */
  async createDeposit(walletAddress, tier, amount) {
    try {
      console.log('💰 Creating deposit:', { walletAddress, tier, amount });

      // Get user_id from wallets table
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();

      if (walletError) throw walletError;

      // LP tokens = deposit amount (1:1 initially)
      const lpTokens = amount;

      // Create deposit record
      const { data: depositData, error: depositError } = await supabase
        .from('deposits')
        .insert([
          {
            user_id: walletData.user_id,
            user_wallet: walletAddress,
            tier: tier,
            amount: amount,
            lp_tokens: lpTokens,
            status: 'active',
          },
        ])
        .select()
        .single();

      if (depositError) throw depositError;

      // Update pool stats
      await this.updatePoolStats(tier, amount, 'deposit');

      console.log('✅ Deposit created successfully:', depositData.id);
      return {
        success: true,
        deposit: depositData,
      };
    } catch (error) {
      console.error('❌ Error creating deposit:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Withdraw from Tier 1 (instant) or request withdrawal from Tier 2/3
   * @param {string} walletAddress - User's wallet address
   * @param {string} depositId - Deposit ID
   * @param {number} tier - Tier number
   */
  async processWithdrawal(walletAddress, depositId, tier) {
    try {
      console.log('💸 Processing withdrawal:', { walletAddress, depositId, tier });

      // Get deposit details
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .eq('user_wallet', walletAddress)
        .single();

      if (fetchError) throw fetchError;

      if (tier === 1) {
        // Instant withdrawal for Tier 1
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString(),
          })
          .eq('id', depositId);

        if (updateError) throw updateError;

        // Update pool stats
        await this.updatePoolStats(tier, -parseFloat(deposit.amount), 'withdrawal');

        console.log('✅ Tier 1 withdrawal completed');
        return {
          success: true,
          message: 'Withdrawal completed successfully',
        };
      } else {
        // Request withdrawal for Tier 2/3
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            status: 'pending_withdrawal',
            withdrawal_request_date: new Date().toISOString(),
          })
          .eq('id', depositId);

        if (updateError) throw updateError;

        console.log('✅ Withdrawal request submitted');
        return {
          success: true,
          message: `Withdrawal request submitted. Available in ${tier === 2 ? 30 : 90} days.`,
        };
      }
    } catch (error) {
      console.error('❌ Error processing withdrawal:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update pool statistics
   * @param {number} tier - Tier number
   * @param {number} amountChange - Amount change (positive for deposit, negative for withdrawal)
   * @param {string} operation - 'deposit' or 'withdrawal' or 'borrow'
   */
  async updatePoolStats(tier, amountChange, operation) {
    try {
      console.log('📊 Updating pool stats:', { tier, amountChange, operation });

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('pool_stats')
        .select('*')
        .order('last_update', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const tierTotalField = `tier${tier}_total`;
      const tierBorrowedField = `tier${tier}_borrowed`;
      const tierUtilizationField = `tier${tier}_utilization`;

      let updates = {
        last_update: new Date().toISOString(),
      };

      if (operation === 'deposit' || operation === 'withdrawal') {
        // Update total
        const newTotal = parseFloat(currentStats[tierTotalField]) + amountChange;
        updates[tierTotalField] = Math.max(0, newTotal);

        // Recalculate utilization
        const borrowed = parseFloat(currentStats[tierBorrowedField]);
        updates[tierUtilizationField] = newTotal > 0 ? (borrowed / newTotal) * 100 : 0;
      } else if (operation === 'borrow') {
        // Update borrowed amount
        const newBorrowed = parseFloat(currentStats[tierBorrowedField]) + amountChange;
        updates[tierBorrowedField] = Math.max(0, newBorrowed);

        // Recalculate utilization
        const total = parseFloat(currentStats[tierTotalField]);
        updates[tierUtilizationField] = total > 0 ? (newBorrowed / total) * 100 : 0;
      }

      // Update total volume
      updates.total_volume = parseFloat(currentStats.total_volume) + Math.abs(amountChange);

      const { error: updateError } = await supabase
        .from('pool_stats')
        .update(updates)
        .eq('id', currentStats.id);

      if (updateError) throw updateError;

      console.log('✅ Pool stats updated successfully');
    } catch (error) {
      console.error('❌ Error updating pool stats:', error);
    }
  }

  // ============================================
  // BORROWING OPERATIONS
  // ============================================

  /**
   * Get user's credit score and statistics
   * @param {string} walletAddress - User's wallet address
   */
  async getUserScore(walletAddress) {
    try {
      console.log('🎯 Fetching user score for:', walletAddress);

      // Get user from wallets table
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('user_id, users!inner(*)')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();

      if (walletError) throw walletError;

      const user = walletData.users;

      console.log('✅ User score fetched:', user.iscore);
      return {
        iscore: user.iscore,
        totalLoans: user.total_loans,
        totalRepaid: user.total_repaid,
        onTimeRepayments: user.on_time_repayments,
        totalLiquidations: user.total_liquidations,
        accountCreatedAt: user.account_created_at,
      };
    } catch (error) {
      console.error('❌ Error fetching user score:', error);
      // Return default score
      return {
        iscore: 500,
        totalLoans: 0,
        totalRepaid: '0',
        onTimeRepayments: 0,
        totalLiquidations: 0,
      };
    }
  }

  /**
   * Get user's loans
   * @param {string} walletAddress - User's wallet address
   */
  async getUserLoans(walletAddress) {
    try {
      console.log('🔍 Fetching loans for wallet:', walletAddress);

      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Loans fetched:', data?.length || 0);
      return {
        loans: data || [],
      };
    } catch (error) {
      console.error('❌ Error fetching user loans:', error);
      return { loans: [] };
    }
  }

  /**
   * Create a new loan
   * @param {string} walletAddress - User's wallet address
   * @param {number} collateralAmount - Collateral in HBAR
   * @param {number} borrowAmountUsd - Borrow amount in USD
   * @param {number} iscore - User's credit score
   */
  async createLoan(walletAddress, collateralAmount, borrowAmountUsd, iscore) {
    try {
      console.log('💵 Creating loan:', { walletAddress, collateralAmount, borrowAmountUsd, iscore });

      // Get user_id from wallets table
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('user_id')
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();

      if (walletError) throw walletError;

      // Get HBAR price
      const hbarPrice = await priceService.fetchHbarPrice();

      // Calculate borrowed amount in HBAR
      const borrowAmountHbar = borrowAmountUsd / hbarPrice;

      // Calculate interest rate based on iScore
      const interestRate = this.calculateInterestRate(iscore);

      // Calculate initial health factor
      const healthFactor = this.calculateHealthFactor(collateralAmount, borrowAmountUsd, hbarPrice);

      // Create loan record
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .insert([
          {
            user_id: walletData.user_id,
            user_wallet: walletAddress,
            collateral_amount: collateralAmount,
            borrowed_amount_usd: borrowAmountUsd,
            borrowed_amount_hbar: borrowAmountHbar,
            interest_rate: interestRate,
            iscore: iscore,
            status: 'active',
            health_factor: healthFactor,
            last_health_check: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (loanError) throw loanError;

      // Update user stats
      await this.updateUserStats(walletData.user_id, 'loan_created');

      console.log('✅ Loan created successfully:', loanData.id);
      return {
        success: true,
        loan: loanData,
      };
    } catch (error) {
      console.error('❌ Error creating loan:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Repay a loan
   * @param {string} walletAddress - User's wallet address
   * @param {string} loanId - Loan ID
   * @param {number} repayAmount - Repayment amount in USD
   */
  async repayLoan(walletAddress, loanId, repayAmount) {
    try {
      console.log('💰 Repaying loan:', { walletAddress, loanId, repayAmount });

      // Get loan details
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*, users!inner(id)')
        .eq('id', loanId)
        .eq('user_wallet', walletAddress)
        .single();

      if (fetchError) throw fetchError;

      const remainingAmount = parseFloat(loan.borrowed_amount_usd);
      const isFullRepayment = repayAmount >= remainingAmount;

      if (isFullRepayment) {
        // Full repayment - mark as repaid
        const { error: updateError } = await supabase
          .from('loans')
          .update({
            status: 'repaid',
            repaid_at: new Date().toISOString(),
          })
          .eq('id', loanId);

        if (updateError) throw updateError;

        // Update user stats
        await this.updateUserStats(loan.users.id, 'loan_repaid', remainingAmount);

        console.log('✅ Loan fully repaid');
        return {
          success: true,
          message: 'Loan fully repaid successfully',
          fullRepayment: true,
        };
      } else {
        // Partial repayment
        const newBorrowedAmount = remainingAmount - repayAmount;

        const { error: updateError } = await supabase
          .from('loans')
          .update({
            borrowed_amount_usd: newBorrowedAmount,
          })
          .eq('id', loanId);

        if (updateError) throw updateError;

        // Update user stats
        await this.updateUserStats(loan.users.id, 'partial_repayment', repayAmount);

        console.log('✅ Partial repayment successful');
        return {
          success: true,
          message: 'Partial repayment successful',
          fullRepayment: false,
          remaining: newBorrowedAmount,
        };
      }
    } catch (error) {
      console.error('❌ Error repaying loan:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add collateral to an existing loan
   * @param {string} walletAddress - User's wallet address
   * @param {string} loanId - Loan ID
   * @param {number} collateralAmount - Additional collateral in HBAR
   */
  async addCollateral(walletAddress, loanId, collateralAmount) {
    try {
      console.log('🛡️ Adding collateral:', { walletAddress, loanId, collateralAmount });

      // Get loan details
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .eq('user_wallet', walletAddress)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new collateral amount
      const newCollateralAmount = parseFloat(loan.collateral_amount) + collateralAmount;

      // Get HBAR price
      const hbarPrice = await priceService.fetchHbarPrice();

      // Recalculate health factor
      const newHealthFactor = this.calculateHealthFactor(
        newCollateralAmount,
        parseFloat(loan.borrowed_amount_usd),
        hbarPrice
      );

      // Update loan
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          collateral_amount: newCollateralAmount,
          health_factor: newHealthFactor,
          last_health_check: new Date().toISOString(),
        })
        .eq('id', loanId);

      if (updateError) throw updateError;

      console.log('✅ Collateral added successfully');
      return {
        success: true,
        message: 'Collateral added successfully',
        newHealthFactor: newHealthFactor,
      };
    } catch (error) {
      console.error('❌ Error adding collateral:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user statistics
   * @param {string} userId - User ID
   * @param {string} action - Action type ('loan_created', 'loan_repaid', 'partial_repayment')
   * @param {number} amount - Amount (for repayment tracking)
   */
  async updateUserStats(userId, action, amount = 0) {
    try {
      console.log('📊 Updating user stats:', { userId, action, amount });

      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      let updates = {
        last_score_update: new Date().toISOString(),
      };

      if (action === 'loan_created') {
        updates.total_loans = user.total_loans + 1;
      } else if (action === 'loan_repaid') {
        updates.total_repaid = parseFloat(user.total_repaid) + amount;
        updates.on_time_repayments = user.on_time_repayments + 1;
        // Improve iScore for on-time repayments (max 1000)
        updates.iscore = Math.min(1000, user.iscore + 10);
      } else if (action === 'partial_repayment') {
        updates.total_repaid = parseFloat(user.total_repaid) + amount;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      console.log('✅ User stats updated successfully');
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Calculate interest rate based on iScore
   * @param {number} score - iScore (300-1000)
   * @returns {number} Interest rate (5-12%)
   */
  calculateInterestRate(score) {
    if (score <= 300) return 12;
    if (score <= 600) return 9;
    if (score <= 850) return 7;
    return 5;
  }

  /**
   * Calculate collateral ratio based on iScore
   * @param {number} score - iScore (300-1000)
   * @returns {number} Collateral ratio (130-200%)
   */
  calculateCollateralRatio(score) {
    if (score <= 300) return 200;
    if (score <= 600) return 175;
    if (score <= 850) return 150;
    return 130;
  }

  /**
   * Calculate health factor
   * @param {number} collateralHbar - Collateral in HBAR
   * @param {number} borrowedUsd - Borrowed amount in USD
   * @param {number} hbarPrice - Current HBAR price
   * @returns {number} Health factor
   */
  calculateHealthFactor(collateralHbar, borrowedUsd, hbarPrice) {
    const collateralValueUsd = collateralHbar * hbarPrice;
    // Health factor = (Collateral Value * 0.9) / Borrowed Amount
    // 0.9 represents the 90% liquidation threshold
    return (collateralValueUsd * 0.9) / borrowedUsd;
  }
}

export const lendingBorrowingService = new LendingBorrowingService();
