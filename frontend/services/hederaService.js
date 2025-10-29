class HederaService {
  constructor() {
    this.baseUrl = 'https://testnet.mirrornode.hedera.com';
    this.coingeckoUrl = process.env.NEXT_PUBLIC_COINGECKO_API;

  }

  async fetchHbarPrice(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(
          `${this.coingeckoUrl}simple/price?ids=hedera-hashgraph&vs_currencies=usd`,
          { 
            timeout: 10000,
            headers: {
              'Accept': 'application/json',
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data['hedera-hashgraph'].usd;
      } catch (error) {
        console.warn(`HBAR price fetch attempt ${i + 1} failed:`, error.message);
        
        if (i === retries - 1) {
          console.error('All HBAR price fetch attempts failed, using fallback price');
          return 0.05; // Fallback price
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  /**
   * Get account balance from Hedera Mirror Node
   * @param {string} accountId - The Hedera account ID (e.g., "0.0.123456")
   * @returns {Promise<Object>} Balance data including HBAR and USD value
   */
  async getAccountBalance(accountId) {
    try {
      console.log(`Fetching balance for account: ${accountId}`);

      const response = await fetch(
        `${this.baseUrl}/api/v1/balances?account.id=${accountId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch balance: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('Balance API Response:', data);

      // The API returns balances array
      if (!data.balances || data.balances.length === 0) {
        console.warn(`No balance data found for account ${accountId}`);
        return {
          hbarBalance: '0',
          accountId,
          timestamp: data.timestamp || null,
        };
      }

      // Get the first balance record (should be the requested account)
      const accountBalance = data.balances[0];

      // Convert tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
      const hbarBalance = (accountBalance.balance || 0) / 100000000;

      const result = {
        hbarBalance: hbarBalance.toFixed(4),
        accountId: accountBalance.account,
        timestamp: data.timestamp,
        tokens: accountBalance.tokens || [],
      };

      console.log('Processed Balance Data:', result);
      return result;
    } catch (error) {
      console.error(`Error fetching balance for ${accountId}:`, error);
      return {
        hbarBalance: '0',
        accountId,
        error: error.message,
      };
    }
  }

  /**
   * Get account transactions from Hedera Mirror Node
   * @param {string} accountId - The Hedera account ID (e.g., "0.0.123456")
   * @param {number} limit - Maximum number of transactions to fetch
   * @returns {Promise<Array>} Array of transaction objects
   */
  async getAccountTransactions(accountId, limit = 10) {
    try {
      console.log(
        `Fetching transactions for account: ${accountId}, limit: ${limit}`
      );

      const response = await fetch(
        `${this.baseUrl}/api/v1/transactions?account.id=${accountId}&limit=${limit}&order=desc`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch transactions: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log('Transactions API Response:', data);

      if (!data.transactions || data.transactions.length === 0) {
        console.warn(`No transactions found for account ${accountId}`);
        return [];
      }

      // Process and enhance transaction data
      const transactions = data.transactions.map((tx) => ({
        transaction_id: tx.transaction_id,
        consensus_timestamp: tx.consensus_timestamp,
        name: tx.name,
        result: tx.result,
        charged_tx_fee: tx.charged_tx_fee,
        max_fee: tx.max_fee,
        valid_start_timestamp: tx.valid_start_timestamp,
        valid_duration_seconds: tx.valid_duration_seconds,
        node: tx.node,
        transaction_hash: tx.transaction_hash,
        scheduled: tx.scheduled,
        transfers: tx.transfers || [],
        token_transfers: tx.token_transfers || [],
        nft_transfers: tx.nft_transfers || [],
      }));

      console.log(
        `Processed ${transactions.length} transactions for ${accountId}`
      );
      console.log('Sample Transaction:', transactions[0]);

      return transactions;
    } catch (error) {
      console.error(`Error fetching transactions for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Get detailed account information
   * @param {string} accountId - The Hedera account ID
   * @returns {Promise<Object>} Detailed account information
   */
  async getAccountInfo(accountId) {
    try {
      console.log(`Fetching account info for: ${accountId}`);

      const response = await fetch(
        `${this.baseUrl}/api/v1/accounts/${accountId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch account info: ${response.status}`);
      }

      const data = await response.json();
      console.log('Account Info:', data);

      return {
        accountId: data.account,
        alias: data.alias,
        balance: data.balance?.balance || 0,
        created_timestamp: data.created_timestamp,
        deleted: data.deleted,
        ethereum_nonce: data.ethereum_nonce,
        evm_address: data.evm_address,
        key: data.key,
        max_automatic_token_associations: data.max_automatic_token_associations,
        memo: data.memo,
        receiver_sig_required: data.receiver_sig_required,
        tokens: data.balance?.tokens || [],
      };
    } catch (error) {
      console.error(`Error fetching account info for ${accountId}:`, error);
      return null;
    }
  }

  /**
   * Get token balances for an account
   * @param {string} accountId - The Hedera account ID
   * @returns {Promise<Array>} Array of token balance objects
   */
  async getTokenBalances(accountId) {
    try {
      console.log(`Fetching token balances for: ${accountId}`);

      const response = await fetch(
        `${this.baseUrl}/api/v1/accounts/${accountId}/tokens`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch token balances: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token Balances:', data);

      return data.tokens || [];
    } catch (error) {
      console.error(`Error fetching token balances for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Get NFTs owned by an account
   * @param {string} accountId - The Hedera account ID
   * @returns {Promise<Array>} Array of NFT objects
   */
  async getAccountNFTs(accountId) {
    try {
      console.log(`Fetching NFTs for: ${accountId}`);

      const response = await fetch(
        `${this.baseUrl}/api/v1/accounts/${accountId}/nfts`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch NFTs: ${response.status}`);
      }

      const data = await response.json();
      console.log('NFTs:', data);

      return data.nfts || [];
    } catch (error) {
      console.error(`Error fetching NFTs for ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Get token information
   * @param {string} tokenId - The token ID (e.g., "0.0.123456")
   * @returns {Promise<Object>} Token information including name, symbol, decimals
   */
  async getTokenInfo(tokenId) {
    try {
      console.log(`Fetching token info for: ${tokenId}`);

      const response = await fetch(
        `${this.baseUrl}/api/v1/tokens/${tokenId}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch token info: ${response.status}`);
      }

      const data = await response.json();
      console.log('Token Info:', data);

      return {
        tokenId: data.token_id,
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        type: data.type, // FUNGIBLE_COMMON or NON_FUNGIBLE_UNIQUE
        totalSupply: data.total_supply,
        treasury_account_id: data.treasury_account_id
      };
    } catch (error) {
      console.error(`Error fetching token info for ${tokenId}:`, error);
      return null;
    }
  }
}

export const hederaService = new HederaService();
