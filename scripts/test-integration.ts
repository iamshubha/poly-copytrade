/**
 * Test Polymarket Integration Module
 * Run: npx tsx scripts/test-integration.ts
 */

import polymarket from "../src/lib/polymarket";

async function testRestClient() {
  console.log("\n📡 Testing REST Client...\n");

  try {
    // Test markets
    console.log("1. Fetching markets...");
    const markets = await polymarket.getMarkets({
      active: true,
      limit: 3,
    });
    console.log(`   ✅ Found ${markets.length} markets`);

    if (markets.length > 0) {
      console.log(`\n   Sample Market:`);
      console.log(`   Question: ${markets[0].question}`);
      console.log(
        `   Volume: $${parseFloat(markets[0].volume).toLocaleString()}`
      );
      console.log(`   Outcomes: ${markets[0].outcomes.join(", ")}`);
    }

    return { success: true, markets };
  } catch (error) {
    console.error("   ❌ REST Client Error:", error instanceof Error ? error.message : String(error));
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   🧪 POLYMARKET INTEGRATION TEST SUITE                 ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const results = {
    rest: { success: false },
  };

  // Test REST Client
  results.rest = await testRestClient();

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
    `\nTotal: ${passed}/${total} passed (${Math.round(
      (passed / total) * 100
    )}%)`
  );

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
  console.error("\n❌ Fatal error:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
