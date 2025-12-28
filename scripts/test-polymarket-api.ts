#!/usr/bin/env node

/**
 * Test Polymarket API connectivity and data
 * Usage: npx tsx scripts/test-polymarket-api.ts
 */

import axios from "axios";

const ENDPOINTS = [
  {
    name: "Gamma API - Markets",
    url: "https://gamma-api.polymarket.com/markets?limit=5",
  },
  { name: "CLOB API - Markets", url: "https://clob.polymarket.com/markets" },
  {
    name: "Gamma API - Events",
    url: "https://gamma-api.polymarket.com/events?limit=5",
  },
];

async function testEndpoint(name: string, url: string) {
  try {
    console.log(`\n📡 Testing: ${name}`);
    console.log(`   URL: ${url}`);

    const startTime = Date.now();
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    });
    const duration = Date.now() - startTime;

    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ⏱️  Response time: ${duration}ms`);
    console.log(
      `   📊 Data type: ${
        Array.isArray(response.data) ? "Array" : typeof response.data
      }`
    );

    if (Array.isArray(response.data)) {
      console.log(`   📈 Items returned: ${response.data.length}`);

      if (response.data.length > 0) {
        const sample = response.data[0];
        console.log(`\n   📝 Sample data structure:`);
        console.log(
          `      Keys: ${Object.keys(sample).slice(0, 10).join(", ")}`
        );

        // Show a sample market if available
        if (sample.question) {
          console.log(`\n   🎯 Sample Market:`);
          console.log(`      Question: ${sample.question.slice(0, 80)}`);
          if (sample.outcomes)
            console.log(`      Outcomes: ${sample.outcomes.join(", ")}`);
          if (sample.volume)
            console.log(
              `      Volume: $${parseFloat(sample.volume).toLocaleString()}`
            );
          if (sample.category)
            console.log(`      Category: ${sample.category}`);
        }
      }
    } else if (response.data && typeof response.data === "object") {
      console.log(
        `   📋 Object keys: ${Object.keys(response.data)
          .slice(0, 10)
          .join(", ")}`
      );
    }

    return {
      success: true,
      duration,
      count: Array.isArray(response.data) ? response.data.length : 0,
    };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    if (error.response) {
      console.log(`   📄 Status: ${error.response.status}`);
      console.log(`   📝 Status Text: ${error.response.statusText}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║   🧪 POLYMARKET API CONNECTIVITY TEST                  ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  const results = [];

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint.name, endpoint.url);
    results.push({ ...endpoint, ...result });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit
  }

  // Summary
  console.log("\n\n╔════════════════════════════════════════════════════════╗");
  console.log("║   📊 TEST SUMMARY                                      ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const successful = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`Results: ${successful}/${total} endpoints working\n`);

  results.forEach((result) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    if (result.success && result.count) {
      console.log(`   └─ ${result.count} items in ${result.duration}ms`);
    } else if (!result.success) {
      console.log(`   └─ ${result.error}`);
    }
  });

  if (successful > 0) {
    console.log("\n✅ Polymarket API is accessible!");
    console.log("\n🚀 Next step: Run the fetch script");
    console.log("   npx tsx scripts/fetch-real-markets.ts");
  } else {
    console.log("\n⚠️  All endpoints failed. Possible reasons:");
    console.log("   - Network connectivity issues");
    console.log("   - Polymarket API maintenance");
    console.log("   - Rate limiting");
    console.log("   - Firewall blocking requests");
    console.log("\n💡 The app will continue to work with seeded data.");
  }
}

main();
