/**
 * Polymarket API Types
 * Complete type definitions for Polymarket API responses
 */

export interface PolymarketConfig {
  apiUrl: string;
  wsUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Market Types
export interface Market {
  condition_id: string;
  question: string;
  description?: string;
  market_slug: string;
  end_date_iso: string;
  game_start_time?: string;
  volume: string;
  liquidity?: string;
  outcomes: string[];
  outcomePrices?: string[];
  tokens?: MarketToken[];
  category?: string;
  image?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  tags?: string[];
  creator?: string;
  minimum_order_size?: string;
  minimum_tick_size?: string;
}

export interface MarketToken {
  token_id: string;
  outcome: string;
  price: string;
  winner?: boolean;
}

export interface MarketStats {
  market_id: string;
  volume_24h: number;
  volume_total: number;
  liquidity: number;
  price_change_24h: number;
  trades_count_24h: number;
  unique_traders_24h: number;
  last_trade_time?: string;
}

// Order/Trade Types
export interface Order {
  id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  size_matched?: string;
  status: "LIVE" | "MATCHED" | "CANCELLED" | "EXPIRED";
  created_at: string;
  updated_at?: string;
  maker_address: string;
  taker_address?: string;
  type: "GTC" | "FOK" | "GTD";
  expiration?: string;
}

export interface Trade {
  id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  timestamp: string;
  maker_address: string;
  taker_address: string;
  transaction_hash?: string;
  fee_rate_bps?: number;
  status: "MATCHED" | "SETTLED";
}

export interface TradeEvent {
  event_type: "trade" | "order" | "cancel";
  market_id: string;
  trade?: Trade;
  order?: Order;
  timestamp: string;
}

// Wallet/Position Types
export interface WalletPosition {
  wallet_address: string;
  market_id: string;
  outcome_index: number;
  size: string;
  average_entry_price: string;
  current_price: string;
  unrealized_pnl: string;
  realized_pnl: string;
  last_updated: string;
}

export interface WalletStats {
  wallet_address: string;
  total_volume: number;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  active_positions: number;
  markets_traded: number;
  last_trade_time: string;
  reputation_score?: number;
}

export interface LeaderWallet {
  address: string;
  stats: WalletStats;
  recent_trades: Trade[];
  active_positions: WalletPosition[];
  is_verified?: boolean;
  rank?: number;
}

// WebSocket Types
export interface WSMessage {
  type: "subscribe" | "unsubscribe" | "update" | "error" | "ping" | "pong";
  channel?: string;
  data?: any;
  error?: string;
  timestamp?: string;
}

export interface WSSubscription {
  channel: string;
  market_id?: string;
  wallet_address?: string;
  event_types?: string[];
}

export type WSEventType =
  | "market_update"
  | "trade"
  | "order_placed"
  | "order_cancelled"
  | "order_matched"
  | "price_change";

export interface WSTradeUpdate {
  type: "trade";
  market_id: string;
  trade: Trade;
  price_impact?: number;
  volume_impact?: number;
}

export interface WSMarketUpdate {
  type: "market_update";
  market_id: string;
  prices: number[];
  volume: number;
  liquidity?: number;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  has_more: boolean;
  total?: number;
}

// Filter/Query Types
export interface MarketFilter {
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  category?: string;
  tags?: string[];
  min_volume?: number;
  min_liquidity?: number;
  limit?: number;
  offset?: number;
  order_by?: "volume" | "liquidity" | "end_date" | "created_at";
  order_dir?: "asc" | "desc";
}

export interface TradeFilter {
  market_id?: string;
  wallet_address?: string;
  side?: "BUY" | "SELL";
  start_time?: string;
  end_time?: string;
  min_size?: string;
  limit?: number;
  offset?: number;
}

export interface WalletFilter {
  min_volume?: number;
  min_trades?: number;
  min_win_rate?: number;
  markets?: string[];
  active_only?: boolean;
  limit?: number;
  offset?: number;
}

// Event Handler Types
export type TradeHandler = (trade: Trade) => void | Promise<void>;
export type MarketUpdateHandler = (
  update: WSMarketUpdate
) => void | Promise<void>;
export type ErrorHandler = (error: Error) => void | Promise<void>;
export type ConnectionHandler = () => void | Promise<void>;

// Error Types
export class PolymarketAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "PolymarketAPIError";
  }
}

export class PolymarketWSError extends Error {
  constructor(
    message: string,
    public code?: string,
    public reconnectable: boolean = true
  ) {
    super(message);
    this.name = "PolymarketWSError";
  }
}
