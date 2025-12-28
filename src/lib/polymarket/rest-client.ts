/**
 * Polymarket REST API Client
 * Handles HTTP requests to Polymarket API
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import {
  PolymarketConfig,
  Market,
  MarketStats,
  Trade,
  Order,
  WalletPosition,
  WalletStats,
  LeaderWallet,
  MarketFilter,
  TradeFilter,
  WalletFilter,
  PaginatedResponse,
  PolymarketAPIError,
} from "./types";

export class PolymarketRestClient {
  private client: AxiosInstance;
  private config: PolymarketConfig;

  constructor(config: Partial<PolymarketConfig> = {}) {
    this.config = {
      apiUrl:
        config.apiUrl ||
        process.env.POLYMARKET_API_URL ||
        "https://gamma-api.polymarket.com",
      wsUrl:
        config.wsUrl ||
        process.env.POLYMARKET_WS_URL ||
        "wss://ws-subscriptions-clob.polymarket.com",
      apiKey: config.apiKey || process.env.POLYMARKET_API_KEY,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      responseType: 'json',
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const url = config.baseURL + (config.url || '');
        const fullUrl = config.params ? `${url}?${new URLSearchParams(config.params).toString()}` : url;
        console.log(
          `[Polymarket API] ${config.method?.toUpperCase()} ${fullUrl}`
        );
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Polymarket API] Response status: ${response.status}, data type: ${typeof response.data}, length: ${typeof response.data === 'string' ? response.data.length : 'N/A'}`);
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config as any;

        if (!config || !config.retry) {
          config.retry = 0;
        }

        if (config.retry < this.config.retryAttempts!) {
          config.retry += 1;

          // Exponential backoff
          const delay = this.config.retryDelay! * Math.pow(2, config.retry - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));

          console.log(
            `[Polymarket API] Retry attempt ${config.retry}/${this.config.retryAttempts}`
          );
          return this.client(config);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): PolymarketAPIError {
    if (error.response) {
      return new PolymarketAPIError(
        error.response.data?.message || error.message,
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      return new PolymarketAPIError("No response from Polymarket API");
    } else {
      return new PolymarketAPIError(error.message);
    }
  }

  // ============================================
  // MARKET ENDPOINTS
  // ============================================

  /**
   * Get all markets with optional filters
   */
  async getMarkets(filter?: MarketFilter): Promise<Market[]> {
    try {
      const params = new URLSearchParams();

      if (filter?.active !== undefined)
        params.append("active", String(filter.active));
      if (filter?.closed !== undefined)
        params.append("closed", String(filter.closed));
      if (filter?.archived !== undefined)
        params.append("archived", String(filter.archived));
      if (filter?.category) params.append("category", filter.category);
      if (filter?.limit) params.append("limit", String(filter.limit));
      if (filter?.offset) params.append("offset", String(filter.offset));

      // Use native fetch instead of axios for better Bun compatibility
      const url = `${this.config.apiUrl}/markets?${params.toString()}`;
      console.log(`[Polymarket REST] Fetching: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Polymarket REST] Received ${Array.isArray(data) ? data.length : 'non-array'} markets`);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[Polymarket REST] Sample market:', {
          id: data[0].id,
          conditionId: data[0].conditionId,
          question: data[0].question?.substring(0, 50),
          volume: data[0].volume,
          liquidity: data[0].liquidity
        });
      }
      
      return data as Market[];
    } catch (error) {
      console.error('[Polymarket REST] Error in getMarkets:', error);
      throw new PolymarketAPIError((error as Error).message);
    }
  }

  /**
   * Get a specific market by ID
   */
  async getMarket(marketId: string): Promise<Market> {
    try {
      // Use native fetch instead of axios for better Bun compatibility
      const url = `${this.config.apiUrl}/markets/${marketId}`;
      console.log(`[Polymarket REST] Fetching single market: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(this.config.apiKey && {
            Authorization: `Bearer ${this.config.apiKey}`,
          }),
        },
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Polymarket REST] Raw market data fields:`, {
        id: data.id,
        conditionId: data.conditionId,
        condition_id: data.condition_id,
      });
      console.log(`[Polymarket REST] Successfully fetched market:`, data.question?.substring(0, 50));
      
      // Return as any to avoid type coercion - API returns camelCase but types expect snake_case
      return data;
    } catch (error) {
      console.error('[Polymarket REST] Error in getMarket:', error);
      throw new PolymarketAPIError((error as Error).message);
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(marketId: string): Promise<MarketStats> {
    try {
      const response = await this.client.get<MarketStats>(
        `/markets/${marketId}/stats`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get multiple market stats in batch
   */
  async getBatchMarketStats(marketIds: string[]): Promise<MarketStats[]> {
    try {
      const response = await this.client.post<MarketStats[]>(
        "/markets/stats/batch",
        {
          market_ids: marketIds,
        }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ============================================
  // TRADE ENDPOINTS
  // ============================================

  /**
   * Get trades for a market or wallet
   */
  async getTrades(filter: TradeFilter): Promise<PaginatedResponse<Trade>> {
    try {
      const params = new URLSearchParams();

      if (filter.market_id) params.append("market_id", filter.market_id);
      if (filter.wallet_address)
        params.append("wallet_address", filter.wallet_address);
      if (filter.side) params.append("side", filter.side);
      if (filter.start_time) params.append("start_time", filter.start_time);
      if (filter.end_time) params.append("end_time", filter.end_time);
      if (filter.limit) params.append("limit", String(filter.limit));
      if (filter.offset) params.append("offset", String(filter.offset));

      const response = await this.client.get<PaginatedResponse<Trade>>(
        "/trades",
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get recent trades for a specific market
   */
  async getMarketTrades(marketId: string, limit = 100): Promise<Trade[]> {
    try {
      const response = await this.getTrades({
        market_id: marketId,
        limit,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get trades by a specific wallet
   */
  async getWalletTrades(walletAddress: string, limit = 100): Promise<Trade[]> {
    try {
      const response = await this.getTrades({
        wallet_address: walletAddress,
        limit,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ============================================
  // WALLET/POSITION ENDPOINTS
  // ============================================

  /**
   * Get wallet positions
   */
  async getWalletPositions(walletAddress: string): Promise<WalletPosition[]> {
    try {
      const response = await this.client.get<WalletPosition[]>(
        `/wallets/${walletAddress}/positions`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(walletAddress: string): Promise<WalletStats> {
    try {
      const response = await this.client.get<WalletStats>(
        `/wallets/${walletAddress}/stats`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get leader wallets (top traders)
   */
  async getLeaderWallets(filter?: WalletFilter): Promise<LeaderWallet[]> {
    try {
      const params = new URLSearchParams();

      if (filter?.min_volume)
        params.append("min_volume", String(filter.min_volume));
      if (filter?.min_trades)
        params.append("min_trades", String(filter.min_trades));
      if (filter?.min_win_rate)
        params.append("min_win_rate", String(filter.min_win_rate));
      if (filter?.limit) params.append("limit", String(filter.limit));

      const response = await this.client.get<LeaderWallet[]>(
        "/wallets/leaders",
        { params }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Check if a wallet is a leader/verified trader
   */
  async isLeaderWallet(walletAddress: string): Promise<boolean> {
    try {
      const stats = await this.getWalletStats(walletAddress);

      // Define criteria for leader wallet
      const isLeader =
        stats.total_volume > 100000 && // $100k+ volume
        stats.total_trades > 100 && // 100+ trades
        stats.win_rate > 0.55; // 55%+ win rate

      return isLeader;
    } catch (error) {
      console.error("Error checking leader wallet:", error);
      return false;
    }
  }

  // ============================================
  // ORDER ENDPOINTS
  // ============================================

  /**
   * Get orders for a market or wallet
   */
  async getOrders(
    marketId?: string,
    walletAddress?: string,
    status?: Order["status"]
  ): Promise<Order[]> {
    try {
      const params = new URLSearchParams();

      if (marketId) params.append("market_id", marketId);
      if (walletAddress) params.append("wallet_address", walletAddress);
      if (status) params.append("status", status);

      const response = await this.client.get<Order[]>("/orders", { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get orderbook for a market
   */
  async getOrderbook(
    marketId: string
  ): Promise<{ bids: Order[]; asks: Order[] }> {
    try {
      const response = await this.client.get<{ bids: Order[]; asks: Order[] }>(
        `/markets/${marketId}/orderbook`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API status
   */
  async getStatus(): Promise<{ healthy: boolean; timestamp: string }> {
    try {
      const response = await this.client.get<{
        healthy: boolean;
        timestamp: string;
      }>("/status");
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }
}

// Export singleton instance
export const polymarketClient = new PolymarketRestClient();
