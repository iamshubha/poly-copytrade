/**
 * Test script for Polymarket Traders Data API integration
 * Tests the new getAllTrades and detectLeaderWallets methods
 */

import { PolymarketClient } from "../src/lib/polymarketClient";

async function testPolymarketTraders() {
  console.log("=".repeat(60));
  console.log("Testing Polymarket Traders Data API Integration");
  console.log("=".repeat(60));

  const client = new PolymarketClient();

  try {
    // Test 1: Fetch all trades from Data API
    console.log("\n[Test 1] Fetching trades from Polymarket Data API...");
    const trades = await client.getAllTrades({ limit: 100 });
    console.log(`✅ Fetched ${trades.length} trades`);

    if (trades.length > 0) {
      console.log("\nSample trade:");
      console.log({
        trader: trades[0].proxyWallet?.substring(0, 10) + "...",
        side: trades[0].side,
        size: trades[0].size,
        price: trades[0].price,
        market: trades[0].conditionId?.substring(0, 20) + "...",
      });
    }

    // Test 2: Detect leader wallets
    console.log("\n[Test 2] Detecting leader wallets...");
    console.log("Criteria: Min Volume = $100, Min Trades = 5");

    const leaders = await client.detectLeaderWallets(100, 5);
    console.log(`\n✅ Found ${leaders.length} qualified leader wallets`);

    if (leaders.length > 0) {
      console.log("\n🏆 Top 10 Traders by Volume:");
      console.log("-".repeat(100));
      console.log(
        "Rank | Address                                      | Volume      | Trades | ROI      | Win Rate"
      );
      console.log("-".repeat(100));

      leaders.slice(0, 10).forEach((leader, index) => {
        console.log(
          `${String(index + 1).padStart(4)} | ${leader.address.padEnd(
            44
          )} | $${String(leader.volume.toLocaleString()).padStart(
            10
          )} | ${String(leader.trades).padStart(6)} | ${String(
            leader.roi.toFixed(2) + "%"
          ).padStart(8)} | ${(leader.winRate * 100).toFixed(1)}%`
        );
      });
      console.log("-".repeat(100));

      // Statistics
      const totalVolume = leaders.reduce((sum, l) => sum + l.volume, 0);
      const totalTrades = leaders.reduce((sum, l) => sum + l.trades, 0);
      const avgROI =
        leaders.reduce((sum, l) => sum + l.roi, 0) / leaders.length;
      const avgWinRate =
        leaders.reduce((sum, l) => sum + l.winRate, 0) / leaders.length;

      console.log("\n📊 Statistics:");
      console.log(`   Total Traders: ${leaders.length}`);
      console.log(`   Total Volume: $${totalVolume.toLocaleString()}`);
      console.log(`   Total Trades: ${totalTrades.toLocaleString()}`);
      console.log(`   Average ROI: ${avgROI.toFixed(2)}%`);
      console.log(`   Average Win Rate: ${(avgWinRate * 100).toFixed(1)}%`);

      // Filter by performance
      const topPerformers = leaders.filter((l) => l.roi > 20);
      const highVolume = leaders.filter((l) => l.volume > 10000);
      const activeTrad = leaders.filter((l) => l.trades > 50);

      console.log("\n🎯 Performance Segments:");
      console.log(`   High ROI (>20%): ${topPerformers.length} traders`);
      console.log(`   High Volume (>$10k): ${highVolume.length} traders`);
      console.log(`   Very Active (>50 trades): ${activeTrad.length} traders`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testPolymarketTraders()
  .then(() => {
    console.log("\n✅ Test suite completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });
