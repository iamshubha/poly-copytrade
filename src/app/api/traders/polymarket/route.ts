import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { PolymarketClient } from "@/lib/polymarketClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Create a singleton instance
const polymarketClient = new PolymarketClient();

/**
 * GET /api/traders/polymarket
 * Fetch all traders from Polymarket using the Data API
 * Returns real traders with their trading statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minVolume = parseInt(searchParams.get("minVolume") || "100");
    const minTrades = parseInt(searchParams.get("minTrades") || "5");
    const sortBy = searchParams.get("sortBy") || "volume"; // volume, roi, trades, winRate
    const limit = parseInt(searchParams.get("limit") || "50");

    console.log(
      `[API] Fetching Polymarket traders (min volume: $${minVolume}, min trades: ${minTrades}, sort: ${sortBy}, limit: ${limit})...`
    );

    // Detect leader wallets from Polymarket Data API
    const leaders = await polymarketClient.detectLeaderWallets(
      minVolume,
      minTrades
    );

    if (leaders.length === 0) {
      return successResponse({
        traders: [],
        total: 0,
        message: "No traders found matching the criteria",
      });
    }

    console.log(`[API] Found ${leaders.length} traders from Polymarket`);

    // Sort based on requested field
    leaders.sort((a: any, b: any) => {
      switch (sortBy) {
        case "roi":
          return (b.roi || 0) - (a.roi || 0);
        case "trades":
          return (b.trades || 0) - (a.trades || 0);
        case "winRate":
          return (b.winRate || 0) - (a.winRate || 0);
        case "volume":
        default:
          return (b.volume || 0) - (a.volume || 0);
      }
    });

    // Map to a consistent format for the frontend
    const traders = leaders.slice(0, limit).map((leader) => ({
      id: leader.address,
      address: leader.address,
      isPolymarket: true,
      stats: {
        followers: leader.followers || 0,
        totalTrades: leader.trades || 0,
        totalVolume: leader.volume || 0,
        winRate: (leader.winRate || 0) * 100,
        totalProfit: ((leader.roi || 0) * (leader.volume || 0)) / 100,
        avgProfit: leader.avgTradeSize || 0,
        roi: leader.roi || 0,
      },
    }));

    return successResponse({
      traders,
      total: traders.length,
      criteria: {
        minVolume,
        minTrades,
        sortBy,
      },
      source: "polymarket-data-api",
    });
  } catch (error: any) {
    console.error("[API] Error fetching Polymarket traders:", error);
    return errorResponse(
      error?.message || "Failed to fetch Polymarket traders",
      500
    );
  }
}
