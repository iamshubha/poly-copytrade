import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiResponse } from "@/types";

export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      return await handler(req, session.user.id);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export function errorResponse(error: any, status: number = 500): NextResponse {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    },
    { status }
  );
}

export function successResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
    },
    { status: 200 }
  );
}
