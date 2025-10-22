const axios = require('axios');
const cron = require('node-cron');
const { ethers } = require('ethers');
const logger = require('../../utils/logger');
const { convertHederaPrivateKey } = require('../../utils/keyConverter');

/**
 * Price Oracle Service
 * Fetches HBAR/USD price and updates smart contract
 */
class PriceOracleService {
  constructor() {
    this.updateInterval = process.env.PRICE_UPDATE_INTERVAL || 300000; // 5 minutes
    this.saucerswapApiUrl = process.env.SAUCERSWAP_API_URL || 'https://api.saucerswap.finance/v1';
    this.lastPrice = null;
    this.cronJob = null;
    this.provider = null;
    this.contract = null;
  }

  async start() {
    try {
      // Check if contract address is configured
      const oracleAddress = process.env.PRICE_ORACLE_ADDRESS;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!oracleAddress || !privateKey) {
        logger.warn('Price Oracle Service: Contract address not configured - running in disabled mode');
        logger.warn('Deploy contracts and add PRICE_ORACLE_ADDRESS to .env to enable this service');
        return;
      }

      // Initialize ethers provider
      const network = process.env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
      const rpcUrl = network === 'mainnet'
        ? 'https://mainnet.hashio.io/api'
        : 'https://testnet.hashio.io/api';

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Convert Hedera DER key to raw format for ethers
      const rawPrivateKey = convertHederaPrivateKey(privateKey);
      const wallet = new ethers.Wallet(rawPrivateKey, this.provider);

      const oracleAbi = [
        'function updatePrice(uint256 _newPrice) external',
        'function getPrice() external view returns (uint256)',
        'function currentPrice() external view returns (uint256)',
      ];

      this.contract = new ethers.Contract(oracleAddress, oracleAbi, wallet);

      // Start price update cron job (every 5 minutes)
      this.cronJob = cron.schedule('*/5 * * * *', async () => {
        await this.updatePrice();
      });

      // Initial price update (non-blocking)
      this.updatePrice().catch(err => {
        logger.warn(`Initial price update failed: ${err.message}`);
        logger.info('Price updates will retry every 5 minutes');
      });

      logger.info('Price Oracle Service started');
      logger.info('Price updates scheduled every 5 minutes');
    } catch (error) {
      logger.error(`Failed to start Price Oracle Service: ${error.message}`);
      // Don't throw - allow backend to continue
      logger.warn('Price Oracle Service running in degraded mode');
    }
  }

  async stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Price Oracle Service stopped');
    }
  }

  async fetchPrice() {
    try {
      // Try primary source: CoinGecko API (free, no API key needed)
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd',
        { timeout: 5000 }
      );

      const priceUsd = response.data['hedera-hashgraph']?.usd;

      if (!priceUsd) {
        throw new Error('Price not found in response');
      }

      // Scale to 8 decimals
      const scaledPrice = Math.floor(priceUsd * 100000000);

      logger.info(`Fetched HBAR price: $${priceUsd} (scaled: ${scaledPrice})`);

      return scaledPrice;
    } catch (error) {
      logger.warn(`Failed to fetch price from CoinGecko: ${error.message}`);

      // Fallback to last known price
      if (this.lastPrice) {
        logger.info('Using last known price as fallback');
        return this.lastPrice;
      }

      // If no price available, use contract's current price or default
      logger.warn('No price source available, using contract default ($0.05)');
      return 5000000; // $0.05 with 8 decimals
    }
  }

  async updatePrice() {
    try {
      const newPrice = await this.fetchPrice();

      // Validate price change (circuit breaker)
      if (this.lastPrice && this.lastPrice > 0) {
        const priceChange = Math.abs((newPrice - this.lastPrice) / this.lastPrice) * 100;

        if (priceChange > 20) {
          logger.warn(`Price change too large: ${priceChange}% - skipping update`);
          return;
        }
      }

      // Update contract
      const tx = await this.contract.updatePrice(newPrice, {
        gasLimit: 100000,
      });

      await tx.wait();

      this.lastPrice = newPrice;

      logger.info(`Price updated on-chain: ${newPrice} (tx: ${tx.hash})`);

      return newPrice;
    } catch (error) {
      logger.error(`Failed to update price: ${error.message}`);
      // Don't throw - just log and continue
      // This prevents the service from crashing on transient errors
    }
  }

  async getCurrentPrice() {
    try {
      const price = await this.contract.currentPrice();
      return Number(price);
    } catch (error) {
      logger.error('Failed to get current price:', error);
      throw error;
    }
  }
}

module.exports = PriceOracleService;
