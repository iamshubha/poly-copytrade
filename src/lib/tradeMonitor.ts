/**
 * Trade Monitor Service
 *
 * Monitors leader wallets and processes copy trades
 */

import { EventEmitter } from "events";
import PolymarketClient, {
  Trade,
  LeaderWallet,
  TradeFilter,
} from "./polymarketClient";
import prisma from "./prisma";
import { CopyTradingEngine } from "./copyEngine";

export interface MonitorConfig {
  pollInterval?: number;
  minTradeAmount?: number;
  maxConcurrentMonitors?: number;
  enableWebSocket?: boolean;
}

export interface MonitoredWallet {
  address: string;
  nickname?: string;
  minCopyAmount?: number;
  maxCopyAmount?: number;
  isActive: boolean;
}

export class TradeMonitorService extends EventEmitter {
  private client: PolymarketClient;
  private copyEngine: CopyTradingEngine;
  private config: Required<MonitorConfig>;
  private monitoredWallets = new Map<string, MonitoredWallet>();
  private activeMonitors = new Map<string, () => void>();
  private isRunning = false;

  constructor(
    client: PolymarketClient,
    copyEngine: CopyTradingEngine,
    config: MonitorConfig = {}
  ) {
    super();

    this.client = client;
    this.copyEngine = copyEngine;
    this.config = {
      pollInterval: config.pollInterval || 5000,
      minTradeAmount: config.minTradeAmount || 10,
      maxConcurrentMonitors: config.maxConcurrentMonitors || 50,
      enableWebSocket: config.enableWebSocket !== false,
    };
  }

  /**
   * Start monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️  Monitor service already running");
      return;
    }

    console.log("🚀 Starting trade monitor service...");
    this.isRunning = true;

    // Connect WebSocket if enabled
    if (this.config.enableWebSocket) {
      try {
        await this.client.connectWebSocket();
        console.log("✅ WebSocket connected");
      } catch (error) {
        console.error("⚠️  WebSocket connection failed, using polling only");
      }
    }

    // Load monitored wallets from database
    await this.loadMonitoredWallets();

    // Start monitoring
    this.startMonitoring();

    console.log(`✅ Monitoring ${this.monitoredWallets.size} wallets`);
    this.emit("started");
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log("🛑 Stopping trade monitor service...");
    this.isRunning = false;

    // Stop all active monitors
    this.activeMonitors.forEach((cleanup) => cleanup());
    this.activeMonitors.clear();

    // Disconnect WebSocket
    this.client.disconnectWebSocket();

    console.log("✅ Monitor service stopped");
    this.emit("stopped");
  }

  /**
   * Add wallet to monitoring list
   */
  async addWallet(wallet: MonitoredWallet): Promise<void> {
    if (this.monitoredWallets.size >= this.config.maxConcurrentMonitors) {
      throw new Error("Max concurrent monitors reached");
    }

    this.monitoredWallets.set(wallet.address, wallet);

    if (this.isRunning && wallet.isActive) {
      await this.startMonitoringWallet(wallet.address);
    }

    console.log(`➕ Added wallet to monitoring: ${wallet.address}`);
    this.emit("walletAdded", wallet);
  }

  /**
   * Remove wallet from monitoring
   */
  removeWallet(address: string): void {
    const cleanup = this.activeMonitors.get(address);
    if (cleanup) {
      cleanup();
      this.activeMonitors.delete(address);
    }

    this.monitoredWallets.delete(address);
    console.log(`➖ Removed wallet from monitoring: ${address}`);
    this.emit("walletRemoved", address);
  }

  /**
   * Get monitored wallets
   */
  getMonitoredWallets(): MonitoredWallet[] {
    return Array.from(this.monitoredWallets.values());
  }

  /**
   * Detect and add top leader wallets
   */
  async addTopLeaders(count = 10, minVolume = 10000): Promise<LeaderWallet[]> {
    console.log("🔍 Detecting top leader wallets...");

    const leaders = await this.client.detectLeaderWallets(minVolume, 50);
    const topLeaders = leaders.slice(0, count);

    for (const leader of topLeaders) {
      if (!this.monitoredWallets.has(leader.address)) {
        await this.addWallet({
          address: leader.address,
          nickname: `Leader (ROI: ${leader.roi.toFixed(1)}%)`,
          isActive: true,
        });
      }
    }

    console.log(`✅ Added ${topLeaders.length} leader wallets`);
    return topLeaders;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async loadMonitoredWallets(): Promise<void> {
    try {
      // Load from database - get all follow relationships
      const follows = await prisma.follow.findMany({
        where: { isActive: true },
        include: {
          following: true,
        },
      });

      for (const follow of follows) {
        if (!this.monitoredWallets.has(follow.followingAddress)) {
          this.monitoredWallets.set(follow.followingAddress, {
            address: follow.followingAddress,
            isActive: true,
          });
        }
      }

      console.log(
        `📥 Loaded ${this.monitoredWallets.size} wallets from database`
      );
    } catch (error) {
      console.error("Error loading monitored wallets:", error);
    }
  }

  private startMonitoring(): void {
    this.monitoredWallets.forEach((wallet, address) => {
      if (wallet.isActive) {
        this.startMonitoringWallet(address);
      }
    });
  }

  private async startMonitoringWallet(address: string): Promise<void> {
    if (this.activeMonitors.has(address)) {
      return; // Already monitoring
    }

    console.log(`👀 Started monitoring: ${address}`);

    const cleanup = await this.client.monitorWalletTrades(
      address,
      (trade) => this.handleLeaderTrade(address, trade),
      this.config.pollInterval
    );

    this.activeMonitors.set(address, cleanup);
  }

  private async handleLeaderTrade(
    leaderAddress: string,
    trade: Trade
  ): Promise<void> {
    console.log(`🔔 New trade from leader ${leaderAddress}:`, {
      market: trade.marketId,
      side: trade.side,
      amount: trade.amount,
    });

    // Filter by minimum amount
    if (trade.amount < this.config.minTradeAmount) {
      console.log(`⚠️  Trade below minimum amount, skipping`);
      return;
    }

    try {
      // Save trade to database
      await prisma.trade.create({
        data: {
          id: trade.id,
          userId: leaderAddress,
          marketId: trade.marketId,
          outcomeIndex: trade.outcome,
          side: trade.side,
          price: trade.price,
          amount: trade.amount,
          shares: trade.size,
          status: "COMPLETED",
          transactionHash: trade.transactionHash,
          createdAt: trade.timestamp,
        },
      });

      // Trigger copy trades for followers
      await this.copyEngine.triggerCopyTrades(leaderAddress, trade);

      this.emit("leaderTrade", { leaderAddress, trade });
    } catch (error) {
      console.error(`Error processing leader trade:`, error);
      this.emit("error", { leaderAddress, trade, error });
    }
  }
}

export default TradeMonitorService;
