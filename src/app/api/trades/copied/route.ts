import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [copiedTrades, total] = await Promise.all([
      prisma.copiedTrade.findMany({
        where: { copierId: userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          originalTrade: {
            include: {
              user: {
                select: { id: true, address: true },
              },
            },
          },
        },
      }),
      prisma.copiedTrade.count({ where: { copierId: userId } }),
    ]);

    return successResponse({ copiedTrades, total });
  } catch (error) {
    return errorResponse(error);
  }
});
