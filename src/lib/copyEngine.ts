import prisma from "./prisma";
import { polymarketClient } from "./polymarket";
import { Trade, CopiedTrade, TradeRequest, CopyTradeRequest } from "@/types";
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

// Initialize Redis connection for BullMQ (requires maxRetriesPerRequest: null)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Create queue for copy trades
const copyTradeQueue = new Queue("copy-trades", { connection: redis });

export class CopyTradingEngine {
  // Process a new trade from a trader
  async processTrade(
    userId: string,
    tradeRequest: TradeRequest
  ): Promise<Trade> {
    try {
      // Validate trade
      const validation = polymarketClient.validateTrade({
        amount: tradeRequest.amount,
        price: 0.5, // Will be updated with actual price
      });

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get user settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { settings: true },
      });

      if (!user?.settings) {
        throw new Error("User settings not found");
      }

      // Check risk limits
      await this.checkRiskLimits(userId, tradeRequest.amount);

      // Get current market price
      const prices = await polymarketClient.getMarketPrices(
        tradeRequest.marketId
      );
      const price = tradeRequest.outcomeIndex === 0 ? prices.yes : prices.no;

      // Calculate shares
      const shares = polymarketClient.calculateShares(
        tradeRequest.amount,
        price
      );

      // Create trade record
      const market = await prisma.market.findUnique({
        where: { id: tradeRequest.marketId },
      });

      const trade = await prisma.trade.create({
        data: {
          userId,
          marketId: tradeRequest.marketId,
          marketTitle: market?.title || "Unknown Market",
          outcomeIndex: tradeRequest.outcomeIndex,
          outcomeName: tradeRequest.outcomeIndex === 0 ? "Yes" : "No",
          side: tradeRequest.side,
          amount: tradeRequest.amount,
          shares,
          price,
          fee: 0,
          status: "PENDING",
        },
      });

      // Execute trade on Polymarket (assert side type for TypeScript)
      await this.executeTrade({
        ...trade,
        side: trade.side as "BUY" | "SELL",
        transactionHash: trade.transactionHash ?? undefined,
        blockNumber: trade.blockNumber ?? undefined,
        executedAt: trade.executedAt ?? undefined,
        error: trade.error ?? undefined,
      });

      // Trigger copy trades for followers (assert side type for TypeScript)
      await this.triggerCopyTrades({
        ...trade,
        side: trade.side as "BUY" | "SELL",
        transactionHash: trade.transactionHash ?? undefined,
        blockNumber: trade.blockNumber ?? undefined,
        executedAt: trade.executedAt ?? undefined,
        error: trade.error ?? undefined,
      });

      // Return trade with correct types
      return {
        ...trade,
        side: trade.side as "BUY" | "SELL",
        transactionHash: trade.transactionHash ?? undefined,
        blockNumber: trade.blockNumber ?? undefined,
        executedAt: trade.executedAt ?? undefined,
        error: trade.error ?? undefined,
      };
    } catch (error) {
      console.error("Error processing trade:", error);
      throw error;
    }
  }

  // Execute trade on Polymarket
  private async executeTrade(trade: Trade): Promise<void> {
    try {
      await prisma.trade.update({
        where: { id: trade.id },
        data: { status: "PROCESSING" },
      });

      // Execute on Polymarket
      const user = await prisma.user.findUnique({
        where: { id: trade.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      let result;
      if (trade.side === "BUY") {
        result = await polymarketClient.createBuyOrder({
          marketId: trade.marketId,
          outcomeIndex: trade.outcomeIndex,
          amount: trade.amount,
          price: trade.price,
          maker: user.address,
        });
      } else {
        result = await polymarketClient.createSellOrder({
          marketId: trade.marketId,
          outcomeIndex: trade.outcomeIndex,
          shares: trade.shares,
          price: trade.price,
          maker: user.address,
        });
      }

      // Update trade with result
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: "COMPLETED",
          executedAt: new Date(),
          transactionHash: result.id,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: trade.userId,
          type: "TRADE_EXECUTED",
          title: "Trade Executed",
          message: `Successfully ${trade.side} ${trade.shares.toFixed(
            2
          )} shares of ${trade.marketTitle}`,
          data: { tradeId: trade.id },
        },
      });
    } catch (error) {
      console.error("Error executing trade:", error);

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      await prisma.notification.create({
        data: {
          userId: trade.userId,
          type: "TRADE_FAILED",
          title: "Trade Failed",
          message: `Failed to ${trade.side} ${trade.shares.toFixed(2)} shares`,
          data: { tradeId: trade.id },
        },
      });

      throw error;
    }
  }

  // Trigger copy trades for all followers
  private async triggerCopyTrades(originalTrade: Trade): Promise<void> {
    try {
      // Get all followers with auto-copy enabled
      const followers = await prisma.follow.findMany({
        where: {
          followingId: originalTrade.userId,
          copySettings: {
            enabled: true,
          },
        },
        include: {
          follower: {
            include: { settings: true },
          },
          copySettings: true,
        },
      });

      // Queue copy trades for each follower
      for (const follow of followers) {
        if (
          !follow.copySettings ||
          !follow.follower.settings?.autoCopyEnabled
        ) {
          continue;
        }

        // Check if market is allowed
        if (
          !this.isMarketAllowed(originalTrade.marketId, follow.copySettings)
        ) {
          continue;
        }

        // Calculate copy amount
        const copyAmount = this.calculateCopyAmount(
          originalTrade.amount,
          follow.follower.settings,
          follow.copySettings
        );

        if (copyAmount < follow.follower.settings.minTradeAmount) {
          continue; // Skip if below minimum
        }

        // Add to queue
        await copyTradeQueue.add("copy-trade", {
          originalTradeId: originalTrade.id,
          followerId: follow.followerId,
          copyAmount,
          copySettings: follow.copySettings,
          delay: follow.follower.settings.copyDelay * 1000,
        });
      }
    } catch (error) {
      console.error("Error triggering copy trades:", error);
    }
  }

  // Process copy trade from queue
  async processCopyTrade(data: {
    originalTradeId: string;
    followerId: string;
    copyAmount: number;
    copySettings: any;
  }): Promise<CopiedTrade | null> {
    try {
      const originalTrade = await prisma.trade.findUnique({
        where: { id: data.originalTradeId },
      });

      if (!originalTrade || originalTrade.status !== "COMPLETED") {
        return null;
      }

      const follower = await prisma.user.findUnique({
        where: { id: data.followerId },
        include: { settings: true },
      });

      if (!follower?.settings) {
        return null;
      }

      // Check risk limits
      await this.checkRiskLimits(data.followerId, data.copyAmount);

      // Get current price
      const prices = await polymarketClient.getMarketPrices(
        originalTrade.marketId
      );
      const price = originalTrade.outcomeIndex === 0 ? prices.yes : prices.no;
      const shares = polymarketClient.calculateShares(data.copyAmount, price);

      // Create copied trade
      const copiedTrade = await prisma.copiedTrade.create({
        data: {
          originalTradeId: originalTrade.id,
          copierId: data.followerId,
          marketId: originalTrade.marketId,
          marketTitle: originalTrade.marketTitle,
          outcomeIndex: originalTrade.outcomeIndex,
          outcomeName: originalTrade.outcomeName,
          side: originalTrade.side,
          amount: data.copyAmount,
          shares,
          price,
          fee: 0,
          copyPercentage: (data.copyAmount / originalTrade.amount) * 100,
          delayMs: follower.settings.copyDelay * 1000,
          status: "PENDING",
        },
      });

      // Execute the copied trade (convert Prisma types to TypeScript types)
      await this.executeCopiedTrade({
        ...copiedTrade,
        userId: copiedTrade.copierId, // CopiedTrade extends Trade which requires userId
        side: copiedTrade.side as "BUY" | "SELL",
        transactionHash: copiedTrade.transactionHash ?? undefined,
        blockNumber: copiedTrade.blockNumber ?? undefined,
        executedAt: copiedTrade.executedAt ?? undefined,
        error: copiedTrade.error ?? undefined,
      });

      // Return with correct types
      return {
        ...copiedTrade,
        userId: copiedTrade.copierId,
        side: copiedTrade.side as "BUY" | "SELL",
        transactionHash: copiedTrade.transactionHash ?? undefined,
        blockNumber: copiedTrade.blockNumber ?? undefined,
        executedAt: copiedTrade.executedAt ?? undefined,
        error: copiedTrade.error ?? undefined,
      };
    } catch (error) {
      console.error("Error processing copy trade:", error);
      return null;
    }
  }

  // Execute copied trade
  private async executeCopiedTrade(trade: CopiedTrade): Promise<void> {
    try {
      await prisma.copiedTrade.update({
        where: { id: trade.id },
        data: { status: "PROCESSING" },
      });

      const user = await prisma.user.findUnique({
        where: { id: trade.copierId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      let result;
      if (trade.side === "BUY") {
        result = await polymarketClient.createBuyOrder({
          marketId: trade.marketId,
          outcomeIndex: trade.outcomeIndex,
          amount: trade.amount,
          price: trade.price,
          maker: user.address,
        });
      } else {
        result = await polymarketClient.createSellOrder({
          marketId: trade.marketId,
          outcomeIndex: trade.outcomeIndex,
          shares: trade.shares,
          price: trade.price,
          maker: user.address,
        });
      }

      await prisma.copiedTrade.update({
        where: { id: trade.id },
        data: {
          status: "COMPLETED",
          executedAt: new Date(),
          transactionHash: result.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: trade.copierId,
          type: "TRADE_EXECUTED",
          title: "Copy Trade Executed",
          message: `Copied ${trade.side} of ${trade.shares.toFixed(2)} shares`,
          data: { tradeId: trade.id },
        },
      });
    } catch (error) {
      console.error("Error executing copied trade:", error);

      await prisma.copiedTrade.update({
        where: { id: trade.id },
        data: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  }

  // Check risk limits
  private async checkRiskLimits(userId: string, amount: number): Promise<void> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      throw new Error("User settings not found");
    }

    // Check max trade amount
    if (settings.maxTradeAmount && amount > settings.maxTradeAmount) {
      throw new Error(
        `Trade amount exceeds maximum of ${settings.maxTradeAmount}`
      );
    }

    // Check max open positions
    const openTrades = await prisma.trade.count({
      where: {
        userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
    });

    if (openTrades >= settings.maxOpenPositions) {
      throw new Error(
        `Maximum open positions (${settings.maxOpenPositions}) reached`
      );
    }

    // Check daily loss limit
    if (settings.maxDailyLoss) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTrades = await prisma.trade.findMany({
        where: {
          userId,
          createdAt: { gte: today },
          status: "COMPLETED",
        },
      });

      const dailyPnL = todayTrades.reduce((sum, trade) => {
        // Simplified P&L calculation
        return sum + (trade.side === "BUY" ? -trade.amount : trade.amount);
      }, 0);

      if (dailyPnL < -settings.maxDailyLoss) {
        throw new Error(`Daily loss limit of ${settings.maxDailyLoss} reached`);
      }
    }
  }

  // Check if market is allowed for copying
  private isMarketAllowed(marketId: string, settings: any): boolean {
    if (settings.onlyMarkets.length > 0) {
      return settings.onlyMarkets.includes(marketId);
    }

    if (settings.excludeMarkets.length > 0) {
      return !settings.excludeMarkets.includes(marketId);
    }

    return true;
  }

  // Calculate copy amount based on settings
  private calculateCopyAmount(
    originalAmount: number,
    userSettings: any,
    copySettings: any
  ): number {
    const baseAmount = originalAmount * (copySettings.copyPercentage / 100);
    const cappedAmount = Math.min(
      baseAmount,
      userSettings.maxTradeAmount || baseAmount
    );

    return Math.max(cappedAmount, userSettings.minTradeAmount);
  }
}

// Initialize worker for processing copy trades
const copyTradeWorker = new Worker(
  "copy-trades",
  async (job) => {
    const engine = new CopyTradingEngine();
    await engine.processCopyTrade(job.data);
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

copyTradeWorker.on("completed", (job) => {
  console.log(`Copy trade ${job.id} completed`);
});

copyTradeWorker.on("failed", (job, err) => {
  console.error(`Copy trade ${job?.id} failed:`, err);
});

export const copyTradingEngine = new CopyTradingEngine();
export default copyTradingEngine;
