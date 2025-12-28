#!/usr/bin/env node
/**
 * Test Polymarket REST client to debug volume/liquidity data
 */

import { polymarketClient } from "../src/lib/polymarket/index";

async function testRestClient() {
  console.log("🧪 Testing Polymarket REST Client...\n");

  try {
    // Test getMarkets
    console.log("1️⃣ Fetching markets...");
    const markets = await polymarketClient.getMarkets({
      limit: 5,
      active: true,
    });

    console.log(`\n✅ Got ${Array.isArray(markets) ? markets.length : 'non-array'} markets`);
    console.log(`Type: ${typeof markets}`);
    console.log(`Is Array: ${Array.isArray(markets)}`);

    if (Array.isArray(markets) && markets.length > 0) {
      console.log("\n📊 First market sample:");
      const first = markets[0];
      console.log({
        condition_id: first.condition_id,
        question: first.question?.substring(0, 60) + "...",
        volume: first.volume,
        liquidity: first.liquidity,
        active: first.active,
        closed: first.closed,
      });

      // Test getBatchMarketStats
      console.log("\n2️⃣ Fetching batch stats for first 3 markets...");
      const marketIds = markets.slice(0, 3).map(m => m.condition_id).filter(Boolean);
      console.log(`Market IDs: ${marketIds.join(", ")}`);

      if (marketIds.length > 0) {
        const stats = await polymarketClient.getBatchMarketStats(marketIds);
        console.log(`\n✅ Got ${Array.isArray(stats) ? stats.length : 'non-array'} stats`);
        
        if (Array.isArray(stats) && stats.length > 0) {
          console.log("\n📈 First stat sample:");
          const firstStat = stats[0];
          console.log({
            market_id: firstStat.market_id,
            volume_24h: firstStat.volume_24h,
            volume_total: firstStat.volume_total,
            liquidity: firstStat.liquidity,
            trades_count_24h: firstStat.trades_count_24h,
          });
        } else {
          console.log("⚠️  Stats is empty or not an array");
          console.log("Stats value:", stats);
        }
      }
    } else {
      console.log("⚠️  Markets is empty or not an array");
      console.log("Markets value:", markets);
    }

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

testRestClient().then(() => {
  console.log("\n✅ Test complete");
  process.exit(0);
}).catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
