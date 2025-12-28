import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user);
  } catch (error) {
    return errorResponse(error);
  }
});

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const data = await req.json();

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      include: { settings: true },
    });

    return successResponse(user);
  } catch (error) {
    return errorResponse(error);
  }
});
