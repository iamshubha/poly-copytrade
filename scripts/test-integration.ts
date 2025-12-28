/**
 * Test Polymarket Integration Module
 * Run: npx tsx scripts/test-integration.ts
 */

import polymarket from "../src/lib/polymarket";

async function testRestClient() {
  console.log("\n📡 Testing REST Client...\n");

  try {
    // Test health check
    console.log("1. Health check...");
    const healthy = await polymarket.rest.healthCheck();
    console.log(
      `   ${healthy ? "✅" : "❌"} Health: ${healthy ? "OK" : "Failed"}`
    );

    // Test markets
    console.log("\n2. Fetching markets...");
    const markets = await polymarket.rest.getMarkets({
      active: true,
      limit: 3,
    });
    console.log(`   ✅ Found ${markets.length} markets`);

    if (markets.length > 0) {
      console.log(`\n   Sample Market:`);
      console.log(`   Question: ${markets[0].question}`);
      console.log(`   Category: ${markets[0].category || "N/A"}`);
      console.log(
        `   Volume: $${parseFloat(markets[0].volume).toLocaleString()}`
      );
      console.log(`   Outcomes: ${markets[0].outcomes.join(", ")}`);
    }

    return { success: true, markets };
  } catch (error) {
    console.error("   ❌ REST Client Error:", error.message);
    return { success: false, error };
  }
}

async function testWebSocketClient() {
  console.log("\n🔌 Testing WebSocket Client...\n");

  try {
    console.log("1. Connecting to WebSocket...");
    await polymarket.ws.connect();
    console.log(`   ✅ Connected - State: ${polymarket.ws.getState()}`);

    console.log("\n2. Setting up event handlers...");

    let tradeCount = 0;
    polymarket.ws.onError((error) => {
      console.log(`   ⚠️  Error: ${error.message}`);
    });

    polymarket.ws.onConnect(() => {
      console.log("   ✅ Connected event fired");
    });

    polymarket.ws.onDisconnect(() => {
      console.log("   ⚠️  Disconnected event fired");
    });

    console.log("   ✅ Event handlers registered");

    // Get a market to subscribe to
    const markets = await polymarket.rest.getMarkets({
      active: true,
      limit: 1,
    });

    if (markets.length > 0) {
      console.log(
        `\n3. Subscribing to market: ${markets[0].question.slice(0, 50)}...`
      );

      await polymarket.ws.subscribeToMarketTrades(
        markets[0].condition_id,
        (trade) => {
          tradeCount++;
          console.log(
            `   📊 Trade #${tradeCount}: ${trade.side} ${trade.size} @ ${trade.price}`
          );
        }
      );

      console.log("   ✅ Subscribed successfully");
      console.log(
        `   📋 Active subscriptions: ${polymarket.ws
          .getSubscriptions()
          .join(", ")}`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("   ❌ WebSocket Error:", error.message);
    return { success: false, error };
  }
}

async function testLeaderDetector() {
  console.log("\n👥 Testing Leader Detector...\n");

  try {
    console.log("1. Discovering leader wallets...");
    const leaders = await polymarket.leader.discoverLeaderWallets();
    console.log(`   ✅ Found ${leaders.length} leader wallets`);

    if (leaders.length > 0) {
      console.log("\n   Top 3 Leaders:");
      leaders.slice(0, 3).forEach((leader, i) => {
        console.log(`   ${i + 1}. ${leader.address.slice(0, 10)}...`);
        console.log(
          `      Volume: $${leader.stats.total_volume.toLocaleString()}`
        );
        console.log(`      Trades: ${leader.stats.total_trades}`);
        console.log(
          `      Win Rate: ${(leader.stats.win_rate * 100).toFixed(1)}%`
        );
      });

      // Check specific wallet
      console.log(
        `\n2. Checking if wallet is leader: ${leaders[0].address.slice(
          0,
          15
        )}...`
      );
      const isLeader = await polymarket.leader.isLeaderWallet(
        leaders[0].address
      );
      console.log(`   ${isLeader ? "✅" : "❌"} Is Leader: ${isLeader}`);
    }

    // Get status
    console.log("\n3. Detector status:");
    const status = polymarket.leader.getStatus();
    console.log(`   Is Monitoring: ${status.isMonitoring}`);
    console.log(`   Leaders Cached: ${status.leaderCount}`);
    console.log(`   Wallets Monitored: ${status.monitoredCount}`);
    console.log(`   WS Connected: ${status.wsConnected}`);

    return { success: true, leaders };
  } catch (error) {
    console.error("   ❌ Leader Detector Error:", error.message);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   🧪 POLYMARKET INTEGRATION TEST SUITE                 ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const results = {
    rest: { success: false },
    websocket: { success: false },
    leader: { success: false },
  };

  // Test REST Client
  results.rest = await testRestClient();
  await new Promise((r) => setTimeout(r, 1000));

  // Test WebSocket Client
  results.websocket = await testWebSocketClient();
  await new Promise((r) => setTimeout(r, 1000));

  // Test Leader Detector
  results.leader = await testLeaderDetector();

  // Summary
  console.log("\n\n╔════════════════════════════════════════════════════════╗");
  console.log("║   📊 TEST SUMMARY                                      ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter((r) => r.success).length;

  console.log(
    `REST Client:       ${results.rest.success ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `WebSocket Client:  ${results.websocket.success ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `Leader Detector:   ${results.leader.success ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(
    `\nTotal: ${passed}/${total} passed (${Math.round(
      (passed / total) * 100
    )}%)`
  );

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  polymarket.ws.disconnect();
  polymarket.leader.stopMonitoring();

  if (passed === total) {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Check logs above.");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
