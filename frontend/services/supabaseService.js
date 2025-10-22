import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Supabase config:', { 
  url: supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length 
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client created');

class SupabaseService {
  constructor() {
    console.log('🏠 SupabaseService initialized');
  }
  
  async createOrGetUser(uniqueIdentifier) {
    try {
      console.log('🔍 Creating/getting user with identifier:', uniqueIdentifier);
      
      // Try to get existing user
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('unique_identifier', uniqueIdentifier)
        .single();

      console.log('📊 Existing user query result:', { existingUser, fetchError });

      if (existingUser) {
        console.log('✅ Found existing user, updating last login');
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', existingUser.id);
        
        return existingUser;
      }

      console.log('🆕 Creating new user');
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ unique_identifier: uniqueIdentifier }])
        .select()
        .single();

      console.log('📊 New user creation result:', { newUser, createError });
      if (createError) throw createError;
      return newUser;
    } catch (error) {
      console.error('❌ Error creating/getting user:', error);
      throw error;
    }
  }

  async saveWallet(userId, walletData) {
    try {
      console.log('💾 Saving wallet to database:', { userId, walletData });
      
      // Check if user has any existing wallets
      const { data: existingWallets } = await supabase
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
      
      const { data, error } = await supabase
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

  async deactivateAllUserWallets(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ is_active: false })
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deactivating all wallets:', error);
      throw error;
    }
  }

  async updateWalletCardSkin(walletAddress, cardSkin) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .update({ card_skin: cardSkin })
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
      
      // Check if wallet exists and get associated user
      const result = await this.checkWalletAndUser(walletAddress);
      
      if (result.isExisting) {
        console.log('✅ Existing wallet found, updating last login');
        // Update user's last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', result.user.id);
        
        return {
          user: result.user,
          wallet: result.wallet,
          isNewWallet: false
        };
      } else {
        console.log('🆕 New wallet, creating user and wallet');
        // Create new user for this wallet
        const uniqueIdentifier = `user_${walletAddress}`;
        const user = await this.createOrGetUser(uniqueIdentifier);
        
        // Save the new wallet
        const wallet = await this.saveWallet(user.id, {
          ...walletData,
          address: walletAddress
        });
        
        return {
          user,
          wallet,
          isNewWallet: true
        };
      }
    } catch (error) {
      console.error('❌ Error processing wallet connection:', error);
      throw error;
    }
  }
}

export const supabaseService = new SupabaseService();