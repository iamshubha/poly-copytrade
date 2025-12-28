import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return successResponse(notifications);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { notificationIds } = await req.json();

    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { read: true },
    });

    return successResponse({ message: "Notifications marked as read" });
  } catch (error) {
    return errorResponse(error);
  }
});
