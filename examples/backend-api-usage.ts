/**
 * Backend API Integration Usage Examples
 * Demonstrates how to use the unified API integration module
 */

import { getBackendAPI, createBackendAPI } from '../src/lib/backend-api-integration';
import type { Trade, Market, LeaderWallet } from '../src/lib/polymarket/types';

// ============================================
// EXAMPLE 1: Basic Setup & Initialization
// ============================================

async function example1_BasicSetup() {
  console.log('\n=== Example 1: Basic Setup ===\n');

  // Get singleton instance with WebSocket enabled
  const api = getBackendAPI({
    useWebSocket: true,
    leaderDetection: {
      enabled: true,
      minVolume: 50000,
      minTrades: 50,
      minWinRate: 0.60,
    },
  });

  // Initialize the API
  await api.initialize();

  // Check status
  const status = api.getStatus();
  console.log('API Status:', status);

  // Cleanup
  await api.disconnect();
}

// ============================================
// EXAMPLE 2: Subscribe to Market Trades (WebSocket)
// ============================================

async function example2_SubscribeMarketTrades() {
  console.log('\n=== Example 2: Subscribe to Market Trades (WebSocket) ===\n');

  const api = getBackendAPI({ useWebSocket: true });
  await api.initialize();

  // Listen for trades
  api.on('trade', (trade: Trade) => {
    console.log('📊 New Trade:', {
      market: trade.market,
      side: trade.side,
      price: trade.price,
      size: trade.size,
      maker: trade.maker_address.slice(0, 8) + '...',
    });
  });

  // Subscribe to specific market
  const marketId = 'YOUR_MARKET_CONDITION_ID';
  const subscriptionId = await api.subscribeToMarketTrades(marketId);
  console.log(`Subscribed with ID: ${subscriptionId}`);

  // Listen for market-specific trades
  api.on('trade:market', (mktId: string, trade: Trade) => {
    console.log(`Trade in market ${mktId}:`, trade.side, trade.price);
  });

  // Keep running for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Unsubscribe
  await api.unsubscribe(subscriptionId);
  await api.disconnect();
}

// ============================================
// EXAMPLE 3: Subscribe to Market Trades (REST Polling)
// ============================================

async function example3_SubscribeMarketTradesPolling() {
  console.log('\n=== Example 3: Subscribe to Market Trades (Polling) ===\n');

  const api = getBackendAPI({
    useWebSocket: false,
    pollingInterval: 3000, // Poll every 3 seconds
  });
  await api.initialize();

  // Listen for trades
  api.on('trade', (trade: Trade) => {
    console.log('📊 Polled Trade:', {
      market: trade.market,
      side: trade.side,
      price: trade.price,
      size: trade.size,
    });
  });

  // Subscribe to specific market
  const marketId = 'YOUR_MARKET_CONDITION_ID';
  await api.subscribeToMarketTrades(marketId, { useWebSocket: false });

  // Keep running for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await api.disconnect();
}

// ============================================
// EXAMPLE 4: Fetch Market Stats
// ============================================

async function example4_FetchMarketStats() {
  console.log('\n=== Example 4: Fetch Market Stats ===\n');

  const api = getBackendAPI();
  await api.initialize();

  // Fetch stats for a single market
  const marketId = 'YOUR_MARKET_CONDITION_ID';
  const stats = await api.fetchMarketStats(marketId);
  
  console.log('Market Stats:', {
    volume24h: stats.volume_24h,
    volumeTotal: stats.volume_total,
    liquidity: stats.liquidity,
    priceChange24h: `${stats.price_change_24h}%`,
    tradesCount: stats.trades_count_24h,
    uniqueTraders: stats.unique_traders_24h,
  });

  // Fetch stats for multiple markets
  const marketIds = ['MARKET_1', 'MARKET_2', 'MARKET_3'];
  const multiStats = await api.fetchMultipleMarketStats(marketIds);
  
  console.log('\nMultiple Market Stats:');
  multiStats.forEach((stats, marketId) => {
    console.log(`${marketId}: $${stats.volume_24h} volume`);
  });

  await api.disconnect();
}

// ============================================
// EXAMPLE 5: Search & Filter Markets
// ============================================

async function example5_SearchMarkets() {
  console.log('\n=== Example 5: Search & Filter Markets ===\n');

  const api = getBackendAPI();
  await api.initialize();

  // Get trending markets
  const trending = await api.getTrendingMarkets(5);
  console.log(`Found ${trending.length} trending markets:`);
  trending.forEach((market: Market, i: number) => {
    console.log(`${i + 1}. ${market.question}`);
    console.log(`   Volume: $${market.volume}`);
    console.log(`   Active: ${market.active}\n`);
  });

  // Search with custom filters
  const sportMarkets = await api.searchMarkets({
    active: true,
    category: 'sports',
    min_volume: 10000,
    limit: 10,
    order_by: 'volume',
    order_dir: 'desc',
  });

  console.log(`\nFound ${sportMarkets.length} sport markets`);

  await api.disconnect();
}

// ============================================
// EXAMPLE 6: Leader Wallet Detection
// ============================================

async function example6_LeaderWalletDetection() {
  console.log('\n=== Example 6: Leader Wallet Detection ===\n');

  const api = getBackendAPI({
    leaderDetection: {
      enabled: true,
      minVolume: 100000, // $100k minimum volume
      minTrades: 100,
      minWinRate: 0.55, // 55% win rate
    },
  });
  await api.initialize();

  // Discover leader wallets
  console.log('Discovering leader wallets...');
  const leaders = await api.detectLeaderWallets();
  
  console.log(`\nFound ${leaders.length} leader wallets:`);
  leaders.slice(0, 5).forEach((leader: LeaderWallet, i: number) => {
    console.log(`\n${i + 1}. ${leader.address.slice(0, 10)}...`);
    console.log(`   Volume: $${leader.stats.total_volume.toLocaleString()}`);
    console.log(`   Trades: ${leader.stats.total_trades}`);
    console.log(`   Win Rate: ${(leader.stats.win_rate * 100).toFixed(2)}%`);
    console.log(`   PnL: $${leader.stats.total_pnl.toLocaleString()}`);
  });

  // Check if specific wallet is a leader
  const walletToCheck = leaders[0]?.address;
  if (walletToCheck) {
    const isLeader = await api.isLeaderWallet(walletToCheck);
    console.log(`\nIs ${walletToCheck.slice(0, 10)}... a leader? ${isLeader}`);
  }

  await api.disconnect();
}

// ============================================
// EXAMPLE 7: Monitor Leader Wallet Trades
// ============================================

async function example7_MonitorLeaderTrades() {
  console.log('\n=== Example 7: Monitor Leader Wallet Trades ===\n');

  const api = getBackendAPI({
    useWebSocket: true,
    leaderDetection: {
      enabled: true,
    },
  });
  await api.initialize();

  // Listen for leader trades
  api.on('leader:trade', (leader: LeaderWallet, trade: Trade) => {
    console.log('\n🌟 LEADER TRADE DETECTED!');
    console.log('Leader:', leader.address.slice(0, 10) + '...');
    console.log('Trade:', {
      market: trade.market,
      side: trade.side,
      price: trade.price,
      size: trade.size,
      timestamp: trade.timestamp,
    });
    console.log('Leader Stats:', {
      volume: `$${leader.stats.total_volume.toLocaleString()}`,
      winRate: `${(leader.stats.win_rate * 100).toFixed(2)}%`,
      pnl: `$${leader.stats.total_pnl.toLocaleString()}`,
    });
  });

  // Discover and monitor top leaders
  const leaders = await api.detectLeaderWallets();
  const topLeaders = leaders.slice(0, 3);

  console.log(`Monitoring ${topLeaders.length} top leaders...`);
  for (const leader of topLeaders) {
    await api.monitorLeaderWallet(leader.address);
    console.log(`✓ Monitoring ${leader.address.slice(0, 10)}...`);
  }

  // Keep running for 5 minutes
  await new Promise((resolve) => setTimeout(resolve, 300000));

  await api.disconnect();
}

// ============================================
// EXAMPLE 8: Subscribe to Wallet Trades
// ============================================

async function example8_SubscribeWalletTrades() {
  console.log('\n=== Example 8: Subscribe to Wallet Trades ===\n');

  const api = getBackendAPI({ useWebSocket: true });
  await api.initialize();

  const walletAddress = 'YOUR_WALLET_ADDRESS';

  // Listen for wallet-specific trades
  api.on('trade:wallet', (wallet: string, trade: Trade) => {
    console.log(`\n💼 Trade from ${wallet.slice(0, 10)}...`);
    console.log('Details:', {
      market: trade.market,
      side: trade.side,
      price: trade.price,
      size: trade.size,
    });
  });

  // Subscribe to wallet
  await api.subscribeToWalletTrades(walletAddress);
  console.log(`Subscribed to wallet ${walletAddress.slice(0, 10)}...`);

  // Keep running for 30 seconds
  await new Promise((resolve) => setTimeout(resolve, 30000));

  await api.disconnect();
}

// ============================================
// EXAMPLE 9: Complete Trading Bot Setup
// ============================================

async function example9_CompleteTradingBot() {
  console.log('\n=== Example 9: Complete Trading Bot Setup ===\n');

  const api = getBackendAPI({
    useWebSocket: true,
    leaderDetection: {
      enabled: true,
      minVolume: 100000,
      minTrades: 100,
      minWinRate: 0.60,
    },
  });

  // Set up error handling
  api.on('error', (error: Error) => {
    console.error('❌ Error:', error.message);
  });

  // Set up connection monitoring
  api.on('connected', () => {
    console.log('✅ Connected to API');
  });

  api.on('disconnected', () => {
    console.log('❌ Disconnected from API');
  });

  // Initialize
  await api.initialize();

  // 1. Discover leader wallets
  console.log('\n1️⃣ Discovering leader wallets...');
  const leaders = await api.detectLeaderWallets();
  console.log(`Found ${leaders.length} leaders`);

  // 2. Monitor top 5 leaders
  console.log('\n2️⃣ Setting up leader monitoring...');
  const topLeaders = leaders.slice(0, 5);
  for (const leader of topLeaders) {
    await api.monitorLeaderWallet(leader.address);
  }

  // 3. Subscribe to trending markets
  console.log('\n3️⃣ Subscribing to trending markets...');
  const trendingMarkets = await api.getTrendingMarkets(10);
  for (const market of trendingMarkets) {
    await api.subscribeToMarketTrades(market.condition_id);
  }

  // 4. Set up trade handler with copy logic
  api.on('leader:trade', async (leader: LeaderWallet, trade: Trade) => {
    console.log('\n🎯 Leader trade detected - analyzing...');
    
    // Fetch market stats for decision making
    const marketStats = await api.fetchMarketStats(trade.market);
    
    // Example copy logic
    if (
      leader.stats.win_rate > 0.65 &&
      marketStats.liquidity > 50000 &&
      parseFloat(trade.size) > 100
    ) {
      console.log('✅ Trade meets copy criteria!');
      console.log('Would copy:', {
        market: trade.market,
        side: trade.side,
        price: trade.price,
        size: trade.size,
      });
      // Here you would execute the copy trade
    } else {
      console.log('⏭️  Trade does not meet criteria, skipping');
    }
  });

  // 5. Monitor status
  setInterval(() => {
    const status = api.getStatus();
    console.log('\n📊 Status Update:');
    console.log(`   Subscriptions: ${status.subscriptions.length}`);
    console.log(`   Monitored Leaders: ${status.monitoredLeaders}`);
    console.log(`   Connected: ${status.connected}`);
  }, 60000); // Every minute

  console.log('\n🚀 Trading bot is running...\n');

  // Keep running indefinitely
  await new Promise(() => {});
}

// ============================================
// EXAMPLE 10: Event-Driven Architecture
// ============================================

async function example10_EventDriven() {
  console.log('\n=== Example 10: Event-Driven Architecture ===\n');

  const api = createBackendAPI({ useWebSocket: true });

  // Set up comprehensive event listeners
  api.on('trade', (trade: Trade) => {
    // All trades
    console.log('📊 Trade:', trade.id);
  });

  api.on('trade:market', (marketId: string, trade: Trade) => {
    // Market-specific trades
    console.log(`📈 Market ${marketId.slice(0, 8)}... trade`);
  });

  api.on('leader:detected', (wallet: LeaderWallet) => {
    // New leader detected
    console.log('⭐ New leader detected:', wallet.address.slice(0, 10) + '...');
  });

  api.on('leader:trade', (leader: LeaderWallet, trade: Trade) => {
    // Leader trade
    console.log('🌟 Leader trade!');
  });

  api.on('market:stats', (marketId: string, stats) => {
    // Market stats updated
    console.log(`📊 Stats update for ${marketId.slice(0, 8)}...`);
  });

  api.on('connected', () => {
    console.log('✅ API Connected');
  });

  api.on('disconnected', () => {
    console.log('❌ API Disconnected');
  });

  api.on('error', (error: Error) => {
    console.error('❌ Error:', error.message);
  });

  await api.initialize();

  // Your application logic here...

  await new Promise((resolve) => setTimeout(resolve, 60000));
  await api.disconnect();
}

// ============================================
// RUN EXAMPLES
// ============================================

async function main() {
  try {
    // Uncomment the example you want to run:
    
    // await example1_BasicSetup();
    // await example2_SubscribeMarketTrades();
    // await example3_SubscribeMarketTradesPolling();
    // await example4_FetchMarketStats();
    // await example5_SearchMarkets();
    // await example6_LeaderWalletDetection();
    // await example7_MonitorLeaderTrades();
    // await example8_SubscribeWalletTrades();
    // await example9_CompleteTradingBot();
    // await example10_EventDriven();

    console.log('\n✅ Example completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  example1_BasicSetup,
  example2_SubscribeMarketTrades,
  example3_SubscribeMarketTradesPolling,
  example4_FetchMarketStats,
  example5_SearchMarkets,
  example6_LeaderWalletDetection,
  example7_MonitorLeaderTrades,
  example8_SubscribeWalletTrades,
  example9_CompleteTradingBot,
  example10_EventDriven,
};
