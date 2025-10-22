const axios = require('axios');
const cron = require('node-cron');
const { ethers } = require('ethers');
const logger = require('../../utils/logger');

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
      // Initialize ethers provider
      const network = process.env.HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
      const rpcUrl = network === 'mainnet'
        ? 'https://mainnet.hashio.io/api'
        : 'https://testnet.hashio.io/api';

      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Initialize contract
      const oracleAddress = process.env.PRICE_ORACLE_ADDRESS;
      const privateKey = process.env.HEDERA_PRIVATE_KEY;

      if (!oracleAddress || !privateKey) {
        throw new Error('Price oracle configuration missing');
      }

      const wallet = new ethers.Wallet(privateKey, this.provider);

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

      // Initial price update
      await this.updatePrice();

      logger.info('Price Oracle Service started');
    } catch (error) {
      logger.error('Failed to start Price Oracle Service:', error);
      throw error;
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
      // Fetch from SaucerSwap DEX API
      const response = await axios.get(`${this.saucerswapApiUrl}/tokens/HBAR`);
      const priceUsd = parseFloat(response.data.priceUsd);

      // Scale to 8 decimals
      const scaledPrice = Math.floor(priceUsd * 100000000);

      logger.info(`Fetched HBAR price: $${priceUsd} (scaled: ${scaledPrice})`);

      return scaledPrice;
    } catch (error) {
      logger.error('Failed to fetch price from SaucerSwap:', error);

      // Fallback to last known price
      if (this.lastPrice) {
        logger.warn('Using last known price as fallback');
        return this.lastPrice;
      }

      throw error;
    }
  }

  async updatePrice() {
    try {
      const newPrice = await this.fetchPrice();

      // Validate price change (circuit breaker)
      if (this.lastPrice) {
        const priceChange = Math.abs((newPrice - this.lastPrice) / this.lastPrice) * 100;

        if (priceChange > 20) {
          logger.error(`Price change too large: ${priceChange}% - rejecting update`);
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
      logger.error('Failed to update price:', error);
      throw error;
    }
  }

  async getCurrentPrice() {
    try {
      const price = await this.contract.currentPrice();
      return price.toNumber();
    } catch (error) {
      logger.error('Failed to get current price:', error);
      throw error;
    }
  }
}

module.exports = PriceOracleService;
