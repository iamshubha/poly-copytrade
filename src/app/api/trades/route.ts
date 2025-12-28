import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import { copyTradingEngine } from "@/lib/copyEngine";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const data = await req.json();

    const trade = await copyTradingEngine.processTrade(userId, data);

    return successResponse(trade);
  } catch (error) {
    return errorResponse(error);
  }
});

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({ where: { userId } }),
    ]);

    return successResponse({ trades, total });
  } catch (error) {
    return errorResponse(error);
  }
});
