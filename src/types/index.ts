// Type definitions for the application

export interface User {
  id: string;
  address: string;
  nonce?: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  id: string;
  userId: string;
  maxCopyPercentage: number;
  minTradeAmount: number;
  maxTradeAmount?: number;
  maxDailyLoss?: number;
  maxOpenPositions: number;
  autoCopyEnabled: boolean;
  copyDelay: number;
  slippageTolerance: number;
  emailNotifications: boolean;
  tradeNotifications: boolean;
}

export interface Trade {
  id: string;
  userId: string;
  marketId: string;
  marketTitle: string;
  outcomeIndex: number;
  outcomeName: string;
  side: "BUY" | "SELL";
  amount: number;
  shares: number;
  price: number;
  fee: number;
  transactionHash?: string;
  blockNumber?: number;
  status: TradeStatus;
  error?: string;
  createdAt: Date;
  executedAt?: Date;
}

export type TradeStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface CopiedTrade extends Trade {
  originalTradeId: string;
  copierId: string;
  copyPercentage: number;
  delayMs: number;
}

export interface Market {
  id: string;
  title: string;
  description?: string;
  category?: string;
  endDate?: Date;
  volume: number;
  liquidity: number;
  outcomes: string[];
  outcomesPrices: number[];
  active: boolean;
  resolved: boolean;
  winningOutcome?: number;
  imageUrl?: string;
  tags: string[];
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  copySettings?: FollowCopySettings;
}

export interface FollowCopySettings {
  id: string;
  followId: string;
  enabled: boolean;
  copyPercentage: number;
  minTradeSize?: number;
  maxTradeSize?: number;
  onlyMarkets: string[];
  excludeMarkets: string[];
  onlyOutcomes: string[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export type NotificationType =
  | "TRADE_EXECUTED"
  | "TRADE_FAILED"
  | "NEW_FOLLOWER"
  | "TRADER_TRADE"
  | "SYSTEM_ALERT"
  | "RISK_WARNING";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TradeRequest {
  marketId: string;
  outcomeIndex: number;
  side: "BUY" | "SELL";
  amount: number;
}

export interface CopyTradeRequest extends TradeRequest {
  originalTradeId: string;
  copyPercentage: number;
}

// Polymarket API Types
export interface PolymarketOrder {
  id: string;
  market: string;
  asset_id: string;
  maker: string;
  side: "BUY" | "SELL";
  price: string;
  size: string;
  timestamp: number;
}

export interface PolymarketMarket {
  id: string;
  condition_id?: string;
  question: string;
  description: string;
  outcomes: string[];
  outcomePrices?: number[];
  outcome_prices?: number[];
  end_date_iso: string;
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  accepting_orders?: boolean;
  market_slug?: string;
  slug?: string;
  tags?: string[];
  image?: string;
  icon?: string;
}

export interface WebSocketMessage {
  type: "TRADE" | "ORDER" | "MARKET_UPDATE" | "SYSTEM";
  data: any;
  timestamp: number;
}

// Session types for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      address: string;
    };
  }

  interface User {
    id: string;
    address: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    address: string;
  }
}
