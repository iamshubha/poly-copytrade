/**
 * Security Utilities and CSRF Protection
 * 
 * Implements security best practices:
 * - CSRF token validation
 * - Input sanitization
 * - Rate limiting per action
 * - Request validation
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { headers } from 'next/headers';
import crypto from 'crypto';

// CSRF Token Store (use Redis in production)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (now > value.expiresAt) {
      csrfTokens.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Generate CSRF token for a user session
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  csrfTokens.set(sessionId, { token, expiresAt });

  return token;
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(
  sessionId: string,
  providedToken: string
): Promise<boolean> {
  const stored = csrfTokens.get(sessionId);

  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === providedToken;
}

/**
 * Middleware to validate CSRF tokens on state-changing operations
 */
export async function withCSRFProtection(
  request: NextRequest,
  handler: () => Promise<Response>
): Promise<Response> {
  // Only protect state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return handler();
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!csrfToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'CSRF token missing' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const isValid = await validateCSRFToken(session.user.id, csrfToken);
  if (!isValid) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid CSRF token' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return handler();
}

/**
 * Input sanitization to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate trade parameters
 */
export function validateTradeParams(params: {
  marketId: string;
  amount: number;
  price: number;
  side: string;
}): { valid: boolean; error?: string } {
  // Validate market ID format
  if (!params.marketId || params.marketId.length < 1) {
    return { valid: false, error: 'Invalid market ID' };
  }

  // Validate amount
  if (params.amount <= 0 || params.amount > 1000000) {
    return { valid: false, error: 'Invalid trade amount' };
  }

  // Validate price
  if (params.price < 0 || params.price > 1) {
    return { valid: false, error: 'Invalid price (must be between 0 and 1)' };
  }

  // Validate side
  if (!['BUY', 'SELL'].includes(params.side)) {
    return { valid: false, error: 'Invalid trade side' };
  }

  return { valid: true };
}

/**
 * Detect suspicious activity patterns
 */
export interface SuspiciousActivityCheck {
  isSuspicious: boolean;
  reason?: string;
  riskScore: number; // 0-100
}

export async function checkSuspiciousActivity(
  userId: string,
  action: string
): Promise<SuspiciousActivityCheck> {
  let riskScore = 0;
  const reasons: string[] = [];

  // Check rapid successive actions (potential bot)
  const recentActions = await getRecentActions(userId, 60000); // last minute
  if (recentActions > 20) {
    riskScore += 30;
    reasons.push('High frequency of actions');
  }

  // Check unusual trade patterns
  if (action === 'trade') {
    const recentTrades = await getRecentTrades(userId, 300000); // last 5 minutes
    if (recentTrades > 10) {
      riskScore += 40;
      reasons.push('Unusual trading frequency');
    }
  }

  // Check for account age (new accounts are riskier)
  const accountAge = await getAccountAge(userId);
  if (accountAge < 86400000) {
    // < 24 hours
    riskScore += 20;
    reasons.push('New account');
  }

  return {
    isSuspicious: riskScore >= 50,
    reason: reasons.join(', '),
    riskScore,
  };
}

// Helper functions (implement based on your data store)
async function getRecentActions(userId: string, timeWindow: number): Promise<number> {
  // Query action logs from last timeWindow milliseconds
  // This would use your database or Redis
  return 0; // Placeholder
}

async function getRecentTrades(userId: string, timeWindow: number): Promise<number> {
  // Query trades from last timeWindow milliseconds
  return 0; // Placeholder
}

async function getAccountAge(userId: string): Promise<number> {
  // Get time since account creation in milliseconds
  return Date.now(); // Placeholder
}

/**
 * Security headers for API responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * Validate request origin to prevent CSRF
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  if (referer) {
    const refererUrl = new URL(referer);
    if (allowedOrigins.some((allowed) => refererUrl.origin === allowed)) {
      return true;
    }
  }

  return false;
}

/**
 * Password/secret strength validator
 */
export function validateSecretStrength(secret: string): {
  valid: boolean;
  score: number; // 0-100
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length
  if (secret.length >= 32) {
    score += 40;
  } else if (secret.length >= 16) {
    score += 20;
  } else {
    feedback.push('Secret should be at least 16 characters');
  }

  // Complexity
  if (/[a-z]/.test(secret)) score += 10;
  if (/[A-Z]/.test(secret)) score += 10;
  if (/[0-9]/.test(secret)) score += 10;
  if (/[^a-zA-Z0-9]/.test(secret)) score += 10;

  // Entropy
  const uniqueChars = new Set(secret).size;
  if (uniqueChars >= 20) {
    score += 20;
  } else if (uniqueChars >= 10) {
    score += 10;
  } else {
    feedback.push('Secret lacks diversity in characters');
  }

  // Common patterns
  if (/123|abc|password|admin/i.test(secret)) {
    score -= 30;
    feedback.push('Contains common patterns');
  }

  return {
    valid: score >= 70,
    score: Math.max(0, Math.min(100, score)),
    feedback,
  };
}

/**
 * Encrypt sensitive data before storing
 */
export function encryptData(data: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];

  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
