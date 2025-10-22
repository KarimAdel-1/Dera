const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    config.ignoreWarnings = [
      { module: /node_modules\/@hashgraph\/hedera-wallet-connect/ },
      { message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/ }
    ];

    return config;
  },
  // Make environment variables available to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_COINGECKO_API: process.env.NEXT_PUBLIC_COINGECKO_API || 'https://api.coingecko.com/api/v3/',
    NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001',
    NEXT_PUBLIC_LENDING_POOL_ADDRESS: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Dera Platform',
    NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Decentralized Lending & Borrowing on Hedera',
    NEXT_PUBLIC_APP_ICON: process.env.NEXT_PUBLIC_APP_ICON || '',
  },
};

module.exports = nextConfig;