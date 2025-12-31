import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import { copyTradingEngine } from "@/lib/copyEngine";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { validateTradeParams, sanitizeInput } from "@/lib/security";

const postHandler = withAuth(async (req: NextRequest, userId: string) => {
  const log = logger.child({ userId, endpoint: '/api/trades', method: 'POST' });
  
  try {
    log.info('Processing trade request');
    const data = await req.json();

    // Validate trade parameters
    const validation = validateTradeParams(data);
    if (!validation.valid) {
      log.warn('Invalid trade parameters', { errors: validation.errors });
      return errorResponse(validation.errors.join(', '), 400);
    }

    // Sanitize inputs
    const sanitizedData = {
      ...data,
      marketId: sanitizeInput(data.marketId),
      outcome: sanitizeInput(data.outcome),
    };

    const trade = await log.measure('process-trade', async () => {
      return await copyTradingEngine.processTrade(userId, sanitizedData);
    });

    log.logTrade(trade);
    return successResponse(trade);
  } catch (error) {
    log.error('Trade processing failed', { error });
    return errorResponse(error);
  }
});

export const POST = withRateLimit(postHandler, 'trade');

const getHandler = withAuth(async (req: NextRequest, userId: string) => {
  const log = logger.child({ userId, endpoint: '/api/trades', method: 'GET' });
  
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Cap at 100
    const offset = parseInt(searchParams.get("offset") || "0");

    log.info('Fetching user trades', { limit, offset });

    const [trades, total] = await log.measure('fetch-trades', async () => {
      return await Promise.all([
        prisma.trade.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.trade.count({ where: { userId } }),
      ]);
    });

    log.info('Trades fetched successfully', { count: trades.length, total });
    return successResponse({ trades, total });
  } catch (error) {
    log.error('Failed to fetch trades', { error });
    return errorResponse(error);
  }
});

export const GET = withRateLimit(getHandler, 'read');
