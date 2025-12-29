import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
// Import the REST client from the folder index explicitly to avoid resolving the root polymarket.ts
import { polymarketClient } from "@/lib/polymarket/index";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const limit = parseInt(searchParams.get("limit") || "50");
    const active = searchParams.get("active") !== "false";
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const sortBy = searchParams.get("sortBy") || "volume";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const offset = parseInt(searchParams.get("offset") || "0");

    console.log("[Markets API] Fetching real-time data from Polymarket...");
    console.log("[Markets API] Filters:", {
      limit,
      active,
      search,
      category,
      sortBy,
      sortOrder,
      offset,
    });

    // Fetch markets from Polymarket REST API
    // Note: Passing closed: false to get only active, open markets
    let markets: any = await polymarketClient.getMarkets({
      limit: 1000, // Fetch many to allow for filtering
      closed: false, // Only get non-closed markets
      offset,
    });

    // Normalize to array in case client returns an object
    const normalizeArray = (value: any) => {
      if (Array.isArray(value)) return value;
      if (value && Array.isArray(value.data)) return value.data;
      if (value && Array.isArray(value.markets)) return value.markets;
      return [];
    };
    markets = normalizeArray(markets);

    console.log(
      `[Markets API] Fetched ${
        Array.isArray(markets) ? markets.length : 0
      } markets from API`
    );

    // Filter to show only markets that are NOT closed (active trading markets)
    markets = Array.isArray(markets)
      ? markets.filter((market: any) => !market.closed)
      : [];
    console.log(
      `[Markets API] After filtering out closed markets: ${markets.length} markets`
    );

    // Normalize field names - API returns camelCase, normalize to have both formats
    // Also parse volume/liquidity from strings to numbers
    markets = markets.map((m: any) => {
      // Use volumeNum/liquidityNum if available (numeric), otherwise parse volume/liquidity strings
      const volume =
        typeof m.volumeNum === "number"
          ? m.volumeNum
          : m.volume
          ? parseFloat(m.volume)
          : 0;
      const liquidity =
        typeof m.liquidityNum === "number"
          ? m.liquidityNum
          : m.liquidity
          ? parseFloat(m.liquidity)
          : 0;

      // Normalize both camelCase and snake_case for compatibility
      return {
        ...m,
        // Add snake_case aliases for camelCase fields
        condition_id: m.conditionId || m.condition_id,
        end_date_iso: m.endDateIso || m.end_date_iso,
        // Override with parsed numeric values
        volume,
        liquidity,
        volumeNum: volume,
        liquidityNum: liquidity,
      };
    });

    console.log(
      "[Markets API] Sample market data:",
      markets.length > 0
        ? {
            condition_id: markets[0].condition_id,
            volume: markets[0].volume,
            liquidity: markets[0].liquidity,
          }
        : "no markets"
    );

    // Client-side search filtering
    if (search && markets.length > 0) {
      const searchLower = search.toLowerCase();
      markets = markets.filter(
        (market: { question?: string; description?: string }) =>
          market.question?.toLowerCase().includes(searchLower) ||
          market.description?.toLowerCase().includes(searchLower) ||
          false
      );
      console.log(
        `[Markets API] After search filter: ${markets.length} markets`
      );
    }

    // Client-side category filtering (Polymarket API doesn't support this well)
    if (category && category !== "all" && markets.length > 0) {
      const cat = category.toLowerCase();
      markets = markets.filter(
        (market: { tags?: string[]; question?: string }) => {
          const tags = (market.tags || []).map((t: string) => t.toLowerCase());
          const title = (market.question || "").toLowerCase();
          return (
            tags.some((t: string) => t.includes(cat)) || title.includes(cat)
          );
        }
      );
      console.log(
        `[Markets API] After category filter: ${markets.length} markets`
      );
    }

    // Client-side sorting
    markets.sort((a: any, b: any) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "volume":
          aValue = parseFloat(a.volume || "0");
          bValue = parseFloat(b.volume || "0");
          break;
        case "liquidity":
          aValue = parseFloat(a.liquidity || "0");
          bValue = parseFloat(b.liquidity || "0");
          break;
        case "end_date":
          aValue = new Date(a.end_date_iso || 0).getTime();
          bValue = new Date(b.end_date_iso || 0).getTime();
          break;
        default:
          aValue = parseFloat(a.volume || "0");
          bValue = parseFloat(b.volume || "0");
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Limit results after filtering and sorting
    markets = markets.slice(0, limit);

    // Transform markets to match frontend expectations
    const transformedMarkets = markets.map((market: any) => {
      // Use the numeric ID for the market detail page URL, keep conditionId as separate field
      const id = market.id || market.condition_id || market.conditionId;

      // Parse outcomePrices - API returns it as a JSON string like '["0.5", "0.5"]'
      let outcomePrices = [0.5, 0.5];
      if (market.outcomePrices) {
        try {
          const prices =
            typeof market.outcomePrices === "string"
              ? JSON.parse(market.outcomePrices)
              : market.outcomePrices;
          if (Array.isArray(prices) && prices.length > 0) {
            outcomePrices = prices.map((p: any) =>
              typeof p === "number" ? p : parseFloat(p || "0.5")
            );
          }
        } catch (e) {
          console.warn(
            "[Markets API] Failed to parse outcomePrices:",
            market.outcomePrices
          );
        }
      }

      // Parse outcomes - API also returns it as a JSON string
      let outcomes = ["Yes", "No"];
      if (market.outcomes) {
        try {
          outcomes =
            typeof market.outcomes === "string"
              ? JSON.parse(market.outcomes)
              : market.outcomes;
        } catch (e) {
          outcomes = ["Yes", "No"];
        }
      }

      return {
        id,
        conditionId: market.conditionId || market.condition_id,
        title: market.question,
        description: market.description || "",
        imageUrl: market.image || undefined,
        volume:
          typeof market.volume === "number"
            ? market.volume
            : parseFloat(market.volume || "0"),
        liquidity:
          typeof market.liquidity === "number"
            ? market.liquidity
            : parseFloat(market.liquidity || "0"),
        outcomes,
        outcomesPrices: outcomePrices,
        endDate: market.end_date_iso || market.endDateIso,
        category: market.tags?.[0] || "Other", // Use first tag as category
        tags: market.tags || [],
        active: market.active,
        marketSlug: market.slug || market.market_slug,
      };
    });

    console.log(`[Markets API] Returning ${transformedMarkets.length} markets`);
    return successResponse(transformedMarkets);
  } catch (error) {
    console.error("[Markets API] Error:", error);
    return errorResponse(error);
  }
}
