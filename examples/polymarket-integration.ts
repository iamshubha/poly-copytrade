/**
 * Example usage of Polymarket Integration Module
 */

import PolymarketClient from '../lib/polymarketClient';
import TradeMonitorService from '../lib/tradeMonitor';
import { CopyTradingEngine } from '../lib/copyEngine';

async function main() {
  console.log('🚀 Polymarket Integration Example\n');

  // ============================================================================
  // 1. INITIALIZE CLIENT
  // ============================================================================
  
  const client = new PolymarketClient({
    restApiUrl: 'https://clob.polymarket.com',
    wsApiUrl: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    timeout: 10000,
  });

  console.log('✅ Client initialized\n');

  // ============================================================================
  // 2. FETCH MARKET DATA
  // ============================================================================

  console.log('📊 Fetching markets...');
  const markets = await client.getMarkets(5);
  
  if (markets.length > 0) {
    console.log(`✅ Found ${markets.length} markets\n`);
    
    markets.forEach((market, i) => {
      console.log(`${i + 1}. ${market.question}`);
      console.log(`   Volume: $${market.volume.toLocaleString()}`);
      console.log(`   Outcomes: ${market.outcomes.join(', ')}`);
      console.log(`   Prices: ${market.outcomesPrices.join(', ')}`);
      console.log('');
    });

    // Get detailed stats for first market
    const marketId = markets[0].id;
    console.log(`📈 Fetching stats for market: ${marketId}`);
    const stats = await client.getMarketStats(marketId);
    
    if (stats) {
      console.log('✅ Market stats:');
      console.log(`   24h Volume: $${stats.volume24h.toLocaleString()}`);
      console.log(`   24h Trades: ${stats.trades24h}`);
      console.log(`   Last Price: ${stats.lastPrice}`);
      console.log('');
    }

    // Get recent trades
    console.log(`📋 Fetching recent trades...`);
    const trades = await client.getMarketTrades(marketId, 5);
    console.log(`✅ Found ${trades.length} trades\n`);
    
    trades.forEach((trade, i) => {
      console.log(`${i + 1}. ${trade.side} ${trade.size} @ $${trade.price}`);
      console.log(`   Amount: $${trade.amount.toFixed(2)}`);
      console.log(`   Maker: ${trade.maker.slice(0, 10)}...`);
      console.log('');
    });
  }

  // ============================================================================
  // 3. DETECT LEADER WALLETS
  // ============================================================================

  console.log('🔍 Detecting leader wallets...');
  const leaders = await client.detectLeaderWallets(5000, 10);
  
  if (leaders.length > 0) {
    console.log(`✅ Found ${leaders.length} leader wallets\n`);
    
    leaders.forEach((leader, i) => {
      console.log(`${i + 1}. ${leader.address.slice(0, 10)}...`);
      console.log(`   Volume: $${leader.volume.toLocaleString()}`);
      console.log(`   Trades: ${leader.trades}`);
      console.log(`   ROI: ${leader.roi.toFixed(2)}%`);
      console.log(`   Win Rate: ${(leader.winRate * 100).toFixed(1)}%`);
      console.log('');
    });
  }

  // ============================================================================
  // 4. WEBSOCKET REAL-TIME DATA (Optional)
  // ============================================================================

  console.log('📡 Testing WebSocket connection...');
  
  try {
    await client.connectWebSocket();
    console.log('✅ WebSocket connected\n');

    // Subscribe to market trades
    if (markets.length > 0) {
      const marketId = markets[0].id;
      console.log(`📡 Subscribing to trades for market: ${marketId}`);
      
      client.on('trade', (trade) => {
        console.log(`🔔 New trade: ${trade.side} ${trade.size} @ $${trade.price}`);
      });

      client.subscribeToMarketTrades(marketId);
      
      // Listen for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      client.disconnectWebSocket();
      console.log('✅ WebSocket test complete\n');
    }
  } catch (error) {
    console.log('⚠️  WebSocket not available (optional feature)\n');
  }

  // ============================================================================
  // 5. MONITOR LEADER WALLET (REST Polling)
  // ============================================================================

  if (leaders.length > 0) {
    const leaderAddress = leaders[0].address;
    console.log(`👀 Monitoring leader wallet: ${leaderAddress}`);
    console.log('Listening for new trades for 30 seconds...\n');

    const cleanup = await client.monitorWalletTrades(
      leaderAddress,
      (trade) => {
        console.log(`🔔 Leader made a trade!`);
        console.log(`   Market: ${trade.marketId}`);
        console.log(`   Side: ${trade.side}`);
        console.log(`   Amount: $${trade.amount.toFixed(2)}`);
        console.log('');
      },
      5000 // Poll every 5 seconds
    );

    // Monitor for 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    cleanup(); // Stop monitoring
    console.log('✅ Monitoring stopped\n');
  }

  // ============================================================================
  // 6. TRADE MONITOR SERVICE (Full Integration)
  // ============================================================================

  console.log('🎯 Testing Trade Monitor Service...');
  
  const copyEngine = new CopyTradingEngine();
  const monitor = new TradeMonitorService(client, copyEngine, {
    pollInterval: 5000,
    minTradeAmount: 10,
  });

  // Set up event listeners
  monitor.on('started', () => console.log('✅ Monitor service started'));
  monitor.on('leaderTrade', ({ leaderAddress, trade }) => {
    console.log(`🔔 Leader trade detected from ${leaderAddress.slice(0, 10)}...`);
    console.log(`   Will trigger ${trade.amount} copy trades`);
  });

  // Start monitoring
  await monitor.start();

  // Add top leaders
  await monitor.addTopLeaders(5, 5000);

  console.log('\n✅ All tests complete!');
  console.log('\n📚 Integration module features:');
  console.log('   ✅ REST API for market data');
  console.log('   ✅ WebSocket for real-time updates');
  console.log('   ✅ Leader wallet detection');
  console.log('   ✅ Trade monitoring with polling');
  console.log('   ✅ Copy trade automation');
  console.log('   ✅ Type-safe interfaces');
  
  // Cleanup
  setTimeout(() => {
    monitor.stop();
    process.exit(0);
  }, 10000);
}

// Run example
if (require.main === module) {
  main().catch(console.error);
}

export default main;
