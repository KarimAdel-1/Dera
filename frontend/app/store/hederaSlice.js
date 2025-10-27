import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apolloClient from '../../lib/apolloClient';
import {
  ALL_METRICS_QUERY,
  NETWORK_FEES_QUERY,
  TRANSACTION_TYPES_QUERY,
  NEW_TRANSACTION_TYPES_QUERY,
} from '../../lib/graphqlQueries';

const MIRROR_API = 'https://mainnet-public.mirrornode.hedera.com/api/v1';
const COINGECKO =
  'https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=usd';
const TVL_API = 'https://api.llama.fi/v2/historicalChainTvl/Hedera';
const STABLECOIN_API = 'https://stablecoins.llama.fi/stablecoincharts/Hedera';
const GRAPHQL_API = 'https://mainnet.hedera.api.hgraph.io/v1/graphql';

// Cache TTL (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// GraphQL queries now imported from lib/graphqlQueries.js

// --- FETCH NETWORK DATA (Mirror Node + Market APIs) ---
export const fetchNetworkData = createAsyncThunk(
  'network/fetchData',
  async (timeframe = '24h', { getState, rejectWithValue }) => {
    try {
      const state = getState().network;

      const now = Date.now();

      // Timeframe calculations in nanoseconds
      const timeframes = {
        '5m': now - 300000,
        '15m': now - 900000,
        '1h': now - 3600000,
        '24h': now - 86400000,
        '7d': now - 604800000,
        '30d': now - 2592000000,
        '1y': now - 31536000000,
      };
      const timeframeStart =
        (timeframes[timeframe] || timeframes['24h']) * 1000000;
      const oneHourAgo = (now - 3600000) * 1000000;

      // --- PARALLEL REQUESTS ---
      const [txRes, accountsRes, tvlRes, stablecoinRes] =
        await Promise.all([
          fetch(`${MIRROR_API}/transactions?limit=100&order=desc`),
          fetch(`${MIRROR_API}/accounts?limit=10&order=desc`),
          fetch(TVL_API),
          fetch(STABLECOIN_API),
        ]);

      // Helper function to safely parse JSON
      const safeJsonParse = async (response) => {
        const text = await response.text();
        if (!text.trim()) return {};
        try {
          return JSON.parse(text);
        } catch {
          throw new Error(`Invalid JSON response from ${response.url}`);
        }
      };

      const [txJson, accountsJson, tvlJson, stablecoinJson] =
        await Promise.all([
          safeJsonParse(txRes),
          safeJsonParse(accountsRes),
          safeJsonParse(tvlRes),
          safeJsonParse(stablecoinRes),
        ]);

      console.log('API Responses:', {
        transactions: txJson.transactions?.length,
        accounts: accountsJson.accounts?.length,
        tvl: tvlJson,
        stablecoin: stablecoinJson,
      });

      // --- OVERVIEW METRICS ---
      const transactions = txJson.transactions || [];
      const accounts = accountsJson.accounts || [];

      const networkFees =
        transactions.reduce(
          (sum, tx) => sum + (parseInt(tx.charged_tx_fee) || 0),
          0
        ) / 100000000; // Convert from tinybars to HBAR

      const newAccounts1h = accounts.length;
      const activeAccounts1h = transactions.length;
      const activeContracts1h = transactions.filter((tx) =>
        tx.name?.includes('CONTRACT')
      ).length;
      const networkActivity = transactions.length;

      // --- PERFORMANCE METRICS ---
      const avgTTC =
        transactions.reduce(
          (sum, tx) => sum + (tx.valid_duration_seconds || 3),
          0
        ) / (transactions.length || 1);

      const tps = networkActivity / 3600; // Approximate TPS



      // --- TRANSACTION BREAKDOWN ---
      const perType = {
        crypto: 0,
        hcs: 0,
        hfs: 0,
        hscs: 0,
        hts: 0,
        other: 0,
      };

      transactions.forEach((tx) => {
        const type = tx.name || '';
        if (type.includes('CRYPTOTRANSFER')) perType.crypto++;
        else if (type.includes('CONSENSUS')) perType.hcs++;
        else if (type.includes('FILE')) perType.hfs++;
        else if (type.includes('CONTRACT')) perType.hscs++;
        else if (type.includes('TOKEN')) perType.hts++;
        else perType.other++;
      });

      // --- MARKET DATA ---
      // Import and use price service
      const { priceService } = await import('../../services/priceService');
      const hbarUSD = await priceService.fetchHbarPrice();
      console.log('HBAR USD:', hbarUSD);
      // Get latest TVL from historical data
      const hederaTVL =
        Array.isArray(tvlJson) && tvlJson.length > 0
          ? tvlJson[tvlJson.length - 1].tvl / 1_000_000 // Convert to millions
          : 0;

      // --- Get stablecoin market cap from Llama API ---
      const latestStablecoin =
        Array.isArray(stablecoinJson) && stablecoinJson.length > 0
          ? stablecoinJson[stablecoinJson.length - 1]
          : null;

      const stablecoinMC = latestStablecoin?.totalCirculatingUSD
        ? Object.values(latestStablecoin.totalCirculatingUSD).reduce(
            (sum, value) => sum + (value || 0),
            0
          ) / 1_000_000
        : 87; // Fallback based on console data

      const payload = {
        overview: {
          networkFees,
          newAccounts1h,
          activeAccounts1h,
          activeContracts1h,
          networkActivity,
          hbarUSD,
          hederaTVL,
          stablecoinMC,
        },
        performance: {
          avgTTC: avgTTC || 0,
          tps: tps || 0,
        },
        transactions: {
          totalTx: transactions.length
            ? parseInt(transactions[0].transaction_id?.split('@')[0]) || 0
            : 0,
          newTx1h: transactions.length,
          perType,
        },
      };

      return { ...payload, cached: false, fetchedAt: now };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch network data');
    }
  }
);

export const fetchEcosystemMetrics = createAsyncThunk(
  'network/fetchEcosystemMetrics',
  async (_, { getState, rejectWithValue }) => {
    try {
      const now = Date.now();
      const timestamp24hAgo = (now - 86400000) * 1000000;
      const currentTimestamp = now * 1000000;

      const [metricsResult, feesResult] = await Promise.all([
        apolloClient.query({ query: ALL_METRICS_QUERY }),
        apolloClient.query({
          query: NETWORK_FEES_QUERY,
          variables: { timestamp24hAgo, currentTimestamp }
        })
      ]);

      const metricsJson = { data: metricsResult.data, errors: metricsResult.errors };
      const feesJson = { data: feesResult.data, errors: feesResult.errors };

      if (metricsJson.errors) {
        throw new Error(metricsJson.errors.map((e) => e.message).join('; '));
      }
      if (feesJson.errors) {
        throw new Error(feesJson.errors.map((e) => e.message).join('; '));
      }

      const d = metricsJson.data || {};
      const f = feesJson.data?.transaction_aggregate?.aggregate || {};
      
      console.log('Fees Response:', feesJson.data);
      console.log('Fees Aggregate:', f);
      
      const newAccountsHour = Number(d.newAccountsHour?.[0]?.total || 0);
      const activeAccountsHour = Number(d.activeAccountsHour?.[0]?.total || 0);
      const networkTPS = Number(d.networkTPS?.[0]?.total || 0);
      const avgTTC = Number(d.avgTTC?.[0]?.total || 0) / 1_000_000;
      
      const networkFees = Number(f.sum?.charged_tx_fee || 0) / 100_000_000;
      
      console.log('Calculated Fees:', { networkFees });

      return {
        overview: {
          newAccounts1h: newAccountsHour,
          activeAccounts1h: activeAccountsHour,
          networkFees,
        },
        performance: {
          avgTTC,
          tps: networkTPS,
        },
        fetchedAt: now,
        cached: false,
      };
    } catch (err) {
      return rejectWithValue(
        err.message || 'Failed to fetch ecosystem metrics'
      );
    }
  }
);

export const fetchTransactionTypes = createAsyncThunk(
  'network/fetchTransactionTypes',
  async (timeframe = 'day', { rejectWithValue }) => {
    try {
      const result = await apolloClient.query({
        query: TRANSACTION_TYPES_QUERY,
        variables: { period: timeframe }
      });

      const json = { data: result.data, errors: result.errors };
      if (json.errors) {
        throw new Error(json.errors.map((e) => e.message).join('; '));
      }

      const d = json.data || {};
      const perType = {
        crypto: Number(d.crypto?.[0]?.total || 0),
        hcs: Number(d.hcs?.[0]?.total || 0),
        hfs: Number(d.hfs?.[0]?.total || 0),
        hscs: Number(d.hscs?.[0]?.total || 0),
        hts: Number(d.hts?.[0]?.total || 0),
        other: Number(d.other?.[0]?.total || 0),
      };

      return {
        transactions: {
          totalTx: Number(d.all?.[0]?.total || 0),
          perType,
        },
        cached: false,
        fetchedAt: Date.now(),
      };
    } catch (err) {
      return rejectWithValue(
        err.message || 'Failed to fetch transaction types'
      );
    }
  }
);

export const fetchNewTransactionTypes = createAsyncThunk(
  'network/fetchNewTransactionTypes',
  async (timeframe = 'hour', { rejectWithValue }) => {
    try {
      const result = await apolloClient.query({
        query: NEW_TRANSACTION_TYPES_QUERY,
        variables: { period: timeframe }
      });

      const json = { data: result.data, errors: result.errors };
      if (json.errors) {
        throw new Error(json.errors.map((e) => e.message).join('; '));
      }

      const d = json.data || {};
      console.log('New transaction types response:', d);
      const newPerType = {
        crypto: Number(d.new_crypto_transactions?.[0]?.total || 0),
        hcs: Number(d.new_hcs_transactions?.[0]?.total || 0),
        hfs: Number(d.new_hfs_transactions?.[0]?.total || 0),
        hscs: Number(d.new_hscs_transactions?.[0]?.total || 0),
        hts: Number(d.new_hts_transactions?.[0]?.total || 0),
        other: Number(d.new_other_transactions?.[0]?.total || 0),
      };

      return {
        transactions: {
          newTx1h: Number(d.new_transactions?.[0]?.total || 0),
          newPerType,
        },
        cached: false,
        fetchedAt: Date.now(),
      };
    } catch (err) {
      return rejectWithValue(
        err.message || 'Failed to fetch new transaction types'
      );
    }
  }
);

// --- INITIAL STATE ---
const initialState = {
  timeframe: '24h',
  overview: {
    networkFees: 0,
    newAccounts1h: 0,
    activeAccounts1h: 0,
    activeContracts1h: 0,
    networkActivity: 0,
    hbarUSD: 0,
    hederaTVL: 0,
    stablecoinMC: 0,
  },
  performance: {
    avgTTC: 0,
    tps: 0,
  },
  transactions: {
    totalTx: 0,
    newTx1h: 0,
    perType: {
      crypto: 0,
      hcs: 0,
      hfs: 0,
      hscs: 0,
      hts: 0,
      other: 0,
    },
    newPerType: {
      crypto: 0,
      hcs: 0,
      hfs: 0,
      hscs: 0,
      hts: 0,
      other: 0,
    },
  },
  transactionTab: 'total',
  transactionTimeframe: 'day',
  lastFetched: null,
  cachedData: null,
  metricsLastFetched: null,
  metricsCachedData: null,
  status: 'idle',
  error: null,
};

// --- SLICE ---
export const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setTimeframe: (state, action) => {
      state.timeframe = action.payload;
    },
    setTransactionTab: (state, action) => {
      state.transactionTab = action.payload;
    },
    setTransactionTimeframe: (state, action) => {
      state.transactionTimeframe = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNetworkData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchNetworkData.fulfilled, (state, action) => {
        const { cached, fetchedAt, ...data } = action.payload;
        state.status = 'succeeded';
        state.overview = data.overview;
        state.performance = data.performance;
        state.transactions = data.transactions;
        state.error = null;

        // Store cache
        if (!cached) {
          state.lastFetched = fetchedAt;
          state.cachedData = data;
        }
      })
      .addCase(fetchNetworkData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchEcosystemMetrics.fulfilled, (state, action) => {
        const { cached, fetchedAt, ...data } = action.payload;

        // Merge GraphQL data with existing state
        if (data.overview) {
          state.overview = { ...state.overview, ...data.overview };
        }
        if (data.performance) {
          state.performance = { ...state.performance, ...data.performance };
        }

        if (!cached) {
          state.metricsLastFetched = fetchedAt;
          state.metricsCachedData = data;
        }
      })
      .addCase(fetchEcosystemMetrics.rejected, (state, action) => {
        console.error('GraphQL fetch failed:', action.payload);
      })
      .addCase(fetchTransactionTypes.fulfilled, (state, action) => {
        const { cached, fetchedAt, ...data } = action.payload;
        
        if (data.transactions) {
          state.transactions = { ...state.transactions, ...data.transactions };
        }
      })
      .addCase(fetchTransactionTypes.rejected, (state, action) => {
        console.error('Transaction types fetch failed:', action.payload);
      })
      .addCase(fetchNewTransactionTypes.fulfilled, (state, action) => {
        const { cached, fetchedAt, ...data } = action.payload;
        
        if (data.transactions) {
          state.transactions = { ...state.transactions, ...data.transactions };
        }
      })
      .addCase(fetchNewTransactionTypes.rejected, (state, action) => {
        console.error('New transaction types fetch failed:', action.payload);
      });
  },
});

export const { setTimeframe, setTransactionTab, setTransactionTimeframe } = networkSlice.actions;
export default networkSlice.reducer;
