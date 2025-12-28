/**
 * Leader Wallet Detector
 * Monitors and detects trades from leader wallets
 */

import { polymarketClient } from "./rest-client";
import { polymarketWSClient } from "./ws-client";
import { Trade, LeaderWallet, WalletStats, WalletFilter } from "./types";
import prisma from "../prisma";

export interface LeaderDetectionConfig {
  minVolume?: number;
  minTrades?: number;
  minWinRate?: number;
  checkInterval?: number; // ms
  enableWebSocket?: boolean;
}

export type LeaderTradeCallback = (
  wallet: LeaderWallet,
  trade: Trade
) => void | Promise<void>;

export class LeaderWalletDetector {
  private config: LeaderDetectionConfig;
  private leaderWallets: Map<string, LeaderWallet> = new Map();
  private monitoredWallets: Set<string> = new Set();
  private callbacks: LeaderTradeCallback[] = [];
  private pollInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor(config: Partial<LeaderDetectionConfig> = {}) {
    this.config = {
      minVolume: config.minVolume || 100000, // $100k
      minTrades: config.minTrades || 100,
      minWinRate: config.minWinRate || 0.55, // 55%
      checkInterval: config.checkInterval || 60000, // 1 minute
      enableWebSocket: config.enableWebSocket ?? true,
    };
  }

  // ============================================
  // LEADER WALLET DISCOVERY
  // ============================================

  /**
   * Fetch and cache leader wallets
   */
  async discoverLeaderWallets(): Promise<LeaderWallet[]> {
    try {
      console.log("[Leader Detector] Discovering leader wallets...");

      const filter: WalletFilter = {
        min_volume: this.config.minVolume,
        min_trades: this.config.minTrades,
        min_win_rate: this.config.minWinRate,
        limit: 100,
      };

      const leaders = await polymarketClient.getLeaderWallets(filter);

      // Cache leaders
      leaders.forEach((leader) => {
        this.leaderWallets.set(leader.address, leader);
      });

      console.log(`[Leader Detector] Found ${leaders.length} leader wallets`);

      // Save to database
      await this.saveLeadersToDB(leaders);

      return leaders;
    } catch (error) {
      console.error("[Leader Detector] Error discovering leaders:", error);
      return [];
    }
  }

  /**
   * Check if wallet meets leader criteria
   */
  async isLeaderWallet(walletAddress: string): Promise<boolean> {
    // Check cache first
    if (this.leaderWallets.has(walletAddress)) {
      return true;
    }

    // Check via API
    try {
      const stats = await polymarketClient.getWalletStats(walletAddress);

      const isLeader =
        stats.total_volume >= this.config.minVolume! &&
        stats.total_trades >= this.config.minTrades! &&
        stats.win_rate >= this.config.minWinRate!;

      if (isLeader) {
        // Cache as leader
        const leader: LeaderWallet = {
          address: walletAddress,
          stats,
          recent_trades: [],
          active_positions: [],
        };
        this.leaderWallets.set(walletAddress, leader);
      }

      return isLeader;
    } catch (error) {
      console.error("[Leader Detector] Error checking wallet:", error);
      return false;
    }
  }

  /**
   * Add wallet to monitoring list
   */
  async addWalletToMonitor(walletAddress: string): Promise<void> {
    if (this.monitoredWallets.has(walletAddress)) {
      console.log(`[Leader Detector] Already monitoring ${walletAddress}`);
      return;
    }

    // Verify it's a leader
    const isLeader = await this.isLeaderWallet(walletAddress);
    if (!isLeader) {
      console.log(`[Leader Detector] ${walletAddress} is not a leader wallet`);
      return;
    }

    this.monitoredWallets.add(walletAddress);
    console.log(`[Leader Detector] Now monitoring ${walletAddress}`);

    // Subscribe to WebSocket if enabled
    if (this.config.enableWebSocket && polymarketWSClient.isConnected()) {
      await polymarketWSClient.subscribeToWalletTrades(
        walletAddress,
        async (trade) => {
          await this.handleLeaderTrade(walletAddress, trade);
        }
      );
    }
  }

  /**
   * Remove wallet from monitoring
   */
  async removeWalletFromMonitor(walletAddress: string): Promise<void> {
    this.monitoredWallets.delete(walletAddress);

    // Unsubscribe from WebSocket
    if (this.config.enableWebSocket) {
      await polymarketWSClient.unsubscribe(`wallet:${walletAddress}`);
    }

    console.log(`[Leader Detector] Stopped monitoring ${walletAddress}`);
  }

  // ============================================
  // TRADE DETECTION
  // ============================================

  /**
   * Start monitoring for leader trades
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log("[Leader Detector] Already monitoring");
      return;
    }

    this.isMonitoring = true;
    console.log("[Leader Detector] Starting monitoring...");

    // Discover leaders first
    await this.discoverLeaderWallets();

    // Get followed wallets from database
    const follows = await prisma.follow.findMany({
      where: { active: true },
      include: { trader: true },
    });

    // Add followed wallets to monitoring
    for (const follow of follows) {
      await this.addWalletToMonitor(follow.traderId);
    }

    // Start WebSocket monitoring if enabled
    if (this.config.enableWebSocket) {
      await this.startWebSocketMonitoring();
    }

    // Start polling as fallback
    this.startPolling();

    console.log(
      `[Leader Detector] Monitoring ${this.monitoredWallets.size} wallets`
    );
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    console.log("[Leader Detector] Stopped monitoring");
  }

  /**
   * Start WebSocket monitoring
   */
  private async startWebSocketMonitoring(): Promise<void> {
    try {
      if (!polymarketWSClient.isConnected()) {
        await polymarketWSClient.connect();
      }

      // Subscribe to all monitored wallets
      for (const walletAddress of this.monitoredWallets) {
        await polymarketWSClient.subscribeToWalletTrades(
          walletAddress,
          async (trade) => {
            await this.handleLeaderTrade(walletAddress, trade);
          }
        );
      }

      console.log("[Leader Detector] WebSocket monitoring active");
    } catch (error) {
      console.error("[Leader Detector] WebSocket setup failed:", error);
      console.log("[Leader Detector] Falling back to polling only");
    }
  }

  /**
   * Start polling for trades (fallback)
   */
  private startPolling(): void {
    this.pollInterval = setInterval(async () => {
      await this.pollLeaderTrades();
    }, this.config.checkInterval);
  }

  /**
   * Poll for new trades from leader wallets
   */
  private async pollLeaderTrades(): Promise<void> {
    try {
      for (const walletAddress of this.monitoredWallets) {
        // Fetch recent trades
        const trades = await polymarketClient.getWalletTrades(
          walletAddress,
          10
        );

        // Process new trades
        for (const trade of trades) {
          await this.handleLeaderTrade(walletAddress, trade);
        }
      }
    } catch (error) {
      console.error("[Leader Detector] Polling error:", error);
    }
  }

  /**
   * Handle detected leader trade
   */
  private async handleLeaderTrade(
    walletAddress: string,
    trade: Trade
  ): Promise<void> {
    console.log(`[Leader Detector] Detected trade from ${walletAddress}:`, {
      market: trade.market,
      side: trade.side,
      size: trade.size,
      price: trade.price,
    });

    // Get leader info
    const leader = this.leaderWallets.get(walletAddress);
    if (!leader) {
      console.log("[Leader Detector] Leader info not cached, fetching...");
      return;
    }

    // Check if trade already processed
    const existingTrade = await prisma.trade.findUnique({
      where: { id: trade.id },
    });

    if (existingTrade) {
      return; // Already processed
    }

    // Save trade to database
    await this.saveLeaderTradeToDB(walletAddress, trade);

    // Notify callbacks
    await this.notifyCallbacks(leader, trade);
  }

  // ============================================
  // CALLBACKS
  // ============================================

  /**
   * Register callback for leader trades
   */
  onLeaderTrade(callback: LeaderTradeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Notify all callbacks
   */
  private async notifyCallbacks(
    leader: LeaderWallet,
    trade: Trade
  ): Promise<void> {
    for (const callback of this.callbacks) {
      try {
        await callback(leader, trade);
      } catch (error) {
        console.error("[Leader Detector] Callback error:", error);
      }
    }
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  /**
   * Save leaders to database
   */
  private async saveLeadersToDB(leaders: LeaderWallet[]): Promise<void> {
    for (const leader of leaders) {
      try {
        await prisma.user.upsert({
          where: { address: leader.address },
          update: {
            updatedAt: new Date(),
          },
          create: {
            address: leader.address,
          },
        });
      } catch (error) {
        console.error("[Leader Detector] Error saving leader:", error);
      }
    }
  }

  /**
   * Save leader trade to database
   */
  private async saveLeaderTradeToDB(
    walletAddress: string,
    trade: Trade
  ): Promise<void> {
    try {
      // Ensure user exists
      await prisma.user.upsert({
        where: { address: walletAddress },
        update: {},
        create: { address: walletAddress },
      });

      // Save trade
      await prisma.trade.create({
        data: {
          id: trade.id,
          userId: walletAddress,
          marketId: trade.market,
          outcomeIndex: 0, // Would need to map asset_id to outcome
          side: trade.side,
          amount: parseFloat(trade.size),
          price: parseFloat(trade.price),
          status: "EXECUTED",
          executedAt: new Date(trade.timestamp),
        },
      });

      console.log(`[Leader Detector] Saved trade ${trade.id} to database`);
    } catch (error) {
      console.error("[Leader Detector] Error saving trade:", error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get all monitored wallets
   */
  getMonitoredWallets(): string[] {
    return Array.from(this.monitoredWallets);
  }

  /**
   * Get cached leader wallets
   */
  getLeaderWallets(): LeaderWallet[] {
    return Array.from(this.leaderWallets.values());
  }

  /**
   * Get leader wallet by address
   */
  getLeader(walletAddress: string): LeaderWallet | undefined {
    return this.leaderWallets.get(walletAddress);
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    isMonitoring: boolean;
    leaderCount: number;
    monitoredCount: number;
    wsConnected: boolean;
  } {
    return {
      isMonitoring: this.isMonitoring,
      leaderCount: this.leaderWallets.size,
      monitoredCount: this.monitoredWallets.size,
      wsConnected: polymarketWSClient.isConnected(),
    };
  }
}

// Export singleton instance
export const leaderDetector = new LeaderWalletDetector();
