/**
 * Polymarket API Integration Module
 * 
 * Features:
 * - WebSocket real-time trade data subscription
 * - REST API for market stats and trade history
 * - Leader wallet trade detection
 * - Type-safe interfaces
 */

import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES & INTERFACES
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
}

export interface Trade {
  id: string;
  marketId: string;
  maker: string;
  taker: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  amount: number;
  outcome: number;
  timestamp: Date;
  transactionHash?: string;
}

export interface OrderBookUpdate {
  marketId: string;
  outcome: number;
  bids: [number, number][]; // [price, size]
  asks: [number, number][]; // [price, size]
  timestamp: Date;
}

export interface MarketStats {
  marketId: string;
  volume24h: number;
  volumeTotal: number;
  trades24h: number;
  tradesTotal: number;
  lastPrice: number;
  priceChange24h: number;
  highPrice24h: number;
  lowPrice24h: number;
}

export interface WalletActivity {
  address: string;
  trades: Trade[];
  totalVolume: number;
  profitLoss: number;
  winRate: number;
  lastActivity: Date;
}

export interface LeaderWallet {
  address: string;
  roi: number; // Return on investment %
  volume: number;
  trades: number;
  winRate: number;
  avgTradeSize: number;
  followers?: number;
}

export interface PolymarketConfig {
  restApiUrl?: string;
  wsApiUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface TradeFilter {
  marketId?: string;
  walletAddress?: string;
  minAmount?: number;
  maxAmount?: number;
  side?: 'BUY' | 'SELL';
  startTime?: Date;
  endTime?: Date;
}

// ============================================================================
// POLYMARKET API CLIENT
// ============================================================================

export class PolymarketClient extends EventEmitter {
  private restClient: AxiosInstance;
  private wsClient?: WebSocket;
  private config: Required<PolymarketConfig>;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private subscriptions = new Map<string, Set<string>>();
  private isConnected = false;

  constructor(config: PolymarketConfig = {}) {
    super();
    
    this.config = {
      restApiUrl: config.restApiUrl || 'https://clob.polymarket.com',
      wsApiUrl: config.wsApiUrl || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 5,
      retryDelay: config.retryDelay || 2000,
    };

    this.restClient = axios.create({
      baseURL: this.config.restApiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
    });
  }

  // ==========================================================================
  // REST API METHODS
  // ==========================================================================

  /**
   * Fetch all active markets
   */
  async getMarkets(limit = 100, offset = 0): Promise<Market[]> {
    try {
      const response = await this.restClient.get('/markets', {
        params: { limit, offset, active: true },
      });
      
      return this.normalizeMarkets(response.data);
    } catch (error) {
      this.handleError('getMarkets', error);
      return [];
    }
  }

  /**
   * Fetch specific market by ID
   */
  async getMarket(marketId: string): Promise<Market | null> {
    try {
      const response = await this.restClient.get(`/markets/${marketId}`);
      return this.normalizeMarket(response.data);
    } catch (error) {
      this.handleError('getMarket', error);
      return null;
    }
  }

  /**
   * Fetch market statistics
   */
  async getMarketStats(marketId: string): Promise<MarketStats | null> {
    try {
      const response = await this.restClient.get(`/markets/${marketId}/stats`);
      return {
        marketId,
        volume24h: parseFloat(response.data.volume24h || '0'),
        volumeTotal: parseFloat(response.data.volumeTotal || '0'),
        trades24h: parseInt(response.data.trades24h || '0'),
        tradesTotal: parseInt(response.data.tradesTotal || '0'),
        lastPrice: parseFloat(response.data.lastPrice || '0'),
        priceChange24h: parseFloat(response.data.priceChange24h || '0'),
        highPrice24h: parseFloat(response.data.highPrice24h || '0'),
        lowPrice24h: parseFloat(response.data.lowPrice24h || '0'),
      };
    } catch (error) {
      this.handleError('getMarketStats', error);
      return null;
    }
  }

  /**
   * Fetch trades for a market
   */
  async getMarketTrades(marketId: string, limit = 100): Promise<Trade[]> {
    try {
      const response = await this.restClient.get(`/markets/${marketId}/trades`, {
        params: { limit },
      });
      
      return this.normalizeTrades(response.data, marketId);
    } catch (error) {
      this.handleError('getMarketTrades', error);
      return [];
    }
  }

  /**
   * Fetch trades for a specific wallet
   */
  async getWalletTrades(walletAddress: string, limit = 100): Promise<Trade[]> {
    try {
      const response = await this.restClient.get('/trades', {
        params: { 
          maker: walletAddress,
          limit,
        },
      });
      
      return this.normalizeTrades(response.data);
    } catch (error) {
      this.handleError('getWalletTrades', error);
      return [];
    }
  }

  /**
   * Fetch wallet activity and statistics
   */
  async getWalletActivity(walletAddress: string): Promise<WalletActivity | null> {
    try {
      const trades = await this.getWalletTrades(walletAddress, 1000);
      
      if (trades.length === 0) {
        return null;
      }

      const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
      const lastActivity = new Date(Math.max(...trades.map(t => t.timestamp.getTime())));
      
      // Calculate P&L (simplified - would need position tracking for accuracy)
      const profitLoss = this.calculateProfitLoss(trades);
      const winRate = this.calculateWinRate(trades);

      return {
        address: walletAddress,
        trades,
        totalVolume,
        profitLoss,
        winRate,
        lastActivity,
      };
    } catch (error) {
      this.handleError('getWalletActivity', error);
      return null;
    }
  }

  /**
   * Fetch order book for a market
   */
  async getOrderBook(marketId: string, outcome = 0): Promise<OrderBookUpdate | null> {
    try {
      const response = await this.restClient.get(`/markets/${marketId}/orderbook`, {
        params: { outcome },
      });
      
      return {
        marketId,
        outcome,
        bids: response.data.bids || [],
        asks: response.data.asks || [],
        timestamp: new Date(),
      };
    } catch (error) {
      this.handleError('getOrderBook', error);
      return null;
    }
  }

  // ==========================================================================
  // WEBSOCKET METHODS
  // ==========================================================================

  /**
   * Connect to WebSocket for real-time data
   */
  async connectWebSocket(): Promise<void> {
    if (this.wsClient && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.wsClient = new WebSocket(this.config.wsApiUrl);

        this.wsClient.on('open', () => {
          console.log('✅ WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.wsClient.on('message', (data: WebSocket.Data) => {
          this.handleWebSocketMessage(data);
        });

        this.wsClient.on('error', (error) => {
          console.error('❌ WebSocket error:', error.message);
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.wsClient.on('close', () => {
          console.log('⚠️  WebSocket disconnected');
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to market trades
   */
  subscribeToMarketTrades(marketId: string): void {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected. Call connectWebSocket() first.');
    }

    const message = JSON.stringify({
      type: 'subscribe',
      channel: 'trades',
      market: marketId,
    });

    this.wsClient?.send(message);
    
    if (!this.subscriptions.has('trades')) {
      this.subscriptions.set('trades', new Set());
    }
    this.subscriptions.get('trades')!.add(marketId);
    
    console.log(`📡 Subscribed to trades for market: ${marketId}`);
  }

  /**
   * Subscribe to order book updates
   */
  subscribeToOrderBook(marketId: string): void {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected. Call connectWebSocket() first.');
    }

    const message = JSON.stringify({
      type: 'subscribe',
      channel: 'orderbook',
      market: marketId,
    });

    this.wsClient?.send(message);
    
    if (!this.subscriptions.has('orderbook')) {
      this.subscriptions.set('orderbook', new Set());
    }
    this.subscriptions.get('orderbook')!.add(marketId);
    
    console.log(`📊 Subscribed to order book for market: ${marketId}`);
  }

  /**
   * Unsubscribe from market
   */
  unsubscribe(channel: string, marketId: string): void {
    const message = JSON.stringify({
      type: 'unsubscribe',
      channel,
      market: marketId,
    });

    this.wsClient?.send(message);
    this.subscriptions.get(channel)?.delete(marketId);
    
    console.log(`🔕 Unsubscribed from ${channel} for market: ${marketId}`);
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.wsClient?.close();
    this.isConnected = false;
    this.subscriptions.clear();
    console.log('🔌 WebSocket disconnected');
  }

  // ==========================================================================
  // LEADER WALLET DETECTION
  // ==========================================================================

  /**
   * Detect and analyze leader wallets based on performance
   */
  async detectLeaderWallets(minVolume = 10000, minTrades = 50): Promise<LeaderWallet[]> {
    try {
      // This would typically call a dedicated API endpoint
      // For now, we'll implement basic logic
      console.log('🔍 Detecting leader wallets...');
      
      // In production, this would query an analytics service
      // that tracks wallet performance across all markets
      const response = await this.restClient.get('/analytics/top-traders', {
        params: { minVolume, minTrades },
      });

      return response.data.map((trader: any) => ({
        address: trader.address,
        roi: parseFloat(trader.roi || '0'),
        volume: parseFloat(trader.volume || '0'),
        trades: parseInt(trader.trades || '0'),
        winRate: parseFloat(trader.winRate || '0'),
        avgTradeSize: parseFloat(trader.avgTradeSize || '0'),
        followers: parseInt(trader.followers || '0'),
      }));
      
    } catch (error) {
      // Fallback: analyze recent trades to find active wallets
      console.log('⚠️  API unavailable, using fallback method...');
      return this.analyzeTopTradersFromRecentActivity(minVolume, minTrades);
    }
  }

  /**
   * Monitor a specific wallet for new trades
   */
  async monitorWalletTrades(
    walletAddress: string,
    callback: (trade: Trade) => void,
    pollInterval = 5000
  ): Promise<() => void> {
    let lastTradeId: string | null = null;
    let isMonitoring = true;

    const poll = async () => {
      if (!isMonitoring) return;

      try {
        const trades = await this.getWalletTrades(walletAddress, 10);
        
        for (const trade of trades) {
          if (lastTradeId && trade.id === lastTradeId) {
            break; // We've seen this trade before
          }
          
          if (!lastTradeId) {
            lastTradeId = trade.id;
            break; // First run, just set the marker
          }
          
          callback(trade);
        }
        
        if (trades.length > 0 && !lastTradeId) {
          lastTradeId = trades[0].id;
        }
        
      } catch (error) {
        console.error(`Error monitoring wallet ${walletAddress}:`, error);
      }

      if (isMonitoring) {
        setTimeout(poll, pollInterval);
      }
    };

    // Start monitoring
    poll();

    // Return cleanup function
    return () => {
      isMonitoring = false;
      console.log(`🔕 Stopped monitoring wallet: ${walletAddress}`);
    };
  }

  /**
   * Get filtered trades
   */
  async getFilteredTrades(filter: TradeFilter, limit = 100): Promise<Trade[]> {
    try {
      const params: any = { limit };
      
      if (filter.walletAddress) params.maker = filter.walletAddress;
      if (filter.marketId) params.market = filter.marketId;
      if (filter.minAmount) params.minAmount = filter.minAmount;
      if (filter.startTime) params.startTime = filter.startTime.toISOString();
      if (filter.endTime) params.endTime = filter.endTime.toISOString();
      
      const response = await this.restClient.get('/trades', { params });
      let trades = this.normalizeTrades(response.data);
      
      // Apply additional filters
      if (filter.side) {
        trades = trades.filter(t => t.side === filter.side);
      }
      if (filter.maxAmount) {
        trades = trades.filter(t => t.amount <= filter.maxAmount!);
      }
      
      return trades;
    } catch (error) {
      this.handleError('getFilteredTrades', error);
      return [];
    }
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private handleWebSocketMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'trade':
          const trade = this.normalizeTrade(message.data);
          this.emit('trade', trade);
          break;
          
        case 'orderbook':
          const orderbook: OrderBookUpdate = {
            marketId: message.market,
            outcome: message.outcome,
            bids: message.bids || [],
            asks: message.asks || [],
            timestamp: new Date(),
          };
          this.emit('orderbook', orderbook);
          break;
          
        case 'error':
          console.error('WebSocket error:', message.error);
          this.emit('error', new Error(message.error));
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.retryAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.retryDelay * this.reconnectAttempts;
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.retryAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket()
        .then(() => {
          // Re-subscribe to previous channels
          this.subscriptions.forEach((markets, channel) => {
            markets.forEach(marketId => {
              if (channel === 'trades') {
                this.subscribeToMarketTrades(marketId);
              } else if (channel === 'orderbook') {
                this.subscribeToOrderBook(marketId);
              }
            });
          });
        })
        .catch(error => {
          console.error('Reconnection failed:', error);
        });
    }, delay);
  }

  private normalizeMarkets(data: any[]): Market[] {
    return data.map(m => this.normalizeMarket(m)).filter(m => m !== null) as Market[];
  }

  private normalizeMarket(data: any): Market | null {
    try {
      return {
        id: data.id || data.condition_id,
        question: data.question || data.title,
        description: data.description,
        outcomes: data.outcomes || ['Yes', 'No'],
        outcomesPrices: data.outcomePrices?.map((p: string) => parseFloat(p)) || [0.5, 0.5],
        volume: parseFloat(data.volume || '0'),
        liquidity: parseFloat(data.liquidity || '0'),
        category: data.category,
        endDate: data.endDate || data.end_date_iso,
        active: data.active !== false,
        resolved: data.resolved || data.closed || false,
        winningOutcome: data.winningOutcome,
      };
    } catch (error) {
      console.error('Error normalizing market:', error);
      return null;
    }
  }

  private normalizeTrades(data: any[], marketId?: string): Trade[] {
    return data.map(t => this.normalizeTrade(t, marketId)).filter(t => t !== null) as Trade[];
  }

  private normalizeTrade(data: any, marketId?: string): Trade | null {
    try {
      return {
        id: data.id || data.tradeId,
        marketId: marketId || data.market || data.marketId,
        maker: data.maker || data.makerAddress,
        taker: data.taker || data.takerAddress,
        side: data.side === 'BUY' || data.side === 'buy' ? 'BUY' : 'SELL',
        price: parseFloat(data.price),
        size: parseFloat(data.size || data.amount),
        amount: parseFloat(data.amount || (data.price * data.size)),
        outcome: parseInt(data.outcome || '0'),
        timestamp: new Date(data.timestamp || data.createdAt),
        transactionHash: data.transactionHash || data.txHash,
      };
    } catch (error) {
      console.error('Error normalizing trade:', error);
      return null;
    }
  }

  private calculateProfitLoss(trades: Trade[]): number {
    // Simplified P&L calculation
    // In production, this would track positions and calculate realized/unrealized P&L
    let pnl = 0;
    const positions = new Map<string, { buyAmount: number; buyTotal: number; sellTotal: number }>();

    for (const trade of trades) {
      const key = `${trade.marketId}-${trade.outcome}`;
      
      if (!positions.has(key)) {
        positions.set(key, { buyAmount: 0, buyTotal: 0, sellTotal: 0 });
      }
      
      const pos = positions.get(key)!;
      
      if (trade.side === 'BUY') {
        pos.buyAmount += trade.size;
        pos.buyTotal += trade.amount;
      } else {
        pos.sellTotal += trade.amount;
      }
    }

    positions.forEach(pos => {
      pnl += pos.sellTotal - pos.buyTotal;
    });

    return pnl;
  }

  private calculateWinRate(trades: Trade[]): number {
    // Simplified win rate calculation
    // In production, this would track completed positions
    if (trades.length === 0) return 0;
    
    const completedTrades = trades.filter(t => t.side === 'SELL');
    if (completedTrades.length === 0) return 0;
    
    // This is a placeholder - real calculation needs position tracking
    return 0.5; // 50% default
  }

  private async analyzeTopTradersFromRecentActivity(
    minVolume: number,
    minTrades: number
  ): Promise<LeaderWallet[]> {
    // Fallback method to analyze top traders from recent market activity
    // This is a simplified implementation
    console.log('📊 Analyzing recent activity for top traders...');
    
    const markets = await this.getMarkets(20);
    const traderStats = new Map<string, any>();

    for (const market of markets.slice(0, 5)) {
      const trades = await this.getMarketTrades(market.id, 100);
      
      for (const trade of trades) {
        const address = trade.maker;
        
        if (!traderStats.has(address)) {
          traderStats.set(address, {
            address,
            volume: 0,
            trades: 0,
            totalPnL: 0,
          });
        }
        
        const stats = traderStats.get(address);
        stats.volume += trade.amount;
        stats.trades += 1;
      }
    }

    const leaders: LeaderWallet[] = [];
    
    traderStats.forEach(stats => {
      if (stats.volume >= minVolume && stats.trades >= minTrades) {
        leaders.push({
          address: stats.address,
          roi: 0, // Would need historical data to calculate
          volume: stats.volume,
          trades: stats.trades,
          winRate: 0.5, // Placeholder
          avgTradeSize: stats.volume / stats.trades,
        });
      }
    });

    return leaders.sort((a, b) => b.volume - a.volume).slice(0, 10);
  }

  private handleError(method: string, error: any): void {
    const message = error.response?.data?.message || error.message || 'Unknown error';
    console.error(`❌ Error in ${method}:`, message);
    this.emit('error', { method, error: message });
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  getActiveSubscriptions(): Map<string, Set<string>> {
    return new Map(this.subscriptions);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PolymarketClient;
