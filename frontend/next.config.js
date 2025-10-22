/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_HEDERA_NETWORK: process.env.NEXT_PUBLIC_HEDERA_NETWORK,
    NEXT_PUBLIC_LENDING_POOL_ADDRESS: process.env.NEXT_PUBLIC_LENDING_POOL_ADDRESS,
    NEXT_PUBLIC_BORROWING_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_BORROWING_CONTRACT_ADDRESS,
  },
};

module.exports = nextConfig;
