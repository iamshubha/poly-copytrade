/**
 * Polymarket SDK Client
 * 
 * Official @polymarket/clob-client integration for market data fetching.
 * Provides type-safe interfaces and proper pagination support.
 * 
 * Features:
 * - Market data fetching with cursor-based pagination
 * - Order book and pricing data
 * - Public API methods (no authentication required)
 * - Type-safe interfaces from official SDK
 */

import { ClobClient, type Chain } from '@polymarket/clob-client';
import type { 
  OrderBookSummary,
  MarketPrice,
  PaginationPayload,
  BookParams,
  PriceHistoryFilterParams
} from '@polymarket/clob-client';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PolymarketSDKConfig {
  host?: string;
  chainId?: Chain;
  timeout?: number;
}

const DEFAULT_CONFIG: Required<Omit<PolymarketSDKConfig, 'chainId'>> & { chainId: number } = {
  host: process.env.POLYMARKET_API_URL || 'https://clob.polymarket.com',
  chainId: parseInt(process.env.CHAIN_ID || '137'), // 137 = Polygon Mainnet
  timeout: 10000,
};

// Pagination constants from SDK
const INITIAL_CURSOR = 'MA==';
const END_CURSOR = 'LTE=';

// ============================================================================
// NORMALIZED TYPES (for compatibility with existing codebase)
// ============================================================================

export interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  outcomesPrices: number[];
  volume: number;
  liquidity: number;
  category?: string;
  endDate?: string;
  active: boolean;
  resolved: boolean;
  winningOutcome?: number;
  conditionId?: string;
  tokens?: Array<{
    token_id: string;
    outcome: string;
    price?: number;
  }>;
}

export interface PriceData {
  tokenId: string;
  price: number;
  timestamp: Date;
}

// ============================================================================
// POLYMARKET SDK CLIENT
// ============================================================================

export class PolymarketSDKClient {
  private client: ClobClient;
  private config: Required<Omit<PolymarketSDKConfig, 'chainId'>> & { chainId: number };

  constructor(config: PolymarketSDKConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    console.log('[SDK] Initializing ClobClient with config:', {
      host: this.config.host,
      chainId: this.config.chainId,
    });

    // Initialize ClobClient without wallet/creds for public API access
    this.client = new ClobClient(
      this.config.host,
      this.config.chainId as Chain
    );
  }

  // ==========================================================================
  // MARKET DATA METHODS
  // ==========================================================================

  /**
   * Fetch all markets with pagination support
   * @param options - Pagination options
   * @returns Normalized market data
   */
  async getMarkets(options?: {
    limit?: number;
    nextCursor?: string;
    simplified?: boolean;
  }): Promise<{ markets: Market[]; nextCursor: string; count: number }> {
    try {
      let allMarkets: any[] = [];
      let nextCursor = options?.nextCursor || INITIAL_CURSOR;
      const limit = options?.limit || 100;

      // Fetch markets using appropriate endpoint
      const simplified = options?.simplified;

      while (nextCursor !== END_CURSOR && allMarkets.length < limit) {
        console.log('[SDK] Fetching page with cursor:', nextCursor);
        try {
          // Call the SDK method directly without bind
          const response: PaginationPayload = simplified
            ? await this.client.getSimplifiedMarkets(nextCursor)
            : await this.client.getMarkets(nextCursor);
            
          console.log('[SDK] Response:', {
            dataLength: response.data?.length || 0,
            nextCursor: response.next_cursor,
            limit: response.limit,
            count: response.count,
            responseType: typeof response,
            hasData: !!response.data,
            rawResponse: JSON.stringify(response).substring(0, 200),
          });
          
          if (response.data && Array.isArray(response.data)) {
            allMarkets = [...allMarkets, ...response.data];
          } else {
            console.warn('[SDK] No data array in response');
          }

          nextCursor = response.next_cursor || END_CURSOR;

          // Break if we've reached the desired limit
          if (allMarkets.length >= limit) {
            break;
          }
        } catch (error) {
          console.error('[SDK] Error fetching page:', error);
          break;
        }
      }

      // Trim to exact limit
      if (allMarkets.length > limit) {
        allMarkets = allMarkets.slice(0, limit);
      }

      return {
        markets: allMarkets.map(m => this.normalizeMarket(m)),
        nextCursor,
        count: allMarkets.length,
      };
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching markets:', error);
      return { markets: [], nextCursor: END_CURSOR, count: 0 };
    }
  }

  /**
   * Fetch a single market by condition ID
   * @param conditionId - The market condition ID
   */
  async getMarket(conditionId: string): Promise<Market | null> {
    try {
      const market = await this.client.getMarket(conditionId);
      return this.normalizeMarket(market);
    } catch (error) {
      console.error(`[PolymarketSDK] Error fetching market ${conditionId}:`, error);
      return null;
    }
  }

  /**
   * Fetch sampling markets (optimized subset)
   * @param nextCursor - Pagination cursor
   */
  async getSamplingMarkets(nextCursor?: string): Promise<PaginationPayload> {
    try {
      return await this.client.getSamplingMarkets(nextCursor || INITIAL_CURSOR);
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching sampling markets:', error);
      return { data: [], next_cursor: END_CURSOR, limit: 100, count: 0 };
    }
  }

  // ==========================================================================
  // PRICING & ORDER BOOK METHODS
  // ==========================================================================

  /**
   * Get order book for a specific token
   * @param tokenId - The token ID
   */
  async getOrderBook(tokenId: string): Promise<OrderBookSummary | null> {
    try {
      return await this.client.getOrderBook(tokenId);
    } catch (error) {
      console.error(`[PolymarketSDK] Error fetching order book for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get order books for multiple tokens in batch
   * @param params - Array of token IDs with optional side
   */
  async getOrderBooks(params: BookParams[]): Promise<OrderBookSummary[]> {
    try {
      return await this.client.getOrderBooks(params);
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching order books:', error);
      return [];
    }
  }

  /**
   * Get current price for a token
   * @param tokenId - The token ID
   * @param side - BUY or SELL
   */
  async getPrice(tokenId: string, side: 'BUY' | 'SELL'): Promise<number | null> {
    try {
      const result = await this.client.getPrice(tokenId, side);
      return result?.price ? parseFloat(result.price) : null;
    } catch (error) {
      console.error(`[PolymarketSDK] Error fetching price for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens in batch
   * @param params - Array of token IDs with sides
   */
  async getPrices(params: BookParams[]): Promise<any[]> {
    try {
      return await this.client.getPrices(params);
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching prices:', error);
      return [];
    }
  }

  /**
   * Get last trade price for a token
   * @param tokenId - The token ID
   */
  async getLastTradePrice(tokenId: string): Promise<number | null> {
    try {
      const result = await this.client.getLastTradePrice(tokenId);
      return result?.price ? parseFloat(result.price) : null;
    } catch (error) {
      console.error(`[PolymarketSDK] Error fetching last trade price for ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get price history for a token
   * @param params - Price history filter parameters
   */
  async getPricesHistory(params: PriceHistoryFilterParams): Promise<MarketPrice[]> {
    try {
      return await this.client.getPricesHistory(params);
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching price history:', error);
      return [];
    }
  }

  /**
   * Get market prices with historical data
   * @param conditionId - The market condition ID
   */
  async getMarketPrices(conditionId: string): Promise<PriceData[]> {
    try {
      const market = await this.getMarket(conditionId);
      if (!market || !market.tokens) {
        return [];
      }

      const prices: PriceData[] = [];
      for (const token of market.tokens) {
        const price = await this.getLastTradePrice(token.token_id);
        if (price !== null) {
          prices.push({
            tokenId: token.token_id,
            price,
            timestamp: new Date(),
          });
        }
      }

      return prices;
    } catch (error) {
      console.error(`[PolymarketSDK] Error fetching market prices for ${conditionId}:`, error);
      return [];
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get server time from CLOB API
   */
  async getServerTime(): Promise<number> {
    try {
      return await this.client.getServerTime();
    } catch (error) {
      console.error('[PolymarketSDK] Error fetching server time:', error);
      return Date.now();
    }
  }

  // ==========================================================================
  // NORMALIZATION METHODS
  // ==========================================================================

  /**
   * Normalize SDK market data to internal format
   */
  private normalizeMarket(market: any): Market {
    return {
      id: market.id || market.condition_id || '',
      question: market.question || market.description || 'Unknown Market',
      description: market.description || '',
      outcomes: market.outcomes || market.outcome_prices?.map((_: any, i: number) => `Outcome ${i + 1}`) || ['Yes', 'No'],
      outcomesPrices: market.outcome_prices 
        ? market.outcome_prices.map((p: string) => parseFloat(p)) 
        : market.tokens?.map((t: any) => parseFloat(t.price || '0.5')) || [0.5, 0.5],
      volume: parseFloat(market.volume || market.volume_24hr || '0'),
      liquidity: parseFloat(market.liquidity || '0'),
      category: market.category || market.tags?.[0] || 'General',
      endDate: market.end_date_iso || market.endDate || undefined,
      active: market.active !== false && market.closed !== true,
      resolved: market.resolved === true || market.closed === true,
      winningOutcome: market.winning_outcome !== undefined ? parseInt(market.winning_outcome) : undefined,
      conditionId: market.condition_id || market.id,
      tokens: market.tokens || [],
    };
  }

  /**
   * Check if client is properly initialized
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Get client configuration
   */
  getConfig(): typeof this.config {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Use a WeakMap to avoid memory leaks in development hot-reloading
let sdkClientInstance: PolymarketSDKClient | null = null;

export function getPolymarketSDKClient(config?: PolymarketSDKConfig): PolymarketSDKClient {
  if (!sdkClientInstance) {
    console.log('[SDK] Creating new PolymarketSDKClient instance');
    sdkClientInstance = new PolymarketSDKClient(config);
  }
  return sdkClientInstance;
}

// Export function to reset the client (useful for testing)
export function resetSDKClient() {
  console.log('[SDK] Resetting SDK client instance');
  sdkClientInstance = null;
}

export default PolymarketSDKClient;
