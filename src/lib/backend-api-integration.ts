/**
 * Backend API Integration Module
 * Unified interface for trade subscriptions, market stats, and leader detection
 * 
 * Features:
 * 🔹 Subscribe to trade data (WebSocket or REST polling)
 * 🔹 Fetch market stats
 * 🔹 Detect leader wallet trades
 */

import { EventEmitter } from 'events';
import { PolymarketRestClient } from './polymarket/rest-client';
import { PolymarketWSClient } from './polymarket/ws-client';
import { LeaderWalletDetector } from './polymarket/leader-detector';
import {
  Trade,
  Market,
  MarketStats,
  LeaderWallet,
  WalletStats,
  TradeFilter,
  MarketFilter,
  PolymarketConfig,
} from './polymarket/types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BackendAPIConfig extends Partial<PolymarketConfig> {
  /**
   * Use WebSocket for real-time updates (true) or REST polling (false)
   */
  useWebSocket?: boolean;
  
  /**
   * Polling interval in milliseconds (used when useWebSocket = false)
   */
  pollingInterval?: number;
  
  /**
   * Leader wallet detection configuration
   */
  leaderDetection?: {
    enabled: boolean;
    minVolume?: number;
    minTrades?: number;
    minWinRate?: number;
    updateInterval?: number;
  };
  
  /**
   * Auto-reconnect on connection loss
   */
  autoReconnect?: boolean;
}

export interface TradeSubscription {
  id: string;
  marketId?: string;
  walletAddress?: string;
  active: boolean;
  type: 'websocket' | 'polling';
}

export interface MarketStatsCache {
  marketId: string;
  stats: MarketStats;
  lastUpdated: number;
  ttl: number; // Time to live in milliseconds
}

// Event types
export interface BackendAPIEvents {
  // Trade events
  'trade': (trade: Trade) => void;
  'trade:market': (marketId: string, trade: Trade) => void;
  'trade:wallet': (walletAddress: string, trade: Trade) => void;
  'trade:leader': (leader: LeaderWallet, trade: Trade) => void;
  
  // Market events
  'market:update': (marketId: string, market: Market) => void;
  'market:stats': (marketId: string, stats: MarketStats) => void;
  
  // Leader events
  'leader:detected': (wallet: LeaderWallet) => void;
  'leader:trade': (wallet: LeaderWallet, trade: Trade) => void;
  
  // Connection events
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'reconnecting': (attempt: number) => void;
}

// ============================================
// MAIN INTEGRATION CLASS
// ============================================

export class BackendAPIIntegration extends EventEmitter {
  private restClient: PolymarketRestClient;
  private wsClient: PolymarketWSClient | null = null;
  private leaderDetector: LeaderWalletDetector | null = null;
  private config: BackendAPIConfig;
  
  // Subscription management
  private subscriptions: Map<string, TradeSubscription> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Caching
  private marketStatsCache: Map<string, MarketStatsCache> = new Map();
  private marketsCache: Map<string, Market> = new Map();
  
  // State
  private isInitialized = false;
  private isConnected = false;

  constructor(config: BackendAPIConfig = {}) {
    super();
    
    this.config = {
      useWebSocket: config.useWebSocket ?? true,
      pollingInterval: config.pollingInterval || 5000,
      autoReconnect: config.autoReconnect ?? true,
      leaderDetection: {
        enabled: config.leaderDetection?.enabled ?? false,
        minVolume: config.leaderDetection?.minVolume || 100000,
        minTrades: config.leaderDetection?.minTrades || 100,
        minWinRate: config.leaderDetection?.minWinRate || 0.55,
        updateInterval: config.leaderDetection?.updateInterval || 300000, // 5 minutes
      },
      ...config,
    };

    // Initialize REST client (always needed)
    this.restClient = new PolymarketRestClient(config);
  }

  // ============================================
  // INITIALIZATION & CONNECTION
  // ============================================

  /**
   * Initialize the API integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[Backend API] Already initialized');
      return;
    }

    try {
      console.log('[Backend API] Initializing...');

      // Initialize WebSocket client if enabled
      if (this.config.useWebSocket) {
        this.wsClient = new PolymarketWSClient(this.config);
        this.setupWebSocketHandlers();
        await this.wsClient.connect();
      }

      // Initialize leader detector if enabled
      if (this.config.leaderDetection?.enabled) {
        this.leaderDetector = new LeaderWalletDetector(this.config.leaderDetection);
        this.setupLeaderDetectorHandlers();
        await this.leaderDetector.start();
      }

      this.isInitialized = true;
      this.isConnected = true;
      this.emit('connected');
      
      console.log('[Backend API] Initialized successfully');
    } catch (error) {
      console.error('[Backend API] Initialization error:', error);
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    console.log('[Backend API] Disconnecting...');

    // Stop all polling
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();

    // Disconnect WebSocket
    if (this.wsClient) {
      await this.wsClient.disconnect();
      this.wsClient = null;
    }

    // Stop leader detector
    if (this.leaderDetector) {
      await this.leaderDetector.stop();
      this.leaderDetector = null;
    }

    this.subscriptions.clear();
    this.isConnected = false;
    this.isInitialized = false;
    
    this.emit('disconnected');
    console.log('[Backend API] Disconnected');
  }

  // ============================================
  // TRADE SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to trade data for a specific market
   * @param marketId Market condition ID
   * @param options Subscription options
   */
  async subscribeToMarketTrades(
    marketId: string,
    options: { useWebSocket?: boolean } = {}
  ): Promise<string> {
    const useWS = options.useWebSocket ?? this.config.useWebSocket;
    const subscriptionId = `market-${marketId}`;

    if (this.subscriptions.has(subscriptionId)) {
      console.log(`[Backend API] Already subscribed to market ${marketId}`);
      return subscriptionId;
    }

    if (useWS && this.wsClient) {
      // WebSocket subscription
      await this.wsClient.subscribeTrades(marketId, (trade) => {
        this.emit('trade', trade);
        this.emit('trade:market', marketId, trade);
        this.handleIncomingTrade(trade);
      });

      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        marketId,
        active: true,
        type: 'websocket',
      });

      console.log(`[Backend API] Subscribed to market ${marketId} via WebSocket`);
    } else {
      // REST polling subscription
      const interval = setInterval(async () => {
        try {
          const trades = await this.restClient.getMarketTrades(marketId, {
            limit: 10,
          });

          trades.data.forEach((trade) => {
            this.emit('trade', trade);
            this.emit('trade:market', marketId, trade);
            this.handleIncomingTrade(trade);
          });
        } catch (error) {
          console.error(`[Backend API] Polling error for market ${marketId}:`, error);
          this.emit('error', error as Error);
        }
      }, this.config.pollingInterval);

      this.pollingIntervals.set(subscriptionId, interval);
      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        marketId,
        active: true,
        type: 'polling',
      });

      console.log(`[Backend API] Subscribed to market ${marketId} via polling`);
    }

    return subscriptionId;
  }

  /**
   * Subscribe to trades from a specific wallet
   * @param walletAddress Wallet address to monitor
   * @param options Subscription options
   */
  async subscribeToWalletTrades(
    walletAddress: string,
    options: { useWebSocket?: boolean } = {}
  ): Promise<string> {
    const useWS = options.useWebSocket ?? this.config.useWebSocket;
    const subscriptionId = `wallet-${walletAddress}`;

    if (this.subscriptions.has(subscriptionId)) {
      console.log(`[Backend API] Already subscribed to wallet ${walletAddress}`);
      return subscriptionId;
    }

    if (useWS && this.wsClient) {
      // WebSocket subscription
      await this.wsClient.subscribeWallet(walletAddress, (trade) => {
        this.emit('trade', trade);
        this.emit('trade:wallet', walletAddress, trade);
        this.handleIncomingTrade(trade);
      });

      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        walletAddress,
        active: true,
        type: 'websocket',
      });

      console.log(`[Backend API] Subscribed to wallet ${walletAddress} via WebSocket`);
    } else {
      // REST polling subscription
      const interval = setInterval(async () => {
        try {
          const trades = await this.restClient.getWalletTrades(walletAddress, {
            limit: 10,
          });

          trades.data.forEach((trade) => {
            this.emit('trade', trade);
            this.emit('trade:wallet', walletAddress, trade);
            this.handleIncomingTrade(trade);
          });
        } catch (error) {
          console.error(`[Backend API] Polling error for wallet ${walletAddress}:`, error);
          this.emit('error', error as Error);
        }
      }, this.config.pollingInterval);

      this.pollingIntervals.set(subscriptionId, interval);
      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        walletAddress,
        active: true,
        type: 'polling',
      });

      console.log(`[Backend API] Subscribed to wallet ${walletAddress} via polling`);
    }

    return subscriptionId;
  }

  /**
   * Subscribe to all trades across all markets
   */
  async subscribeToAllTrades(options: { useWebSocket?: boolean } = {}): Promise<string> {
    const useWS = options.useWebSocket ?? this.config.useWebSocket;
    const subscriptionId = 'all-trades';

    if (this.subscriptions.has(subscriptionId)) {
      console.log('[Backend API] Already subscribed to all trades');
      return subscriptionId;
    }

    if (useWS && this.wsClient) {
      // WebSocket subscription to all trades
      await this.wsClient.subscribeAllTrades((trade) => {
        this.emit('trade', trade);
        this.handleIncomingTrade(trade);
      });

      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        active: true,
        type: 'websocket',
      });

      console.log('[Backend API] Subscribed to all trades via WebSocket');
    } else {
      console.warn('[Backend API] All trades subscription requires WebSocket');
      throw new Error('All trades subscription requires WebSocket mode');
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from a trade subscription
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      console.warn(`[Backend API] Subscription ${subscriptionId} not found`);
      return;
    }

    if (subscription.type === 'websocket' && this.wsClient) {
      if (subscription.marketId) {
        await this.wsClient.unsubscribeTrades(subscription.marketId);
      } else if (subscription.walletAddress) {
        await this.wsClient.unsubscribeWallet(subscription.walletAddress);
      }
    } else if (subscription.type === 'polling') {
      const interval = this.pollingIntervals.get(subscriptionId);
      if (interval) {
        clearInterval(interval);
        this.pollingIntervals.delete(subscriptionId);
      }
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`[Backend API] Unsubscribed from ${subscriptionId}`);
  }

  // ============================================
  // MARKET STATS
  // ============================================

  /**
   * Fetch market statistics
   * @param marketId Market condition ID
   * @param useCache Use cached data if available
   */
  async fetchMarketStats(marketId: string, useCache = true): Promise<MarketStats> {
    // Check cache
    if (useCache) {
      const cached = this.marketStatsCache.get(marketId);
      if (cached && Date.now() - cached.lastUpdated < cached.ttl) {
        console.log(`[Backend API] Using cached stats for market ${marketId}`);
        return cached.stats;
      }
    }

    try {
      const stats = await this.restClient.getMarketStats(marketId);
      
      // Cache the result
      this.marketStatsCache.set(marketId, {
        marketId,
        stats,
        lastUpdated: Date.now(),
        ttl: 60000, // 1 minute TTL
      });

      this.emit('market:stats', marketId, stats);
      return stats;
    } catch (error) {
      console.error(`[Backend API] Error fetching market stats:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple market stats
   */
  async fetchMultipleMarketStats(
    marketIds: string[],
    useCache = true
  ): Promise<Map<string, MarketStats>> {
    const results = new Map<string, MarketStats>();

    await Promise.all(
      marketIds.map(async (marketId) => {
        try {
          const stats = await this.fetchMarketStats(marketId, useCache);
          results.set(marketId, stats);
        } catch (error) {
          console.error(`[Backend API] Error fetching stats for ${marketId}:`, error);
        }
      })
    );

    return results;
  }

  /**
   * Fetch market details
   */
  async fetchMarket(marketId: string, useCache = true): Promise<Market> {
    // Check cache
    if (useCache) {
      const cached = this.marketsCache.get(marketId);
      if (cached) {
        return cached;
      }
    }

    try {
      const market = await this.restClient.getMarket(marketId);
      this.marketsCache.set(marketId, market);
      this.emit('market:update', marketId, market);
      return market;
    } catch (error) {
      console.error(`[Backend API] Error fetching market:`, error);
      throw error;
    }
  }

  /**
   * Search markets with filters
   */
  async searchMarkets(filter: MarketFilter = {}): Promise<Market[]> {
    try {
      const response = await this.restClient.getMarkets(filter);
      
      // Cache markets
      response.data.forEach((market) => {
        this.marketsCache.set(market.condition_id, market);
      });

      return response.data;
    } catch (error) {
      console.error('[Backend API] Error searching markets:', error);
      throw error;
    }
  }

  /**
   * Get trending markets (high volume)
   */
  async getTrendingMarkets(limit = 10): Promise<Market[]> {
    return this.searchMarkets({
      active: true,
      order_by: 'volume',
      order_dir: 'desc',
      limit,
    });
  }

  // ============================================
  // LEADER WALLET DETECTION
  // ============================================

  /**
   * Detect and fetch leader wallets
   */
  async detectLeaderWallets(): Promise<LeaderWallet[]> {
    if (!this.leaderDetector) {
      throw new Error('Leader detection is not enabled');
    }

    return await this.leaderDetector.discoverLeaderWallets();
  }

  /**
   * Check if a wallet is a leader
   */
  async isLeaderWallet(walletAddress: string): Promise<boolean> {
    if (!this.leaderDetector) {
      throw new Error('Leader detection is not enabled');
    }

    return await this.leaderDetector.isLeaderWallet(walletAddress);
  }

  /**
   * Get leader wallet details
   */
  async getLeaderWalletDetails(walletAddress: string): Promise<LeaderWallet | null> {
    if (!this.leaderDetector) {
      throw new Error('Leader detection is not enabled');
    }

    return await this.leaderDetector.getLeaderDetails(walletAddress);
  }

  /**
   * Monitor a leader wallet for trades
   */
  async monitorLeaderWallet(walletAddress: string): Promise<void> {
    if (!this.leaderDetector) {
      throw new Error('Leader detection is not enabled');
    }

    await this.leaderDetector.monitorWallet(walletAddress);
    console.log(`[Backend API] Monitoring leader wallet ${walletAddress}`);
  }

  /**
   * Get all monitored leader wallets
   */
  getMonitoredLeaders(): string[] {
    if (!this.leaderDetector) {
      return [];
    }

    return Array.from(this.leaderDetector.getMonitoredWallets());
  }

  // ============================================
  // WALLET STATS
  // ============================================

  /**
   * Fetch wallet statistics
   */
  async fetchWalletStats(walletAddress: string): Promise<WalletStats> {
    try {
      return await this.restClient.getWalletStats(walletAddress);
    } catch (error) {
      console.error(`[Backend API] Error fetching wallet stats:`, error);
      throw error;
    }
  }

  /**
   * Fetch wallet positions
   */
  async fetchWalletPositions(walletAddress: string) {
    try {
      return await this.restClient.getWalletPositions(walletAddress);
    } catch (error) {
      console.error(`[Backend API] Error fetching wallet positions:`, error);
      throw error;
    }
  }

  // ============================================
  // UTILITIES & STATUS
  // ============================================

  /**
   * Get connection status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      connected: this.isConnected,
      useWebSocket: this.config.useWebSocket,
      subscriptions: Array.from(this.subscriptions.values()),
      leaderDetectionEnabled: this.config.leaderDetection?.enabled,
      monitoredLeaders: this.getMonitoredLeaders().length,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.marketStatsCache.clear();
    this.marketsCache.clear();
    console.log('[Backend API] Cache cleared');
  }

  /**
   * Get active subscriptions
   */
  getActiveSubscriptions(): TradeSubscription[] {
    return Array.from(this.subscriptions.values()).filter((sub) => sub.active);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private setupWebSocketHandlers(): void {
    if (!this.wsClient) return;

    this.wsClient.onConnect(() => {
      this.isConnected = true;
      this.emit('connected');
    });

    this.wsClient.onDisconnect(() => {
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.wsClient.onError((error) => {
      this.emit('error', error);
    });
  }

  private setupLeaderDetectorHandlers(): void {
    if (!this.leaderDetector) return;

    this.leaderDetector.onLeaderTrade((wallet, trade) => {
      this.emit('leader:trade', wallet, trade);
      this.emit('trade:leader', wallet, trade);
    });
  }

  private async handleIncomingTrade(trade: Trade): Promise<void> {
    // Check if trade is from a leader wallet
    if (this.leaderDetector) {
      const isLeader = await this.leaderDetector.isLeaderWallet(trade.maker_address);
      if (isLeader) {
        const leaderDetails = await this.leaderDetector.getLeaderDetails(trade.maker_address);
        if (leaderDetails) {
          this.emit('leader:trade', leaderDetails, trade);
        }
      }
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let backendAPIInstance: BackendAPIIntegration | null = null;

/**
 * Get or create the singleton instance
 */
export function getBackendAPI(config?: BackendAPIConfig): BackendAPIIntegration {
  if (!backendAPIInstance) {
    backendAPIInstance = new BackendAPIIntegration(config);
  }
  return backendAPIInstance;
}

/**
 * Create a new instance (useful for testing or multiple configurations)
 */
export function createBackendAPI(config?: BackendAPIConfig): BackendAPIIntegration {
  return new BackendAPIIntegration(config);
}

// Export default instance getter
export default getBackendAPI;
