import { polymarketClient } from "../src/lib/polymarket";

async function test() {
  try {
    console.log("Fetching markets (closed=false)...");
    const markets = await polymarketClient.getMarkets({
      limit: 10,
      active: true,
      closed: false,
    });
    console.log("Markets received:", markets.length);
    if (markets.length > 0) {
      console.log("\nFirst market:");
      console.log("  ID:", markets[0].id);
      console.log("  Question:", markets[0].question);
      console.log("  Volume:", markets[0].volume);
      console.log("  Active:", markets[0].active);
      console.log("  Closed:", markets[0].closed);
      console.log("  Outcomes:", markets[0].outcomes);
      console.log("  Prices:", markets[0].outcomePrices);
    } else {
      console.log("No markets returned!");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
