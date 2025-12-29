import { NextRequest, NextResponse } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { PolymarketClient } from "@/lib/polymarketClient";

export const dynamic = "force-dynamic";

// Create a singleton instance
const polymarketClient = new PolymarketClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minVolume = parseInt(searchParams.get("minVolume") || "5000"); // Lowered from 10000
    const minTrades = parseInt(searchParams.get("minTrades") || "20"); // Lowered from 50

    console.log(
      `[API] Fetching Polymarket leader wallets (min volume: $${minVolume}, min trades: ${minTrades})...`
    );

    // Detect leader wallets from Polymarket
    const leaders = await polymarketClient.detectLeaderWallets(
      minVolume,
      minTrades
    );

    console.log(`[API] Found ${leaders.length} leader wallets`);

    // Sort by ROI by default
    leaders.sort((a: any, b: any) => (b.roi || 0) - (a.roi || 0));

    return successResponse({
      leaders,
      total: leaders.length,
      criteria: {
        minVolume,
        minTrades,
      },
    });
  } catch (error: any) {
    console.error("[API] Error fetching Polymarket leaders:", error);
    return errorResponse(
      error?.message || "Failed to fetch Polymarket leaders"
    );
  }
}
