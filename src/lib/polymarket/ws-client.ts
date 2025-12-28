/**
 * Polymarket WebSocket Client
 * Real-time trade data and market updates
 */

import WebSocket from "ws";
import {
  PolymarketConfig,
  WSMessage,
  WSSubscription,
  WSTradeUpdate,
  WSMarketUpdate,
  Trade,
  TradeHandler,
  MarketUpdateHandler,
  ErrorHandler,
  ConnectionHandler,
  PolymarketWSError,
} from "./types";

export class PolymarketWSClient {
  private ws: WebSocket | null = null;
  private config: PolymarketConfig;
  private subscriptions: Map<string, WSSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private shouldReconnect = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Event handlers
  private tradeHandlers: Map<string, TradeHandler[]> = new Map();
  private marketUpdateHandlers: Map<string, MarketUpdateHandler[]> = new Map();
  private errorHandlers: ErrorHandler[] = [];
  private connectHandlers: ConnectionHandler[] = [];
  private disconnectHandlers: ConnectionHandler[] = [];

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
  }

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  /**
   * Connect to Polymarket WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("[Polymarket WS] Already connected");
      return;
    }

    if (this.isConnecting) {
      console.log("[Polymarket WS] Connection already in progress");
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        console.log(`[Polymarket WS] Connecting to ${this.config.wsUrl}`);

        this.ws = new WebSocket(this.config.wsUrl, {
          headers: {
            ...(this.config.apiKey && {
              Authorization: `Bearer ${this.config.apiKey}`,
            }),
          },
        });

        this.ws.on("open", () => {
          console.log("[Polymarket WS] Connected successfully");
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.resubscribeAll();
          this.notifyConnect();
          resolve();
        });

        this.ws.on("message", (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on("error", (error) => {
          console.error("[Polymarket WS] Error:", error.message);
          this.isConnecting = false;
          this.notifyError(new PolymarketWSError(error.message));
          reject(error);
        });

        this.ws.on("close", (code, reason) => {
          console.log(`[Polymarket WS] Disconnected: ${code} - ${reason}`);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.notifyDisconnect();

          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        });
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log("[Polymarket WS] Disconnected");
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[Polymarket WS] Max reconnection attempts reached");
      this.notifyError(
        new PolymarketWSError(
          "Max reconnection attempts reached",
          "MAX_RETRIES",
          false
        )
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[Polymarket WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("[Polymarket WS] Reconnection failed:", error);
      });
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "ping", timestamp: new Date().toISOString() });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Subscribe to market trades
   */
  async subscribeToMarketTrades(
    marketId: string,
    handler: TradeHandler
  ): Promise<void> {
    const channel = `trades:${marketId}`;

    // Add handler
    if (!this.tradeHandlers.has(channel)) {
      this.tradeHandlers.set(channel, []);
    }
    this.tradeHandlers.get(channel)!.push(handler);

    // Subscribe if not already subscribed
    if (!this.subscriptions.has(channel)) {
      const subscription: WSSubscription = {
        channel: "trades",
        market_id: marketId,
        event_types: ["trade"],
      };

      this.subscriptions.set(channel, subscription);
      await this.subscribe(subscription);
    }
  }

  /**
   * Subscribe to wallet trades
   */
  async subscribeToWalletTrades(
    walletAddress: string,
    handler: TradeHandler
  ): Promise<void> {
    const channel = `wallet:${walletAddress}`;

    // Add handler
    if (!this.tradeHandlers.has(channel)) {
      this.tradeHandlers.set(channel, []);
    }
    this.tradeHandlers.get(channel)!.push(handler);

    // Subscribe if not already subscribed
    if (!this.subscriptions.has(channel)) {
      const subscription: WSSubscription = {
        channel: "wallet_trades",
        wallet_address: walletAddress,
        event_types: ["trade"],
      };

      this.subscriptions.set(channel, subscription);
      await this.subscribe(subscription);
    }
  }

  /**
   * Subscribe to market updates (price, volume, etc.)
   */
  async subscribeToMarketUpdates(
    marketId: string,
    handler: MarketUpdateHandler
  ): Promise<void> {
    const channel = `market:${marketId}`;

    // Add handler
    if (!this.marketUpdateHandlers.has(channel)) {
      this.marketUpdateHandlers.set(channel, []);
    }
    this.marketUpdateHandlers.get(channel)!.push(handler);

    // Subscribe if not already subscribed
    if (!this.subscriptions.has(channel)) {
      const subscription: WSSubscription = {
        channel: "market_updates",
        market_id: marketId,
        event_types: ["price_change", "volume_update"],
      };

      this.subscriptions.set(channel, subscription);
      await this.subscribe(subscription);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const subscription = this.subscriptions.get(channel);

    if (subscription) {
      await this.send({
        type: "unsubscribe",
        channel: subscription.channel,
        data: subscription,
      });

      this.subscriptions.delete(channel);
      this.tradeHandlers.delete(channel);
      this.marketUpdateHandlers.delete(channel);

      console.log(`[Polymarket WS] Unsubscribed from ${channel}`);
    }
  }

  /**
   * Send subscription message
   */
  private async subscribe(subscription: WSSubscription): Promise<void> {
    await this.send({
      type: "subscribe",
      channel: subscription.channel,
      data: subscription,
    });

    console.log(`[Polymarket WS] Subscribed to ${subscription.channel}`);
  }

  /**
   * Resubscribe to all channels (after reconnection)
   */
  private async resubscribeAll(): Promise<void> {
    console.log(
      `[Polymarket WS] Resubscribing to ${this.subscriptions.size} channels`
    );

    for (const subscription of this.subscriptions.values()) {
      await this.subscribe(subscription);
    }
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  /**
   * Send message to WebSocket
   */
  private async send(message: WSMessage): Promise<void> {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new PolymarketWSError("WebSocket is not connected");
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: WSMessage = JSON.parse(data.toString());

      switch (message.type) {
        case "update":
          this.handleUpdate(message);
          break;

        case "error":
          this.handleErrorMessage(message);
          break;

        case "pong":
          // Heartbeat response - do nothing
          break;

        default:
          console.log("[Polymarket WS] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[Polymarket WS] Failed to parse message:", error);
      this.notifyError(new PolymarketWSError("Failed to parse message"));
    }
  }

  /**
   * Handle update messages
   */
  private handleUpdate(message: WSMessage): void {
    if (!message.data) return;

    const data = message.data;

    // Handle trade updates
    if (data.type === "trade" && data.trade) {
      const tradeUpdate: WSTradeUpdate = data;
      this.notifyTradeHandlers(tradeUpdate);
    }

    // Handle market updates
    else if (data.type === "market_update") {
      const marketUpdate: WSMarketUpdate = data;
      this.notifyMarketUpdateHandlers(marketUpdate);
    }
  }

  /**
   * Handle error messages
   */
  private handleErrorMessage(message: WSMessage): void {
    const error = new PolymarketWSError(message.error || "Unknown error");
    console.error("[Polymarket WS] Server error:", message.error);
    this.notifyError(error);
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Add error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Add connect handler
   */
  onConnect(handler: ConnectionHandler): void {
    this.connectHandlers.push(handler);
  }

  /**
   * Add disconnect handler
   */
  onDisconnect(handler: ConnectionHandler): void {
    this.disconnectHandlers.push(handler);
  }

  /**
   * Notify trade handlers
   */
  private notifyTradeHandlers(update: WSTradeUpdate): void {
    const channel = `trades:${update.market_id}`;
    const handlers = this.tradeHandlers.get(channel) || [];

    handlers.forEach((handler) => {
      try {
        handler(update.trade);
      } catch (error) {
        console.error("[Polymarket WS] Trade handler error:", error);
      }
    });

    // Also notify wallet-specific handlers
    const walletChannel = `wallet:${update.trade.maker_address}`;
    const walletHandlers = this.tradeHandlers.get(walletChannel) || [];

    walletHandlers.forEach((handler) => {
      try {
        handler(update.trade);
      } catch (error) {
        console.error("[Polymarket WS] Wallet handler error:", error);
      }
    });
  }

  /**
   * Notify market update handlers
   */
  private notifyMarketUpdateHandlers(update: WSMarketUpdate): void {
    const channel = `market:${update.market_id}`;
    const handlers = this.marketUpdateHandlers.get(channel) || [];

    handlers.forEach((handler) => {
      try {
        handler(update);
      } catch (error) {
        console.error("[Polymarket WS] Market update handler error:", error);
      }
    });
  }

  /**
   * Notify error handlers
   */
  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        console.error("[Polymarket WS] Error handler failed:", err);
      }
    });
  }

  /**
   * Notify connect handlers
   */
  private notifyConnect(): void {
    this.connectHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error("[Polymarket WS] Connect handler error:", error);
      }
    });
  }

  /**
   * Notify disconnect handlers
   */
  private notifyDisconnect(): void {
    this.disconnectHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error("[Polymarket WS] Disconnect handler error:", error);
      }
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED" {
    if (!this.ws) return "CLOSED";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "CONNECTING";
      case WebSocket.OPEN:
        return "OPEN";
      case WebSocket.CLOSING:
        return "CLOSING";
      case WebSocket.CLOSED:
        return "CLOSED";
      default:
        return "CLOSED";
    }
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Export singleton instance
export const polymarketWSClient = new PolymarketWSClient();
