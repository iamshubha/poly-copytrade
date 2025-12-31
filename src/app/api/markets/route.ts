import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api";
import { withRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { sanitizeInput } from "@/lib/security";

// Extract and aggregate tags from markets
function extractAndAggregateTags(markets: any[]): { tag: string; count: number }[] {
  const tagCounts = new Map<string, number>();
  
  markets.forEach((market: any) => {
    // Extract from events (Gamma API)
    if (market.events && Array.isArray(market.events)) {
      market.events.forEach((event: any) => {
        if (event.title) {
          const tag = event.title.trim();
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    }
    // Extract from tags array (CLOB API)
    if (market.tags && Array.isArray(market.tags)) {
      market.tags.forEach((tag: string) => {
        const cleanTag = tag.trim();
        tagCounts.set(cleanTag, (tagCounts.get(cleanTag) || 0) + 1);
      });
    }
  });
  
  // Convert to array and sort by count
  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Top 50 most popular tags
}

async function getHandler(req: NextRequest) {
  const log = logger.child({ endpoint: '/api/markets', method: 'GET' });
  
  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Cap at 100
    const offset = parseInt(searchParams.get("offset") || "0");
    const search = sanitizeInput(searchParams.get("search") || "");
    const category = sanitizeInput(searchParams.get("category") || "");
    const sortBy = searchParams.get("sortBy") || "volume";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const hideCategories = searchParams.get("hideCategories")?.split(',') || [];
    const selectedTag = sanitizeInput(searchParams.get("tag") || "");

    log.info('Fetching markets from Polymarket API', {
      limit,
      offset,
      search,
      category,
      sortBy,
      sortOrder,
      hideCategories,
      selectedTag,
    });

    // Fetch ALL markets first (Polymarket Gamma API returns up to 500 per request)
    // We'll handle pagination client-side since the API doesn't support proper offset
    const result = await log.measure('fetch-polymarket-markets', async () => {
      const response = await fetch('https://gamma-api.polymarket.com/markets?limit=500&closed=false', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store', // Disable caching to get fresh data
      });
      
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }
      
      const data = await response.json();
      // Gamma API returns array directly
      return { data };
    });

    let markets = result.data || [];
    log.info('Fetched markets from Polymarket Gamma API', { count: markets.length });

    // Filter for valid markets (Gamma API uses different structure)
    const showAll = searchParams.get("showAll") === "true";
    if (!showAll) {
      markets = markets.filter((market: any) => 
        market.question && (
          (market.outcomes && market.outcomes.length > 0) || // Gamma API
          (market.tokens && market.tokens.length > 0) // CLOB API
        )
      );
      log.info('After filtering for valid markets', { count: markets.length });
    }

    // Client-side search filtering
    if (search && markets.length > 0) {
      const searchLower = search.toLowerCase();
      markets = markets.filter(
        (market: any) =>
          market.question?.toLowerCase().includes(searchLower) ||
          market.description?.toLowerCase().includes(searchLower)
      );
      log.info('After search filter', { count: markets.length, search });
    }

    // Category filtering
    if (category && markets.length > 0) {
      markets = markets.filter(
        (market: any) =>
          market.category?.toLowerCase() === category.toLowerCase() ||
          market.tags?.some((tag: string) => tag.toLowerCase() === category.toLowerCase())
      );
      log.info('After category filter', { count: markets.length, category });
    }

    // Hide categories filter (for category navigation)
    if (hideCategories.length > 0 && markets.length > 0) {
      markets = markets.filter((market: any) => {
        const marketText = `${market.question} ${market.description}`.toLowerCase();
        const marketTags = (market.tags || []).map((t: string) => t.toLowerCase()).join(' ');
        const fullText = `${marketText} ${marketTags}`;
        
        // Category keyword mappings - using very specific keywords only
        const categoryChecks = {
          sports: () => {
            return /\b(nfl|nba|mlb|nhl|cfb|ncaa|super bowl|world series|stanley cup|football|basketball|baseball|soccer|tennis|boxing|ufc|mma|olympics|champion\s|playoff|game\s\d+)\b/.test(fullText);
          },
          crypto: () => {
            return /\b(bitcoin|ethereum|btc|eth|crypto|blockchain|defi|nft|solana|cardano|dogecoin)\b/.test(fullText);
          },
          earnings: () => {
            return /\b(earnings|quarterly|q[1-4]\s|revenue|profit|eps)\b/.test(fullText);
          },
          politics: () => {
            return /\b(trump|biden|congress|senate|governor|democrat|republican|dnc|rnc|legislation|capitol)\b/.test(fullText);
          },
          finance: () => {
            return /\b(stock|s&p|nasdaq|dow|treasury|bond|equity|dividend|etf)\b/.test(fullText);
          },
          geopolitics: () => {
            return /\b(ukraine|russia|china\s|taiwan|iran|israel|gaza|nato|ceasefire|invasion|sanctions)\b/.test(fullText);
          },
          tech: () => {
            return /\b(apple|google|meta|microsoft|amazon|openai|chatgpt|gpt-|claude|ai model|tesla|spacex)\b/.test(fullText);
          },
          culture: () => {
            return /\b(movie|film|album|oscar|grammy|emmy|actor|actress|musician|celebrity|award show)\b/.test(fullText);
          },
          world: () => {
            // Very broad, skip for now
            return false;
          },
          economy: () => {
            return /\b(gdp|inflation rate|unemployment|federal reserve|recession|interest rate|jobs report)\b/.test(fullText);
          },
          elections: () => {
            return /\b(election|ballot|candidate|primary|midterm|polling|electoral)\b/.test(fullText);
          }
        };
        
        // Check if market matches any hidden category
        for (const hiddenCat of hideCategories) {
          const checkFn = categoryChecks[hiddenCat as keyof typeof categoryChecks];
          if (checkFn && checkFn()) {
            return false; // Hide this market
          }
        }
        
        return true;
      });
      
      log.info('After hide categories filter', { 
        count: markets.length, 
        hideCategories 
      });
    }

    // Tag filtering (for clicking specific topic tags)
    if (selectedTag && selectedTag !== 'all' && markets.length > 0) {
      markets = markets.filter((market: any) => {
        // Check events
        if (market.events && Array.isArray(market.events)) {
          if (market.events.some((event: any) => 
            event.title?.toLowerCase() === selectedTag.toLowerCase()
          )) {
            return true;
          }
        }
        // Check tags
        if (market.tags && Array.isArray(market.tags)) {
          if (market.tags.some((tag: string) => 
            tag.toLowerCase() === selectedTag.toLowerCase()
          )) {
            return true;
          }
        }
        return false;
      });
      
      log.info('After tag filter', { count: markets.length, selectedTag });
    }

    // Sort markets (handle both Gamma and CLOB API field names)
    markets.sort((a: any, b: any) => {
      let aValue = 0, bValue = 0;

      switch (sortBy) {
        case "volume":
          aValue = parseFloat(a.volume || a.volumeNum) || 0;
          bValue = parseFloat(b.volume || b.volumeNum) || 0;
          break;
        case "liquidity":
          aValue = parseFloat(a.liquidity || a.liquidityNum) || 0;
          bValue = parseFloat(b.liquidity || b.liquidityNum) || 0;
          break;
        case "endDate":
        case "end_date":
          aValue = a.end_date_iso || a.endDateIso ? new Date(a.end_date_iso || a.endDateIso).getTime() : 0;
          bValue = b.end_date_iso || b.endDateIso ? new Date(b.end_date_iso || b.endDateIso).getTime() : 0;
          break;
        case "created_at":
          aValue = a.created_at || a.createdAt ? new Date(a.created_at || a.createdAt).getTime() : 0;
          bValue = b.created_at || b.createdAt ? new Date(b.created_at || b.createdAt).getTime() : 0;
          break;
        default:
          aValue = parseFloat(a.volume || a.volumeNum) || 0;
          bValue = parseFloat(b.volume || b.volumeNum) || 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    // Extract available tags from ALL markets (before pagination)
    const availableTags = extractAndAggregateTags(markets);

    // Store total before pagination
    const totalMarkets = markets.length;

    // Apply pagination
    const paginatedMarkets = markets.slice(offset, offset + limit);

    // Transform markets to match frontend expectations
    // Support both Gamma API and CLOB API field structures
    const transformedMarkets = paginatedMarkets.map((market: any) => {
      // Gamma API uses different field names and JSON strings for some fields
      const isGammaAPI = market.conditionId !== undefined;
      
      let outcomes = ["Yes", "No"];
      let outcomesPrices = [0.5, 0.5];
      
      if (isGammaAPI) {
        // Parse JSON strings from Gamma API
        try {
          outcomes = market.outcomes ? JSON.parse(market.outcomes) : ["Yes", "No"];
          outcomesPrices = market.outcomePrices 
            ? JSON.parse(market.outcomePrices).map((p: string) => parseFloat(p))
            : [0.5, 0.5];
        } catch (e) {
          // Fallback if parsing fails
          outcomes = ["Yes", "No"];
          outcomesPrices = [0.5, 0.5];
        }
      } else {
        // CLOB API structure
        outcomes = market.tokens?.map((t: any) => t.outcome) || ["Yes", "No"];
        outcomesPrices = market.tokens?.map((t: any) => parseFloat(t.price) || 0) || [0.5, 0.5];
      }
      
      return {
        id: market.conditionId || market.condition_id,
        conditionId: market.conditionId || market.condition_id,
        title: market.question,
        description: market.description || "",
        imageUrl: market.image || market.icon || undefined,
        volume: parseFloat(market.volume || market.volumeNum) || 0,
        liquidity: parseFloat(market.liquidity || market.liquidityNum) || 0,
        outcomes,
        outcomesPrices,
        endDate: market.endDateIso || market.end_date_iso || null,
        category: market.tags?.[0] || market.events?.[0]?.title || "Other",
        tags: market.tags || market.events?.map((e: any) => e.title) || [],
        active: market.active,
        marketSlug: market.slug || market.market_slug || undefined,
      };
    });

    log.info('Markets transformed successfully', { 
      total: totalMarkets,
      returned: transformedMarkets.length,
      offset,
      limit,
      availableTagsCount: availableTags.length
    });
    
    // Return markets with pagination metadata and available tags
    return successResponse({
      data: transformedMarkets,
      total: totalMarkets,
      offset,
      limit,
      hasMore: offset + limit < totalMarkets,
      availableTags, // Include available tags for frontend
    });
  } catch (error) {
    log.error('Failed to fetch markets', { error });
    return errorResponse(error);
  }
}

export const GET = withRateLimit(getHandler, 'read');
