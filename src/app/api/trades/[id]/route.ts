import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trade = await prisma.trade.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, address: true },
        },
        copiedTrades: true,
      },
    });

    if (!trade) {
      return errorResponse("Trade not found", 404);
    }

    return successResponse(trade);
  } catch (error) {
    return errorResponse(error);
  }
}
