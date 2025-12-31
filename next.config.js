/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_POLYMARKET_API: process.env.NEXT_PUBLIC_POLYMARKET_API || 'https://clob.polymarket.com',
  },
  
  // Configure webpack to handle @polymarket packages properly  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark these packages as external for server-side to prevent webpack bundling issues
      config.externals.push({
        '@polymarket/clob-client': 'commonjs @polymarket/clob-client',
        '@polymarket/order-utils': 'commonjs @polymarket/order-utils',
      });
    }
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-Requested-With, Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
