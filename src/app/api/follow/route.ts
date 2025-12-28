import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { followingId } = await req.json();

    if (!followingId) {
      return errorResponse("followingId is required", 400);
    }

    if (userId === followingId) {
      return errorResponse("Cannot follow yourself", 400);
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (existing) {
      return errorResponse("Already following", 400);
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId: userId,
        followingId,
        copySettings: {
          create: {
            enabled: true,
            copyPercentage: 100,
            onlyMarkets: [],
            excludeMarkets: [],
            onlyOutcomes: [],
          },
        },
      },
      include: {
        following: {
          select: { id: true, address: true },
        },
        copySettings: true,
      },
    });

    // Notify the trader
    await prisma.notification.create({
      data: {
        userId: followingId,
        type: "NEW_FOLLOWER",
        title: "New Follower",
        message: `${follow.follower.address} is now following you`,
        data: { followerId: userId },
      },
    });

    return successResponse(follow);
  } catch (error) {
    return errorResponse(error);
  }
});

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "following";

    if (type === "following") {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: { id: true, address: true },
          },
          copySettings: true,
        },
      });

      return successResponse(following);
    } else {
      const followers = await prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: { id: true, address: true },
          },
        },
      });

      return successResponse(followers);
    }
  } catch (error) {
    return errorResponse(error);
  }
});
