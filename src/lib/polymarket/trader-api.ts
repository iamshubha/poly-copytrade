/**
 * Polymarket Trader API Service
 * 
 * Authenticated trader data fetching using L2 API key authentication.
 * Provides access to trade history, open orders, and positions.
 * 
 * Features:
 * - Authenticated trade fetching with pagination
 * - Open orders tracking
 * - Position monitoring
 * - Trader statistics
 */

import { ClobClient, type Chain, type ApiKeyCreds } from '@polymarket/clob-client';
import type {
  Trade,
  TradeParams,
  OpenOrder,
  OpenOrderParams,
} from '@polymarket/clob-client';
import { Wallet } from 'ethers';

// ============================================================================
// TYPES
// ============================================================================

export interface TraderStats {
  address: string;
  totalTrades: number;
  totalVolume: number;
  avgTradeSize: number;
  markets: Set<string>;
  lastTradeTime?: Date;
  profitLoss?: number;
  winRate?: number;
}

export interface TradeQueryOptions {
  marketId?: string;
  assetId?: string;
  before?: string; // ISO timestamp
  after?: string; // ISO timestamp
  limit?: number;
  paginateAll?: boolean; // Fetch all pages
}

export interface PositionData {
  tokenId: string;
  marketId: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice?: number;
  unrealizedPnL?: number;
}

// ============================================================================
// POLYMARKET TRADER API SERVICE
// ============================================================================

export class PolymarketTraderAPI {
  private client: ClobClient;
  private walletAddress: string;

  private constructor(client: ClobClient, walletAddress: string) {
    this.client = client;
    this.walletAddress = walletAddress;
  }

  /**
   * Initialize authenticated trader API service
   * 
   * @param privateKey - Wallet private key
   * @param creds - API credentials
   * @param config - Optional configuration
   */
  static async initialize(
    privateKey: string,
    creds: ApiKeyCreds,
    config?: { host?: string; chainId?: Chain }
  ): Promise<PolymarketTraderAPI> {
    const host = config?.host || process.env.POLYMARKET_API_URL || 'https://clob.polymarket.com';
    const chainId = config?.chainId || (parseInt(process.env.CHAIN_ID || '137') as Chain);

    const wallet = new Wallet(privateKey);
    const walletAddress = await wallet.getAddress();

    // Create authenticated client
    const client = new ClobClient(host, chainId, wallet, creds);

    console.log(`✅ Trader API initialized for wallet: ${walletAddress}`);

    return new PolymarketTraderAPI(client, walletAddress);
  }

  // ==========================================================================
  // TRADE DATA METHODS
  // ==========================================================================

  /**
   * Fetch all trades for the authenticated trader
   * 
   * @param options - Trade query options
   * @returns Array of trades
   */
  async getTraderTrades(options?: TradeQueryOptions): Promise<Trade[]> {
    try {
      const params: TradeParams = {
        maker_address: this.walletAddress,
        ...(options?.marketId && { market: options.marketId }),
        ...(options?.assetId && { asset_id: options.assetId }),
        ...(options?.before && { before: options.before }),
        ...(options?.after && { after: options.after }),
      };

      // Fetch all pages or just first page
      const paginateAll = options?.paginateAll !== false;
      const trades = await this.client.getTrades(params, !paginateAll);

      // Apply limit if specified
      if (options?.limit) {
        return trades.slice(0, options.limit);
      }

      console.log(`✅ Fetched ${trades.length} trades for ${this.walletAddress}`);
      return trades;
    } catch (error) {
      console.error('[TraderAPI] Error fetching trader trades:', error);
      return [];
    }
  }

  /**
   * Fetch trades with pagination info (single page)
   * 
   * @param options - Trade query options with cursor
   * @param nextCursor - Pagination cursor
   */
  async getTradesPaginated(
    options?: TradeQueryOptions,
    nextCursor?: string
  ): Promise<{ trades: Trade[]; nextCursor: string; limit: number; count: number }> {
    try {
      const params: TradeParams = {
        maker_address: this.walletAddress,
        ...(options?.marketId && { market: options.marketId }),
        ...(options?.assetId && { asset_id: options.assetId }),
        ...(options?.before && { before: options.before }),
        ...(options?.after && { after: options.after }),
      };

      const result = await this.client.getTradesPaginated(params, nextCursor);
      
      console.log(`✅ Fetched page with ${result.trades.length} trades`);
      return result;
    } catch (error) {
      console.error('[TraderAPI] Error fetching paginated trades:', error);
      return { trades: [], nextCursor: 'LTE=', limit: 0, count: 0 };
    }
  }

  /**
   * Fetch trades for a specific market
   * 
   * @param marketId - Market condition ID
   * @param limit - Max number of trades
   */
  async getMarketTrades(marketId: string, limit?: number): Promise<Trade[]> {
    return this.getTraderTrades({ marketId, limit });
  }

  /**
   * Fetch recent trades after a specific timestamp
   * 
   * @param afterTimestamp - ISO timestamp to fetch trades after
   * @param limit - Max number of trades
   */
  async getRecentTrades(afterTimestamp: string, limit?: number): Promise<Trade[]> {
    return this.getTraderTrades({ after: afterTimestamp, limit });
  }

  // ==========================================================================
  // OPEN ORDERS METHODS
  // ==========================================================================

  /**
   * Fetch all open orders for the authenticated trader
   * 
   * @param options - Order query options
   */
  async getOpenOrders(options?: {
    marketId?: string;
    assetId?: string;
    paginateAll?: boolean;
  }): Promise<OpenOrder[]> {
    try {
      const params: OpenOrderParams = {
        ...(options?.marketId && { market: options.marketId }),
        ...(options?.assetId && { asset_id: options.assetId }),
      };

      const paginateAll = options?.paginateAll !== false;
      const orders = await this.client.getOpenOrders(params, !paginateAll);

      console.log(`✅ Fetched ${orders.length} open orders for ${this.walletAddress}`);
      return orders;
    } catch (error) {
      console.error('[TraderAPI] Error fetching open orders:', error);
      return [];
    }
  }

  /**
   * Fetch open orders for a specific market
   * 
   * @param marketId - Market condition ID
   */
  async getMarketOpenOrders(marketId: string): Promise<OpenOrder[]> {
    return this.getOpenOrders({ marketId });
  }

  // ==========================================================================
  // POSITION TRACKING
  // ==========================================================================

  /**
   * Calculate current positions from trade history
   * 
   * @param marketId - Optional market ID to filter positions
   */
  async getPositions(marketId?: string): Promise<PositionData[]> {
    try {
      const trades = await this.getTraderTrades({ marketId, paginateAll: true });

      // Group trades by token ID
      const positionMap = new Map<string, PositionData>();

      for (const trade of trades) {
        const key = trade.asset_id;
        
        if (!positionMap.has(key)) {
          positionMap.set(key, {
            tokenId: trade.asset_id,
            marketId: trade.market,
            outcome: trade.outcome,
            size: 0,
            avgPrice: 0,
          });
        }

        const position = positionMap.get(key)!;
        const tradeSize = parseFloat(trade.size);
        const tradePrice = parseFloat(trade.price);

        // Update position based on side
        if (trade.side === 'BUY') {
          const newSize = position.size + tradeSize;
          position.avgPrice = ((position.avgPrice * position.size) + (tradePrice * tradeSize)) / newSize;
          position.size = newSize;
        } else if (trade.side === 'SELL') {
          position.size -= tradeSize;
          // If position is fully closed, reset avg price
          if (position.size <= 0) {
            position.avgPrice = 0;
          }
        }
      }

      // Filter out closed positions (size <= 0)
      const activePositions = Array.from(positionMap.values()).filter(p => p.size > 0);

      console.log(`✅ Calculated ${activePositions.length} active positions`);
      return activePositions;
    } catch (error) {
      console.error('[TraderAPI] Error calculating positions:', error);
      return [];
    }
  }

  // ==========================================================================
  // TRADER STATISTICS
  // ==========================================================================

  /**
   * Get comprehensive trader statistics
   */
  async getTraderStats(): Promise<TraderStats> {
    try {
      const trades = await this.getTraderTrades({ paginateAll: true });

      const stats: TraderStats = {
        address: this.walletAddress,
        totalTrades: trades.length,
        totalVolume: 0,
        avgTradeSize: 0,
        markets: new Set<string>(),
      };

      if (trades.length === 0) {
        return stats;
      }

      let totalSize = 0;
      for (const trade of trades) {
        const amount = parseFloat(trade.size) * parseFloat(trade.price);
        stats.totalVolume += amount;
        totalSize += parseFloat(trade.size);
        stats.markets.add(trade.market);
      }

      stats.avgTradeSize = totalSize / trades.length;
      
      // Find last trade time
      const timestamps = trades
        .map(t => new Date(t.match_time))
        .filter(d => !isNaN(d.getTime()));
      
      if (timestamps.length > 0) {
        stats.lastTradeTime = new Date(Math.max(...timestamps.map(d => d.getTime())));
      }

      console.log(`✅ Calculated stats for ${this.walletAddress}`);
      return stats;
    } catch (error) {
      console.error('[TraderAPI] Error calculating trader stats:', error);
      return {
        address: this.walletAddress,
        totalTrades: 0,
        totalVolume: 0,
        avgTradeSize: 0,
        markets: new Set<string>(),
      };
    }
  }

  // ==========================================================================
  // MONITORING & REAL-TIME
  // ==========================================================================

  /**
   * Monitor for new trades (polling-based)
   * 
   * @param callback - Called when new trades are detected
   * @param intervalMs - Polling interval in milliseconds
   */
  async monitorNewTrades(
    callback: (trades: Trade[]) => void,
    intervalMs = 10000
  ): Promise<() => void> {
    let lastTradeTime = new Date().toISOString();
    let isMonitoring = true;

    const checkForNewTrades = async () => {
      if (!isMonitoring) return;

      try {
        const newTrades = await this.getRecentTrades(lastTradeTime, 100);
        
        if (newTrades.length > 0) {
          console.log(`✅ Detected ${newTrades.length} new trades`);
          callback(newTrades);
          
          // Update last trade time
          const timestamps = newTrades.map(t => new Date(t.match_time).getTime());
          lastTradeTime = new Date(Math.max(...timestamps)).toISOString();
        }
      } catch (error) {
        console.error('[TraderAPI] Error monitoring trades:', error);
      }

      // Schedule next check
      if (isMonitoring) {
        setTimeout(checkForNewTrades, intervalMs);
      }
    };

    // Start monitoring
    checkForNewTrades();

    // Return stop function
    return () => {
      isMonitoring = false;
      console.log('⏹️  Stopped monitoring trades');
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.walletAddress;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.client !== null;
  }
}

export default PolymarketTraderAPI;
