import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return errorResponse("Settings not found", 404);
    }

    return successResponse(settings);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const data = await req.json();

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return successResponse(settings);
  } catch (error) {
    return errorResponse(error);
  }
});
