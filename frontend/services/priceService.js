class PriceService {
  constructor() {
    this.baseUrl = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchHbarPrice() {
    const cacheKey = 'hbar-price';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const response = await fetch(`${this.baseUrl}/simple/price?ids=hedera-hashgraph&vs_currencies=usd`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const price = data['hedera-hashgraph']?.usd;
      
      if (price) {
        this.cache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      }
      
      throw new Error('Price not found in response');
    } catch (error) {
      console.error('Error fetching HBAR price:', error);
      // Return fallback price
      return 0.165;
    }
  }
}

export const priceService = new PriceService();