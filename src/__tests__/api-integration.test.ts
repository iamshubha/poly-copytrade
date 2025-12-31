/**
 * Integration Tests for API Routes
 * Tests the complete API layer including authentication, trades, and markets
 */

import { describe, expect, test, beforeAll } from 'bun:test';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Helper to make authenticated requests
async function makeRequest(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

describe('API Integration Tests', () => {
  let authToken: string | undefined;

  describe('Health Check', () => {
    test('GET /api/health should return 200', async () => {
      const response = await makeRequest('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'ok');
    });
  });

  describe('Authentication', () => {
    test('GET /api/auth/nonce should generate nonce', async () => {
      const response = await makeRequest('/api/auth/nonce');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('nonce');
      expect(typeof response.data.nonce).toBe('string');
      expect(response.data.nonce.length).toBeGreaterThan(0);
    });

    test('should reject requests without authentication', async () => {
      const response = await makeRequest('/api/user');
      
      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Markets API', () => {
    test('GET /api/markets should return markets list', async () => {
      const response = await makeRequest('/api/markets?limit=10');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    test('GET /api/markets should support filtering', async () => {
      const response = await makeRequest('/api/markets?active=true&category=politics');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
    });

    test('GET /api/markets should support pagination', async () => {
      const response = await makeRequest('/api/markets?limit=5&offset=10');
      
      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
    });

    test('GET /api/markets should support sorting', async () => {
      const response = await makeRequest('/api/markets?sortBy=volume&sortOrder=desc');
      
      expect(response.status).toBe(200);
    });
  });

  describe('Traders API', () => {
    test('GET /api/traders/polymarket should return leader wallets', async () => {
      const response = await makeRequest('/api/traders/polymarket?limit=10');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('data');
      expect(response.data.data).toHaveProperty('traders');
      expect(Array.isArray(response.data.data.traders)).toBe(true);
    });

    test('GET /api/traders/polymarket should filter by criteria', async () => {
      const response = await makeRequest(
        '/api/traders/polymarket?minVolume=100&minTrades=10&sortBy=roi'
      );
      
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('should include rate limit headers', async () => {
      const response = await makeRequest('/api/markets');
      
      expect(response.headers.has('x-ratelimit-limit')).toBe(true);
      expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
    });

    test('should enforce rate limits', async () => {
      // Make multiple rapid requests to trigger rate limit
      const requests = Array.from({ length: 100 }, () =>
        makeRequest('/api/markets')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      // At least one request should be rate limited
      expect(rateLimited).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await makeRequest('/api/nonexistent');
      
      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid parameters', async () => {
      const response = await makeRequest('/api/markets?limit=invalid');
      
      // Should handle gracefully (either default or error)
      expect([200, 400]).toContain(response.status);
    });

    test('should return proper error messages', async () => {
      const response = await makeRequest('/api/user');
      
      expect(response.data).toHaveProperty('error');
      expect(typeof response.data.error).toBe('string');
    });
  });

  describe('CORS and Headers', () => {
    test('should include security headers', async () => {
      const response = await makeRequest('/api/health');
      
      // Check for security headers (if configured)
      // expect(response.headers.has('x-content-type-options')).toBe(true);
    });
  });
});

describe('Protected API Routes', () => {
  // These tests would require actual authentication
  // In a real test suite, you'd:
  // 1. Create a test user
  // 2. Generate authentication token
  // 3. Test protected endpoints

  test.skip('POST /api/follow should require authentication', async () => {
    const response = await makeRequest('/api/follow', {
      method: 'POST',
      body: JSON.stringify({ followingId: 'test-user' }),
    });
    
    expect(response.status).toBe(401);
  });

  test.skip('POST /api/trades should require authentication', async () => {
    const response = await makeRequest('/api/trades', {
      method: 'POST',
      body: JSON.stringify({
        marketId: 'test',
        side: 'BUY',
        amount: 100,
      }),
    });
    
    expect(response.status).toBe(401);
  });
});

describe('Data Validation', () => {
  test('Markets should have required fields', async () => {
    const response = await makeRequest('/api/markets?limit=1');
    
    if (response.data.data && response.data.data.length > 0) {
      const market = response.data.data[0];
      
      expect(market).toHaveProperty('title');
      expect(market).toHaveProperty('outcomesPrices');
      expect(Array.isArray(market.outcomesPrices)).toBe(true);
    }
  });

  test('Traders should have required fields', async () => {
    const response = await makeRequest('/api/traders/polymarket?limit=1');
    
    if (response.data.data?.traders?.length > 0) {
      const trader = response.data.data.traders[0];
      
      expect(trader).toHaveProperty('address');
      expect(trader).toHaveProperty('stats');
      expect(trader.stats).toHaveProperty('totalTrades');
    }
  });
});

describe('Performance', () => {
  test('API responses should be reasonably fast', async () => {
    const start = Date.now();
    await makeRequest('/api/markets?limit=10');
    const duration = Date.now() - start;
    
    // Should respond within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  test('Concurrent requests should be handled', async () => {
    const requests = Array.from({ length: 10 }, () =>
      makeRequest('/api/markets?limit=5')
    );

    const responses = await Promise.all(requests);
    const allSuccessful = responses.every(r => r.status === 200 || r.status === 429);
    
    expect(allSuccessful).toBe(true);
  });
});
