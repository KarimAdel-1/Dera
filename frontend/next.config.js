// Environment variables are loaded from .env.local automatically by Next.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fallback for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
      http: false,
      https: false,
      zlib: false,
      path: false,
      os: false,
    };

    // For server-side, ignore these modules completely
    if (isServer) {
      // Externalize problematic packages
      config.externals = config.externals || [];
      config.externals.push({
        '@hashgraph/sdk': 'commonjs @hashgraph/sdk',
        '@bladelabs/blade-web3.js': 'commonjs @bladelabs/blade-web3.js'
      });
    }

    config.ignoreWarnings = [
      { module: /node_modules\/@hashgraph\/hedera-wallet-connect/ },
      { module: /node_modules\/hashconnect/ },
      { message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/ },
      { message: /Can't resolve 'crypto'/ }
    ];

    return config;
  },
  // Make environment variables available to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_COINGECKO_API: process.env.NEXT_PUBLIC_COINGECKO_API || 'https://api.coingecko.com/api/v3/',
    NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Dera Platform',
    NEXT_PUBLIC_APP_DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'Decentralized Lending & Borrowing on Hedera',
    NEXT_PUBLIC_APP_ICON: process.env.NEXT_PUBLIC_APP_ICON || '',
  },
};

module.exports = nextConfig;