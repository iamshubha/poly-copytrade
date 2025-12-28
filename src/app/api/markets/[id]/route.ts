import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { polymarketClient } from "@/lib/polymarket";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[Market Detail API] Fetching market ${params.id} from Polymarket...`);
    
    // Fetch market details directly from Polymarket API (returns as any to preserve camelCase)
    const apiMarket: any = await polymarketClient.getMarket(params.id);

    // Parse outcomePrices - API returns it as a JSON string like '["0.5", "0.5"]'
    let outcomePrices = [0.5, 0.5];
    if (apiMarket.outcomePrices) {
      try {
        const prices = typeof apiMarket.outcomePrices === 'string' 
          ? JSON.parse(apiMarket.outcomePrices) 
          : apiMarket.outcomePrices;
        if (Array.isArray(prices) && prices.length > 0) {
          outcomePrices = prices.map((p: any) => typeof p === 'number' ? p : parseFloat(p || "0.5"));
        }
      } catch (e) {
        console.warn('[Market Detail API] Failed to parse outcomePrices');
      }
    }
    
    // Parse outcomes - API also returns it as a JSON string
    let outcomes = ["Yes", "No"];
    if (apiMarket.outcomes) {
      try {
        outcomes = typeof apiMarket.outcomes === 'string' ? JSON.parse(apiMarket.outcomes) : apiMarket.outcomes;
      } catch (e) {
        outcomes = ["Yes", "No"];
      }
    }

    // Transform to match frontend expectations
    const market = {
      id: apiMarket.id,
      conditionId: apiMarket.condition_id,
      title: apiMarket.question,
      description: apiMarket.description || "",
      imageUrl: apiMarket.image,
      outcomes,
      outcomesPrices: outcomePrices,
      active: apiMarket.active,
      closed: apiMarket.closed,
      volume: typeof apiMarket.volume === 'number' ? apiMarket.volume : parseFloat(apiMarket.volume || "0"),
      liquidity: typeof apiMarket.liquidity === 'number' ? apiMarket.liquidity : parseFloat(apiMarket.liquidity || "0"),
      endDate: apiMarket.endDateIso || apiMarket.end_date_iso || apiMarket.endDate,
      tags: apiMarket.tags || [],
      category: apiMarket.tags?.[0] || "Other",
      market_slug: apiMarket.slug || apiMarket.market_slug,
    };

    console.log(`[Market Detail API] Successfully fetched market: ${market.title}`);
    
    return successResponse(market);
  } catch (error) {
    console.error(`[Market Detail API] Error fetching market ${params.id}:`, error);
    return errorResponse(error);
  }
}
