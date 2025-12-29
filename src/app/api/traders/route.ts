import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const sortBy = searchParams.get("sortBy") || "followers"; // followers, trades, volume

    // Get all users who have made trades (potential traders to follow)
    const traders = await prisma.user.findMany({
      where: {
        // Exclude current user
        id: { not: userId },
      },
      select: {
        id: true,
        address: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            trades: true,
          },
        },
        trades: {
          select: {
            amount: true,
            profit: true,
            status: true,
          },
          take: 100, // Last 100 trades for stats
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      take: limit,
      skip: offset,
    });

    // Calculate stats for each trader
    const tradersWithStats = traders
      .map((trader) => {
        const totalTrades = trader._count.trades;
        const trades = trader.trades;

        // Calculate total volume
        const totalVolume = trades.reduce(
          (sum, trade) => sum + (trade.amount || 0),
          0
        );

        // Calculate win rate (trades with positive profit)
        const completedTrades = trades.filter(
          (t) => t.status === "COMPLETED" && t.profit != null
        );
        const winningTrades = completedTrades.filter((t) => t.profit! > 0);
        const winRate =
          completedTrades.length > 0
            ? (winningTrades.length / completedTrades.length) * 100
            : 0;

        // Calculate total profit
        const totalProfit = completedTrades.reduce(
          (sum, trade) => sum + (trade.profit || 0),
          0
        );

        // Calculate average profit per trade
        const avgProfit =
          completedTrades.length > 0 ? totalProfit / completedTrades.length : 0;

        return {
          id: trader.id,
          address: trader.address,
          createdAt: trader.createdAt,
          stats: {
            followers: trader._count.followers,
            totalTrades,
            totalVolume,
            winRate: parseFloat(winRate.toFixed(2)),
            totalProfit: parseFloat(totalProfit.toFixed(2)),
            avgProfit: parseFloat(avgProfit.toFixed(2)),
            recentTrades: trades.slice(0, 5).length,
          },
        };
      })
      .filter((trader) => trader.stats.totalTrades > 0); // Only show traders with trades

    // Sort traders based on sortBy parameter
    tradersWithStats.sort((a, b) => {
      switch (sortBy) {
        case "trades":
          return b.stats.totalTrades - a.stats.totalTrades;
        case "volume":
          return b.stats.totalVolume - a.stats.totalVolume;
        case "winRate":
          return b.stats.winRate - a.stats.winRate;
        case "profit":
          return b.stats.totalProfit - a.stats.totalProfit;
        case "followers":
        default:
          return b.stats.followers - a.stats.followers;
      }
    });

    // Check which traders the current user is already following
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = new Set(following.map((f) => f.followingId));

    const tradersWithFollowStatus = tradersWithStats.map((trader) => ({
      ...trader,
      isFollowing: followingIds.has(trader.id),
    }));

    return successResponse({
      traders: tradersWithFollowStatus,
      total: tradersWithStats.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching traders:", error);
    return errorResponse(error);
  }
});
