/**
 * Rate Limiting Middleware for API Routes
 * Prevents abuse and DDoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// In-memory store for development
// For production, use Redis or a distributed cache
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

// Default rate limits by endpoint type
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Strict limits for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 min
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // Moderate limits for trade execution
  trade: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 trades per minute
    message: 'Too many trade requests. Please slow down.',
  },
  
  // Lenient limits for read-only operations
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many requests. Please try again later.',
  },
  
  // Very strict for following/unfollowing
  follow: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 follows per minute
    message: 'Too many follow requests. Please wait a moment.',
  },
};

/**
 * Rate limit a request based on IP address and user ID
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  error?: string;
}> {
  try {
    // Get identifier (prefer user ID, fallback to IP)
    let identifier: string;
    
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      identifier = `user:${session.user.id}`;
    } else {
      // Get IP address from headers
      const forwarded = request.headers.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
      identifier = `ip:${ip}`;
    }

    const now = Date.now();
    const key = `${identifier}:${Math.floor(now / config.windowMs)}`;
    
    // Get or create entry
    let entry = rateLimitStore.get(key);
    
    if (!entry) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        error: config.message || 'Rate limit exceeded',
      };
    }

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  } catch (error) {
    console.error('[Rate Limit] Error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  configKey: keyof typeof rateLimitConfigs = 'read'
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const config = rateLimitConfigs[configKey];
    const result = await rateLimit(req, config);

    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    };

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Execute handler
    const response = await handler(req);

    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Check rate limit without incrementing counter (for GET requests)
 */
export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const session = await getServerSession(authOptions);
  const identifier = session?.user?.id
    ? `user:${session.user.id}`
    : `ip:${request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'}`;

  const now = Date.now();
  const key = `${identifier}:${Math.floor(now / config.windowMs)}`;
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { allowed: true, remaining: config.maxRequests };
  }

  return {
    allowed: entry.count < config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
  };
}

/**
 * Redis-based rate limiter (for production with Redis)
 */
export class RedisRateLimiter {
  private redis: any; // Use ioredis

  constructor(redisClient: any) {
    this.redis = redisClient;
  }

  async rateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
  }> {
    const now = Date.now();
    const window = Math.floor(now / config.windowMs);
    const key = `ratelimit:${identifier}:${window}`;

    try {
      // Increment counter
      const count = await this.redis.incr(key);
      
      // Set expiry on first request
      if (count === 1) {
        await this.redis.pexpire(key, config.windowMs);
      }

      const resetAt = now + config.windowMs;

      if (count > config.maxRequests) {
        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt,
        };
      }

      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - count,
        resetAt,
      };
    } catch (error) {
      console.error('[Redis Rate Limit] Error:', error);
      // Fail open
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }
}
