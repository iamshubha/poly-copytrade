import { NextRequest } from "next/server";
import { generateNonce } from "siwe";
import { successResponse, errorResponse } from "@/lib/api";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();

    if (!address) {
      return errorResponse("Address is required", 400);
    }

    const nonce = generateNonce();

    // Update or create user with new nonce
    await prisma.user.upsert({
      where: { address },
      update: { nonce },
      create: { address, nonce },
    });

    return successResponse({ nonce });
  } catch (error) {
    return errorResponse(error);
  }
}
