import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const DELETE = withAuth(
  async (
    req: NextRequest,
    userId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const follow = await prisma.follow.findUnique({
        where: { id: params.id },
      });

      if (!follow) {
        return errorResponse("Follow relationship not found", 404);
      }

      if (follow.followerId !== userId) {
        return errorResponse("Unauthorized", 403);
      }

      await prisma.follow.delete({
        where: { id: params.id },
      });

      return successResponse({ message: "Unfollowed successfully" });
    } catch (error) {
      return errorResponse(error);
    }
  }
);

export const PATCH = withAuth(
  async (
    req: NextRequest,
    userId: string,
    { params }: { params: { id: string } }
  ) => {
    try {
      const data = await req.json();

      const follow = await prisma.follow.findUnique({
        where: { id: params.id },
        include: { copySettings: true },
      });

      if (!follow) {
        return errorResponse("Follow relationship not found", 404);
      }

      if (follow.followerId !== userId) {
        return errorResponse("Unauthorized", 403);
      }

      // Update copy settings
      const updated = await prisma.followCopySettings.update({
        where: { followId: params.id },
        data,
      });

      return successResponse(updated);
    } catch (error) {
      return errorResponse(error);
    }
  }
);
