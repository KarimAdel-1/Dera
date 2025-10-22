const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

class Database {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Database: Supabase configuration missing - running in disabled mode');
      logger.warn('Add SUPABASE_URL and SUPABASE_SERVICE_KEY to .env to enable database');
      this.client = null;
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
    logger.info('Database client initialized');
  }

  _checkClient() {
    if (!this.client) {
      throw new Error('Database not configured - set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    }
  }

  /**
   * Get user by wallet address
   */
  async getUser(walletAddress) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Create or update user
   */
  async upsertUser(userData) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('users')
        .upsert(userData, { onConflict: 'wallet_address' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error upserting user:', error);
      throw error;
    }
  }

  /**
   * Get loan by wallet address
   */
  async getLoan(walletAddress) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('loans')
        .select('*')
        .eq('user_wallet', walletAddress)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting loan:', error);
      throw error;
    }
  }

  /**
   * Create loan record
   */
  async createLoan(loanData) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('loans')
        .insert(loanData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating loan:', error);
      throw error;
    }
  }

  /**
   * Update loan
   */
  async updateLoan(loanId, updates) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('loans')
        .update(updates)
        .eq('id', loanId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating loan:', error);
      throw error;
    }
  }

  /**
   * Get all active loans
   */
  async getActiveLoans() {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('loans')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting active loans:', error);
      throw error;
    }
  }

  /**
   * Create deposit record
   */
  async createDeposit(depositData) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('deposits')
        .insert(depositData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating deposit:', error);
      throw error;
    }
  }

  /**
   * Get user deposits
   */
  async getUserDeposits(walletAddress) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('deposits')
        .select('*')
        .eq('user_wallet', walletAddress)
        .eq('status', 'active');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user deposits:', error);
      throw error;
    }
  }

  /**
   * Update pool stats
   */
  async updatePoolStats(statsData) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('pool_stats')
        .upsert(statsData, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error updating pool stats:', error);
      throw error;
    }
  }

  /**
   * Get pool stats
   */
  async getPoolStats() {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('pool_stats')
        .select('*')
        .order('last_update', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error getting pool stats:', error);
      throw error;
    }
  }

  /**
   * Create event log
   */
  async createEventLog(eventData) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('event_logs')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Error creating event log:', error);
      throw error;
    }
  }

  /**
   * Get user loan history
   */
  async getUserLoanHistory(walletAddress) {
    try {
      this._checkClient();
      const { data, error } = await this.client
        .from('loans')
        .select('*')
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Error getting user loan history:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new Database();
