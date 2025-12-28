/**
 * Example Usage: Polymarket Integration
 * Demonstrates how to use the Polymarket API integration
 */

import polymarket, {
  Trade,
  WSMarketUpdate,
  LeaderWallet,
} from "../lib/polymarket";

// ============================================
// REST API EXAMPLES
// ============================================

async function restApiExamples() {
  console.log("=== REST API Examples ===\n");

  // 1. Fetch markets
  console.log("1. Fetching markets...");
  const markets = await polymarket.rest.getMarkets({
    active: true,
    limit: 5,
  });
  console.log(`   Found ${markets.length} markets`);
  console.log(`   First market: ${markets[0]?.question}\n`);

  // 2. Get market stats
  if (markets[0]) {
    console.log("2. Fetching market stats...");
    const stats = await polymarket.rest.getMarketStats(markets[0].condition_id);
    console.log(`   Volume: $${stats.volume_total.toLocaleString()}`);
    console.log(`   Trades: ${stats.trades_count_24h}\n`);
  }

  // 3. Get trades for a market
  if (markets[0]) {
    console.log("3. Fetching recent trades...");
    const trades = await polymarket.rest.getMarketTrades(
      markets[0].condition_id,
      5
    );
    console.log(`   Found ${trades.length} recent trades`);
    if (trades[0]) {
      console.log(
        `   Latest: ${trades[0].side} ${trades[0].size} @ ${trades[0].price}\n`
      );
    }
  }

  // 4. Get leader wallets
  console.log("4. Fetching leader wallets...");
  const leaders = await polymarket.rest.getLeaderWallets({
    min_volume: 50000,
    limit: 3,
  });
  console.log(`   Found ${leaders.length} leader wallets`);
  leaders.forEach((leader, i) => {
    console.log(
      `   ${i + 1}. ${leader.address.slice(
        0,
        10
      )}... - $${leader.stats.total_volume.toLocaleString()}`
    );
  });
  console.log();
}

// ============================================
// WEBSOCKET EXAMPLES
// ============================================

async function websocketExamples() {
  console.log("=== WebSocket Examples ===\n");

  // 1. Connect to WebSocket
  console.log("1. Connecting to WebSocket...");
  await polymarket.ws.connect();
  console.log("   Connected!\n");

  // 2. Subscribe to market trades
  const markets = await polymarket.rest.getMarkets({ active: true, limit: 1 });
  if (markets[0]) {
    console.log("2. Subscribing to market trades...");
    await polymarket.ws.subscribeToMarketTrades(
      markets[0].condition_id,
      (trade: Trade) => {
        console.log(
          `   📊 Trade: ${trade.side} ${trade.size} @ ${trade.price}`
        );
      }
    );
    console.log("   Subscribed!\n");
  }

  // 3. Subscribe to market updates
  if (markets[0]) {
    console.log("3. Subscribing to market updates...");
    await polymarket.ws.subscribeToMarketUpdates(
      markets[0].condition_id,
      (update: WSMarketUpdate) => {
        console.log(`   📈 Price update: ${update.prices.join(", ")}`);
      }
    );
    console.log("   Subscribed!\n");
  }

  // 4. Handle errors
  polymarket.ws.onError((error) => {
    console.error("   ❌ WebSocket error:", error.message);
  });

  // 5. Handle reconnection
  polymarket.ws.onConnect(() => {
    console.log("   ✅ WebSocket reconnected");
  });

  polymarket.ws.onDisconnect(() => {
    console.log("   ⚠️  WebSocket disconnected");
  });
}

// ============================================
// LEADER DETECTION EXAMPLES
// ============================================

async function leaderDetectionExamples() {
  console.log("=== Leader Detection Examples ===\n");

  // 1. Discover leader wallets
  console.log("1. Discovering leader wallets...");
  const leaders = await polymarket.leader.discoverLeaderWallets();
  console.log(`   Found ${leaders.length} leaders\n`);

  // 2. Check if wallet is a leader
  if (leaders[0]) {
    console.log("2. Checking if wallet is leader...");
    const isLeader = await polymarket.leader.isLeaderWallet(leaders[0].address);
    console.log(`   Is leader: ${isLeader}\n`);
  }

  // 3. Monitor leader trades
  console.log("3. Starting leader trade monitoring...");

  polymarket.leader.onLeaderTrade((leader: LeaderWallet, trade: Trade) => {
    console.log(`   🎯 Leader trade detected!`);
    console.log(`      Wallet: ${leader.address.slice(0, 10)}...`);
    console.log(`      Market: ${trade.market}`);
    console.log(`      Side: ${trade.side}`);
    console.log(`      Size: ${trade.size}`);
    console.log(`      Price: ${trade.price}\n`);
  });

  await polymarket.leader.startMonitoring();
  console.log("   Monitoring started!\n");

  // 4. Get monitoring status
  const status = polymarket.leader.getStatus();
  console.log("4. Monitoring status:");
  console.log(`   Is monitoring: ${status.isMonitoring}`);
  console.log(`   Leaders cached: ${status.leaderCount}`);
  console.log(`   Wallets monitored: ${status.monitoredCount}`);
  console.log(`   WebSocket connected: ${status.wsConnected}\n`);
}

// ============================================
// COMPLETE INTEGRATION EXAMPLE
// ============================================

async function completeExample() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Polymarket Integration - Complete Demo     ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  try {
    // Step 1: REST API
    await restApiExamples();

    // Step 2: WebSocket
    await websocketExamples();

    // Step 3: Leader Detection
    await leaderDetectionExamples();

    console.log("✅ All examples completed successfully!");

    // Keep running for 30 seconds to see real-time updates
    console.log("\n⏱️  Listening for 30 seconds...\n");
    await new Promise((resolve) => setTimeout(resolve, 30000));
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    // Cleanup
    polymarket.ws.disconnect();
    polymarket.leader.stopMonitoring();
    console.log("\n👋 Demo completed. Goodbye!");
    process.exit(0);
  }
}

// ============================================
// USAGE IN COPY TRADING ENGINE
// ============================================

export async function integrateWithCopyEngine() {
  // This shows how to integrate with your copy trading engine

  // 1. Start monitoring leaders
  await polymarket.leader.startMonitoring();

  // 2. Handle leader trades
  polymarket.leader.onLeaderTrade(async (leader, trade) => {
    console.log(`Detected trade from leader ${leader.address}`);

    // Find all users following this leader
    const follows = await prisma.follow.findMany({
      where: {
        traderId: leader.address,
        active: true,
      },
      include: {
        follower: true,
        copySettings: true,
      },
    });

    // Trigger copy trades
    for (const follow of follows) {
      console.log(`Copying trade for follower ${follow.followerId}`);

      // Queue copy trade
      await copyTradingQueue.add("process-copy-trade", {
        originalTradeId: trade.id,
        followerId: follow.followerId,
        traderId: leader.address,
        marketId: trade.market,
        side: trade.side,
        amount: parseFloat(trade.size),
        price: parseFloat(trade.price),
      });
    }
  });

  // 3. Monitor specific markets
  const popularMarkets = await polymarket.rest.getMarkets({
    active: true,
    limit: 10,
    order_by: "volume",
    order_dir: "desc",
  });

  for (const market of popularMarkets) {
    await polymarket.ws.subscribeToMarketUpdates(
      market.condition_id,
      async (update) => {
        // Update market cache
        await prisma.market.update({
          where: { id: market.condition_id },
          data: {
            outcomesPrices: update.prices,
            volume: update.volume,
            updatedAt: new Date(),
          },
        });
      }
    );
  }
}

// Run the complete example if this file is executed directly
if (require.main === module) {
  completeExample();
}

export default {
  restApiExamples,
  websocketExamples,
  leaderDetectionExamples,
  completeExample,
  integrateWithCopyEngine,
};
