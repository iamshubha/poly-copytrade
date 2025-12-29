/**
 * Type declarations for Backend API Integration Module
 * Provides enhanced IDE support and type checking
 */

import { EventEmitter } from "events";
import {
  Trade,
  Market,
  MarketStats,
  LeaderWallet,
  WalletStats,
  WalletPosition,
  TradeFilter,
  MarketFilter,
  PolymarketConfig,
} from "./polymarket/types";

declare module "./backend-api-integration" {
  // Configuration types
  export interface BackendAPIConfig extends Partial<PolymarketConfig> {
    useWebSocket?: boolean;
    pollingInterval?: number;
    leaderDetection?: {
      enabled: boolean;
      minVolume?: number;
      minTrades?: number;
      minWinRate?: number;
      updateInterval?: number;
    };
    autoReconnect?: boolean;
  }

  export interface TradeSubscription {
    id: string;
    marketId?: string;
    walletAddress?: string;
    active: boolean;
    type: "websocket" | "polling";
  }

  export interface MarketStatsCache {
    marketId: string;
    stats: MarketStats;
    lastUpdated: number;
    ttl: number;
  }

  export interface APIStatus {
    initialized: boolean;
    connected: boolean;
    useWebSocket: boolean;
    subscriptions: TradeSubscription[];
    leaderDetectionEnabled: boolean;
    monitoredLeaders: number;
  }

  // Event handler types
  export type TradeEventHandler = (trade: Trade) => void | Promise<void>;
  export type TradeMarketEventHandler = (
    marketId: string,
    trade: Trade
  ) => void | Promise<void>;
  export type TradeWalletEventHandler = (
    walletAddress: string,
    trade: Trade
  ) => void | Promise<void>;
  export type LeaderTradeEventHandler = (
    leader: LeaderWallet,
    trade: Trade
  ) => void | Promise<void>;
  export type MarketUpdateEventHandler = (
    marketId: string,
    market: Market
  ) => void | Promise<void>;
  export type MarketStatsEventHandler = (
    marketId: string,
    stats: MarketStats
  ) => void | Promise<void>;
  export type LeaderDetectedEventHandler = (
    wallet: LeaderWallet
  ) => void | Promise<void>;
  export type ConnectionEventHandler = () => void | Promise<void>;
  export type ErrorEventHandler = (error: Error) => void | Promise<void>;

  // Main class
  export class BackendAPIIntegration extends EventEmitter {
    constructor(config?: BackendAPIConfig);

    // Initialization
    initialize(): Promise<void>;
    disconnect(): Promise<void>;
    getStatus(): APIStatus;

    // Trade subscriptions
    subscribeToMarketTrades(
      marketId: string,
      options?: { useWebSocket?: boolean }
    ): Promise<string>;

    subscribeToWalletTrades(
      walletAddress: string,
      options?: { useWebSocket?: boolean }
    ): Promise<string>;

    subscribeToAllTrades(options?: { useWebSocket?: boolean }): Promise<string>;

    unsubscribe(subscriptionId: string): Promise<void>;
    getActiveSubscriptions(): TradeSubscription[];

    // Market stats
    fetchMarketStats(
      marketId: string,
      useCache?: boolean
    ): Promise<MarketStats>;
    fetchMultipleMarketStats(
      marketIds: string[],
      useCache?: boolean
    ): Promise<Map<string, MarketStats>>;
    fetchMarket(marketId: string, useCache?: boolean): Promise<Market>;
    searchMarkets(filter?: MarketFilter): Promise<Market[]>;
    getTrendingMarkets(limit?: number): Promise<Market[]>;

    // Leader detection
    detectLeaderWallets(): Promise<LeaderWallet[]>;
    isLeaderWallet(walletAddress: string): Promise<boolean>;
    getLeaderWalletDetails(walletAddress: string): Promise<LeaderWallet | null>;
    monitorLeaderWallet(walletAddress: string): Promise<void>;
    getMonitoredLeaders(): string[];

    // Wallet stats
    fetchWalletStats(walletAddress: string): Promise<WalletStats>;
    fetchWalletPositions(walletAddress: string): Promise<WalletPosition[]>;

    // Utilities
    clearCache(): void;

    // Event emitter overrides for type safety
    on(event: "trade", listener: TradeEventHandler): this;
    on(event: "trade:market", listener: TradeMarketEventHandler): this;
    on(event: "trade:wallet", listener: TradeWalletEventHandler): this;
    on(event: "trade:leader", listener: LeaderTradeEventHandler): this;
    on(event: "market:update", listener: MarketUpdateEventHandler): this;
    on(event: "market:stats", listener: MarketStatsEventHandler): this;
    on(event: "leader:detected", listener: LeaderDetectedEventHandler): this;
    on(event: "leader:trade", listener: LeaderTradeEventHandler): this;
    on(event: "connected", listener: ConnectionEventHandler): this;
    on(event: "disconnected", listener: ConnectionEventHandler): this;
    on(event: "error", listener: ErrorEventHandler): this;
    on(event: "reconnecting", listener: (attempt: number) => void): this;

    once(event: "trade", listener: TradeEventHandler): this;
    once(event: "trade:market", listener: TradeMarketEventHandler): this;
    once(event: "trade:wallet", listener: TradeWalletEventHandler): this;
    once(event: "trade:leader", listener: LeaderTradeEventHandler): this;
    once(event: "market:update", listener: MarketUpdateEventHandler): this;
    once(event: "market:stats", listener: MarketStatsEventHandler): this;
    once(event: "leader:detected", listener: LeaderDetectedEventHandler): this;
    once(event: "leader:trade", listener: LeaderTradeEventHandler): this;
    once(event: "connected", listener: ConnectionEventHandler): this;
    once(event: "disconnected", listener: ConnectionEventHandler): this;
    once(event: "error", listener: ErrorEventHandler): this;

    off(event: "trade", listener: TradeEventHandler): this;
    off(event: "trade:market", listener: TradeMarketEventHandler): this;
    off(event: "trade:wallet", listener: TradeWalletEventHandler): this;
    off(event: "trade:leader", listener: LeaderTradeEventHandler): this;
    off(event: "market:update", listener: MarketUpdateEventHandler): this;
    off(event: "market:stats", listener: MarketStatsEventHandler): this;
    off(event: "leader:detected", listener: LeaderDetectedEventHandler): this;
    off(event: "leader:trade", listener: LeaderTradeEventHandler): this;
    off(event: "connected", listener: ConnectionEventHandler): this;
    off(event: "disconnected", listener: ConnectionEventHandler): this;
    off(event: "error", listener: ErrorEventHandler): this;

    emit(event: "trade", trade: Trade): boolean;
    emit(event: "trade:market", marketId: string, trade: Trade): boolean;
    emit(event: "trade:wallet", walletAddress: string, trade: Trade): boolean;
    emit(event: "trade:leader", leader: LeaderWallet, trade: Trade): boolean;
    emit(event: "market:update", marketId: string, market: Market): boolean;
    emit(event: "market:stats", marketId: string, stats: MarketStats): boolean;
    emit(event: "leader:detected", wallet: LeaderWallet): boolean;
    emit(event: "leader:trade", wallet: LeaderWallet, trade: Trade): boolean;
    emit(event: "connected"): boolean;
    emit(event: "disconnected"): boolean;
    emit(event: "error", error: Error): boolean;
    emit(event: "reconnecting", attempt: number): boolean;
  }

  // Factory functions
  export function getBackendAPI(
    config?: BackendAPIConfig
  ): BackendAPIIntegration;
  export function createBackendAPI(
    config?: BackendAPIConfig
  ): BackendAPIIntegration;

  // Default export
  const defaultExport: typeof getBackendAPI;
  export default defaultExport;
}

// Augment global types if needed
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POLYMARKET_API_URL?: string;
      POLYMARKET_WS_URL?: string;
      POLYMARKET_API_KEY?: string;
    }
  }
}
