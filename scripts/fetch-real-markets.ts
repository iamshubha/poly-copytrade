#!/usr/bin/env node

/**
 * Fetch real market data from Polymarket API
 * Usage: npx tsx scripts/fetch-real-markets.ts
 */

import prisma from "../src/lib/prisma";
import axios from "axios";

const POLYMARKET_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

interface PolymarketMarket {
  condition_id: string;
  question: string;
  description?: string;
  market_slug: string;
  end_date_iso: string;
  game_start_time?: string;
  volume?: string;
  liquidity?: string;
  outcomes: string[];
  outcomePrices?: string[];
  category?: string;
  image?: string;
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  tags?: string[];
}

async function fetchPolymarketMarkets(limit = 20): Promise<PolymarketMarket[]> {
  try {
    console.log("📡 Fetching markets from Polymarket API...");

    // Try the main markets endpoint
    const response = await axios.get(`${POLYMARKET_API}/markets`, {
      params: {
        limit,
        active: true,
        closed: false,
        archived: false,
      },
      timeout: 10000,
    });

    console.log(`✅ Fetched ${response.data.length} markets`);
    return response.data;
  } catch (error) {
    console.log("⚠️  Gamma API failed, trying alternative endpoint...");

    // Try alternative endpoint
    try {
      const response = await axios.get(`${CLOB_API}/markets`, {
        timeout: 10000,
      });

      console.log(
        `✅ Fetched ${response.data.length || 0} markets from CLOB API`
      );
      return response.data;
    } catch (error2) {
      console.error("❌ Failed to fetch from both APIs");
      console.error("Error:", error2.message);
      return [];
    }
  }
}

async function saveMarketsToDatabase(markets: PolymarketMarket[]) {
  console.log("\n💾 Saving markets to database...");

  let saved = 0;
  let skipped = 0;

  for (const market of markets) {
    try {
      // Parse volume and liquidity
      const volume = market.volume ? parseFloat(market.volume) : 0;
      const liquidity = market.liquidity ? parseFloat(market.liquidity) : 0;

      // Parse outcome prices
      let outcomesPrices: number[] = [];
      if (market.outcomePrices && Array.isArray(market.outcomePrices)) {
        outcomesPrices = market.outcomePrices.map((p) => parseFloat(p));
      } else if (market.outcomes) {
        // Default to 0.5 for each outcome if no prices
        outcomesPrices = market.outcomes.map(() => 0.5);
      }

      // Determine category
      const category =
        market.category ||
        (market.tags && market.tags.length > 0 ? market.tags[0] : "Other");

      // Parse end date
      let endDate: Date | null = null;
      if (market.end_date_iso) {
        endDate = new Date(market.end_date_iso);
      } else if (market.game_start_time) {
        endDate = new Date(market.game_start_time);
      }

      const marketData = {
        id: market.condition_id || market.market_slug,
        title: market.question.slice(0, 255), // Limit length
        description: market.description || market.question,
        category,
        endDate,
        volume,
        liquidity,
        outcomes: market.outcomes || ["Yes", "No"],
        outcomesPrices,
        active: market.active !== false && !market.closed && !market.archived,
        resolved: market.closed || false,
        imageUrl: market.image || null,
        tags: market.tags || [],
      };

      await prisma.market.upsert({
        where: { id: marketData.id },
        update: marketData,
        create: marketData,
      });

      saved++;
      console.log(`  ✅ ${saved}. ${marketData.title.slice(0, 60)}...`);
    } catch (error) {
      skipped++;
      console.log(`  ⚠️  Skipped market: ${error.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Saved: ${saved}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${markets.length}`);
}

async function displaySampleMarkets() {
  console.log("\n📈 Sample of saved markets:");

  const markets = await prisma.market.findMany({
    take: 5,
    orderBy: { volume: "desc" },
    select: {
      id: true,
      title: true,
      category: true,
      volume: true,
      active: true,
    },
  });

  markets.forEach((market, index) => {
    console.log(`\n${index + 1}. ${market.title}`);
    console.log(`   ID: ${market.id}`);
    console.log(`   Category: ${market.category}`);
    console.log(`   Volume: $${market.volume.toLocaleString()}`);
    console.log(`   Active: ${market.active ? "✅" : "❌"}`);
  });
}

async function main() {
  console.log("🚀 Fetching Real Polymarket Data\n");
  console.log("=".repeat(50));

  try {
    // Fetch markets from Polymarket
    const markets = await fetchPolymarketMarkets(20);

    if (markets.length === 0) {
      console.log("\n⚠️  No markets fetched. Using mock data as fallback...");
      console.log("This might happen if:");
      console.log("  - Polymarket API is down");
      console.log("  - Rate limiting is active");
      console.log("  - Network connectivity issues");
      console.log("\nThe seeded data is still available for testing.");
      return;
    }

    // Save to database
    await saveMarketsToDatabase(markets);

    // Display samples
    await displaySampleMarkets();

    console.log("\n✅ Real market data successfully loaded!");
    console.log("\n🌐 Test the API:");
    console.log("   curl http://localhost:3000/api/markets");
    console.log("\n📊 View in Prisma Studio:");
    console.log("   npm run db:studio");
  } catch (error) {
    console.error("\n❌ Error fetching markets:");
    console.error(error.message);
    console.error(
      "\n💡 The application will continue working with seeded data."
    );
  } finally {
    await prisma.$disconnect();
  }
}

main();
