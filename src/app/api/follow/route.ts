import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";
import { withRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { sanitizeInput } from "@/lib/security";

const postHandler = withAuth(async (req: NextRequest, userId: string) => {
  const log = logger.child({ userId, endpoint: '/api/follow', method: 'POST' });
  
  try {
    const { followingId } = await req.json();

    if (!followingId) {
      log.warn('Missing followingId parameter');
      return errorResponse("followingId is required", 400);
    }

    // Validate address format if provided
    const sanitizedFollowingId = sanitizeInput(followingId);

    if (userId === sanitizedFollowingId) {
      log.warn('User attempted to follow themselves');
      return errorResponse("Cannot follow yourself", 400);
    }

    // Check if already following
    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: sanitizedFollowingId,
        },
      },
    });

    if (existing) {
      log.warn('Already following user', { followingId: sanitizedFollowingId });
      return errorResponse("Already following", 400);
    }

    // Create follow relationship
    const follow = await log.measure('create-follow', async () => {
      return await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: sanitizedFollowingId,
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
          follower: {
            select: { id: true, address: true },
          },
          following: {
            select: { id: true, address: true },
          },
          copySettings: true,
        },
      });
    });

    // Notify the trader
    await prisma.notification.create({
      data: {
        userId: sanitizedFollowingId,
        type: "NEW_FOLLOWER",
        title: "New Follower",
        message: `${follow.follower.address} is now following you`,
        data: { followerId: userId },
      },
    });

    log.info('User followed successfully', { followingId: sanitizedFollowingId });
    return successResponse(follow);
  } catch (error) {
    log.error('Failed to follow user', { error });
    return errorResponse(error);
  }
});

export const POST = withRateLimit(postHandler, 'follow');

const getHandler = withAuth(async (req: NextRequest, userId: string) => {
  const log = logger.child({ userId, endpoint: '/api/follow', method: 'GET' });
  
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "following";

    log.info('Fetching follows', { type });

    if (type === "following") {
      const following = await log.measure('fetch-following', async () => {
        return await prisma.follow.findMany({
          where: { followerId: userId },
          include: {
            following: {
              select: { id: true, address: true },
            },
            copySettings: true,
          },
        });
      });

      log.info('Following list fetched', { count: following.length });
      return successResponse(following);
    } else {
      const followers = await log.measure('fetch-followers', async () => {
        return await prisma.follow.findMany({
          where: { followingId: userId },
          include: {
            follower: {
              select: { id: true, address: true },
            },
          },
        });
      });

      log.info('Followers list fetched', { count: followers.length });
      return successResponse(followers);
    }
  } catch (error) {
    log.error('Failed to fetch follows', { error });
    return errorResponse(error);
  }
});

export const GET = withRateLimit(getHandler, 'read');
