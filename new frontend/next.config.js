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
};

module.exports = nextConfig;