import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('🔗 Supabase config:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length,
  hasServiceKey: !!supabaseServiceKey
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
console.log('✅ Supabase client created');

// Test connection
supabase.from('users').select('count', { count: 'exact', head: true })
  .then(({ error, count }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log('✅ Supabase connection test passed. Users table exists with', count, 'rows');
    }
  });

class SupabaseService {
  constructor() {
    console.log('🏠 SupabaseService initialized');
  }
  
  async createOrGetUser(uniqueIdentifier) {
    try {
      console.log('🔍 Creating/getting user with identifier:', uniqueIdentifier);
      
      // Try to get existing user
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('unique_identifier', uniqueIdentifier)
        .single();

      if (existingUser) {
        console.log('✅ Found existing user, updating last login');
        await supabaseAdmin
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);
        return existingUser;
      }

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([{ unique_identifier: uniqueIdentifier }])
        .select()
        .single();

      if (createError) throw createError;
      console.log('✅ Created new user:', newUser);
      return newUser;
    } catch (error) {
      console.error('❌ Error creating/getting user:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      throw error;
    }
  }

  async saveWallet(userId, walletData) {
    try {
      console.log('💾 Saving wallet to database:', { userId, walletData });
      
      // Check if user has any existing wallets
      const { data: existingWallets } = await supabaseAdmin
        .from('wallets')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      const isFirstWallet = !existingWallets || existingWallets.length === 0;
      
      const walletRecord = {
        user_id: userId,
        wallet_id: walletData.walletId || walletData.address,
        wallet_address: walletData.address,
        card_skin: walletData.cardSkin || 'Card-1.png',
        wallet_type: walletData.walletType || 'hashpack',
        connected_at: walletData.connectedAt || new Date().toISOString(),
        is_active: true,
        is_default: isFirstWallet // First wallet becomes default
      };
      
      console.log('📝 Wallet record to insert:', walletRecord);
      
      const { data, error } = await supabaseAdmin
        .from('wallets')
        .upsert([walletRecord], {
          onConflict: 'user_id,wallet_address'
        })
        .select();

      console.log('📊 Wallet save result:', { data, error });
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('❌ Error saving wallet:', error);
      throw error;
    }
  }

  async getUserWallets(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user wallets:', error);
      throw error;
    }
  }

  async deactivateWallet(userId, walletAddress) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error deactivating wallet:', error);
      throw error;
    }
  }

  async setDefaultWallet(userId, walletAddress) {
    try {
      // First, set all user's wallets to not default
      await supabase
        .from('wallets')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Then set the specified wallet as default
      const { data, error } = await supabase
        .from('wallets')
        .update({ is_default: true })
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error setting default wallet:', error);
      throw error;
    }
  }

  async checkWalletAndUser(walletAddress) {
    try {
      console.log('🔍 Checking wallet existence:', walletAddress);
      
      // Check if wallet exists in wallets table
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select(`
          *,
          users!inner(*)
        `)
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .single();

      console.log('📊 Wallet check result:', { walletData, walletError });

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      if (walletData) {
        console.log('✅ Found existing wallet with user');
        return {
          isExisting: true,
          wallet: walletData,
          user: walletData.users
        };
      }

      console.log('🆕 Wallet not found - new wallet');
      return {
        isExisting: false,
        wallet: null,
        user: null
      };
    } catch (error) {
      console.error('❌ Error checking wallet and user:', error);
      throw error;
    }
  }

  async processWalletConnection(walletAddress, walletData) {
    try {
      console.log('🔄 Processing wallet connection:', walletAddress);

      // Step 1: Check if wallet exists in database (wallet-first approach)
      const { data: existingWallets, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('wallet_address', walletAddress);

      console.log('💾 Wallet lookup result:', {
        found: existingWallets?.length > 0,
        count: existingWallets?.length,
        error: walletError
      });

      if (walletError) {
        console.error('❌ Error looking up wallet:', walletError);
        throw walletError;
      }

      // Step 2: If wallet exists, get the associated user and reactivate
      if (existingWallets && existingWallets.length > 0) {
        const existingWallet = existingWallets[0];
        console.log('✅ Found existing wallet:', {
          wallet_id: existingWallet.id,
          user_id: existingWallet.user_id,
          is_active: existingWallet.is_active
        });

        // Get the user associated with this wallet
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', existingWallet.user_id)
          .single();

        if (userError || !user) {
          console.error('❌ Error getting user for wallet:', userError);
          throw userError || new Error('User not found for wallet');
        }

        console.log('👤 Found associated user:', {
          user_id: user.id,
          unique_identifier: user.unique_identifier
        });

        // Reactivate wallet if it was deactivated
        if (!existingWallet.is_active) {
          console.log('🔄 Reactivating wallet...');
          await supabase
            .from('wallets')
            .update({
              is_active: true,
              connected_at: new Date().toISOString()
            })
            .eq('wallet_address', walletAddress);
        }

        // Update user's last login
        console.log('📝 Updating last login...');
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);

        // Get all wallets for this user
        const { data: allUserWallets } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);

        console.log('📊 User has', allUserWallets?.length || 0, 'active wallets');

        return {
          user,
          wallet: { ...existingWallet, is_active: true },
          isNewWallet: false,
          isReturningUser: true
        };
      }

      // Step 3: New wallet - create new user
      console.log('🆕 New wallet detected - creating new user');

      // Create new user for this wallet
      const uniqueIdentifier = `user_${walletAddress}`;
      const user = await this.createOrGetUser(uniqueIdentifier);

      // Save the new wallet
      const wallet = await this.saveWallet(user.id, {
        ...walletData,
        address: walletAddress,
        walletId: walletAddress
      });

      return {
        user,
        wallet,
        isNewWallet: true,
        isReturningUser: false
      };
    } catch (error) {
      console.error('❌ Error processing wallet connection:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      });
      throw error;
    }
  }

  async addWalletToExistingUser(userId, walletAddress, walletData) {
    try {
      console.log('➕ Adding wallet to existing user:', { userId, walletAddress });
      
      // Check if wallet already exists for this user
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .single();
      
      if (existingWallet) {
        console.log('⚠️ Wallet already exists for this user');
        return existingWallet;
      }
      
      // Add new wallet to existing user
      const wallet = await this.saveWallet(userId, {
        ...walletData,
        address: walletAddress,
        walletId: walletAddress
      });
      
      console.log('✅ Wallet added to existing user:', wallet);
      return wallet;
    } catch (error) {
      console.error('❌ Error adding wallet to existing user:', error);
      throw error;
    }
  }

  async updateWalletCardSkin(walletAddress, newCardSkin) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ card_skin: newCardSkin })
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error updating wallet card skin:', error);
      throw error;
    }
  }

  async reactivateWallet(userId, walletAddress) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .select();

      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Error reactivating wallet:', error);
      throw error;
    }
  }

  // ============================================================================
  // WalletConnect Session Persistence Methods
  // ============================================================================

  /**
   * Save WalletConnect session to database for persistence
   * This allows sessions to survive localStorage clears
   */
  async saveWalletConnectSession(userId, walletAddress, sessionData) {
    try {
      console.log('💾 Saving WalletConnect session to database:', {
        userId,
        walletAddress,
        topic: sessionData.topic
      });

      const { data, error} = await supabase
        .from('walletconnect_sessions')
        .upsert([{
          user_id: userId,
          wallet_address: walletAddress,
          pairing_topic: sessionData.topic,
          relay_protocol: sessionData.relay?.protocol || 'irn',
          sym_key: sessionData.symKey || '',
          expiry_timestamp: sessionData.expiry,
          network: sessionData.network || 'testnet',
          is_active: true,
          last_used_at: new Date().toISOString()
        }], {
          onConflict: 'pairing_topic'
        })
        .select();

      if (error) throw error;

      console.log('✅ WalletConnect session saved successfully');
      return data?.[0];
    } catch (error) {
      console.error('❌ Error saving WalletConnect session:', error);
      throw error;
    }
  }

  /**
   * Get active WalletConnect session for a wallet
   */
  async getWalletConnectSession(userId, walletAddress) {
    try {
      console.log('🔍 Looking for WalletConnect session:', { userId, walletAddress });

      const { data, error } = await supabase
        .from('walletconnect_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('wallet_address', walletAddress)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        console.log('✅ Found WalletConnect session:', data[0].pairing_topic);
        return data[0];
      }

      console.log('ℹ️ No active WalletConnect session found');
      return null;
    } catch (error) {
      console.error('❌ Error getting WalletConnect session:', error);
      return null;
    }
  }

  /**
   * Get all active WalletConnect sessions for a user
   */
  async getUserWalletConnectSessions(userId) {
    try {
      console.log('🔍 Getting all WalletConnect sessions for user:', userId);

      const { data, error } = await supabase
        .from('walletconnect_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ Found ${data?.length || 0} active sessions`);
      return data || [];
    } catch (error) {
      console.error('❌ Error getting user WalletConnect sessions:', error);
      return [];
    }
  }

  /**
   * Update session last used timestamp
   */
  async updateSessionLastUsed(pairingTopic) {
    try {
      const { error } = await supabase
        .from('walletconnect_sessions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('pairing_topic', pairingTopic);

      if (error) throw error;
    } catch (error) {
      console.error('❌ Error updating session last used:', error);
    }
  }

  /**
   * Deactivate WalletConnect session
   */
  async deactivateWalletConnectSession(pairingTopic) {
    try {
      console.log('🔄 Deactivating WalletConnect session:', pairingTopic);

      const { error } = await supabase
        .from('walletconnect_sessions')
        .update({ is_active: false })
        .eq('pairing_topic', pairingTopic);

      if (error) throw error;

      console.log('✅ WalletConnect session deactivated');
    } catch (error) {
      console.error('❌ Error deactivating WalletConnect session:', error);
    }
  }

  /**
   * Delete old/expired WalletConnect sessions
   */
  async cleanupExpiredSessions() {
    try {
      const now = Math.floor(Date.now() / 1000);

      const { error } = await supabase
        .from('walletconnect_sessions')
        .delete()
        .lt('expiry_timestamp', now);

      if (error) throw error;

      console.log('✅ Cleaned up expired WalletConnect sessions');
    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
    }
  }
}

export const supabaseService = new SupabaseService();