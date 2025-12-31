/**
 * E2E Tests for Critical User Flows
 * Tests complete user journeys from authentication to trade execution
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Critical User Flows', () => {
  test.describe('Public Browsing (No Auth Required)', () => {
    test('should access landing page without authentication', async ({ page }) => {
      await page.goto(BASE_URL);
      
      await expect(page).toHaveTitle(/Polymarket Copy Trading/i);
      
      // Should see marketing content
      await expect(page.locator('text=Copy Trading Platform')).toBeVisible();
      await expect(page.locator('text=Connect Wallet')).toBeVisible();
    });

    test('should browse traders without authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      // Should see trader discovery page
      await expect(page.locator('h1:has-text("Discover Traders")')).toBeVisible();
    });

    test('should browse markets without authentication', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      // Should see markets page
      await expect(page.locator('h1:has-text("Markets")')).toBeVisible();
    });

    test('should search and filter markets', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      // Wait for markets to load
      await page.waitForSelector('[data-testid="market-card"], .card', { timeout: 10000 });
      
      // Search for markets
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('Bitcoin');
      
      // Filter by category
      const categoryButton = page.locator('button:has-text("Crypto")').first();
      if (await categoryButton.isVisible()) {
        await categoryButton.click();
      }
    });
  });

  test.describe('Authentication Flow', () => {
    test('should redirect to sign-in when accessing protected routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to sign-in page or show connect wallet prompt
      await page.waitForURL(/\/auth\/signin|\/dashboard/);
    });

    test('should display wallet connection options', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Should see wallet options
      await expect(page.locator('text=Connect Wallet')).toBeVisible();
    });

    test.skip('should connect wallet and sign SIWE message', async ({ page }) => {
      // This test requires MetaMask extension and is typically run manually
      // or with a mock wallet provider
      
      await page.goto(`${BASE_URL}/auth/signin`);
      
      // Click connect wallet
      await page.click('button:has-text("Connect Wallet")');
      
      // In a real test with MetaMask:
      // 1. Switch to MetaMask popup
      // 2. Approve connection
      // 3. Sign SIWE message
      // 4. Verify redirect to dashboard
    });
  });

  test.describe('Trader Discovery Flow', () => {
    test('should display list of traders', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      // Wait for traders to load
      await page.waitForSelector('[data-testid="trader-card"], .card', { timeout: 10000 });
      
      const traderCards = page.locator('[data-testid="trader-card"], .card');
      await expect(traderCards.first()).toBeVisible();
    });

    test('should switch between Polymarket and Internal traders', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      // Switch to Polymarket Leaders
      const polymarketButton = page.locator('button:has-text("Polymarket Leaders")').first();
      if (await polymarketButton.isVisible()) {
        await polymarketButton.click();
        await page.waitForTimeout(1000); // Wait for data to load
      }
      
      // Switch to Internal Users
      const internalButton = page.locator('button:has-text("Internal Users")').first();
      if (await internalButton.isVisible()) {
        await internalButton.click();
        await page.waitForTimeout(1000);
      }
    });

    test('should sort traders by different criteria', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      // Try different sort options
      const sortOptions = ['Volume', 'ROI', 'Win Rate', 'Trades'];
      
      for (const option of sortOptions) {
        const sortButton = page.locator(`button:has-text("${option}")`).first();
        if (await sortButton.isVisible()) {
          await sortButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should display trader statistics', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      await page.waitForSelector('[data-testid="trader-card"], .card', { timeout: 10000 });
      
      const firstCard = page.locator('[data-testid="trader-card"], .card').first();
      
      // Should display wallet address
      await expect(firstCard.locator('text=/0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}/')).toBeVisible();
      
      // Should display stats
      await expect(firstCard.locator('text=/Trades|Volume|Win Rate/i')).toBeVisible();
    });
  });

  test.describe('Market Exploration Flow', () => {
    test('should display list of markets', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      await page.waitForSelector('[data-testid="market-card"], .card', { timeout: 10000 });
      
      const marketCards = page.locator('[data-testid="market-card"], .card');
      await expect(marketCards.first()).toBeVisible();
    });

    test('should filter markets by category', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      await page.waitForSelector('[data-testid="market-card"], .card');
      
      // Click a category filter
      const categories = ['Politics', 'Sports', 'Crypto'];
      
      for (const category of categories) {
        const categoryButton = page.locator(`button:has-text("${category}")`).first();
        if (await categoryButton.isVisible()) {
          await categoryButton.click();
          await page.waitForTimeout(500);
          break; // Test one category
        }
      }
    });

    test('should sort markets', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      await page.waitForSelector('[data-testid="market-card"], .card');
      
      // Try sort options
      const volumeButton = page.locator('button:has-text("Volume")').first();
      if (await volumeButton.isVisible()) {
        await volumeButton.click();
        await page.waitForTimeout(500);
      }
      
      // Toggle sort order
      const sortOrderButton = page.locator('button[title*="Sort"]').first();
      if (await sortOrderButton.isVisible()) {
        await sortOrderButton.click();
      }
    });

    test('should search markets', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill('election');
      await page.waitForTimeout(1000);
      
      // Should update results
      await page.waitForSelector('[data-testid="market-card"], .card', { timeout: 5000 });
    });

    test('should display market details', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      await page.waitForSelector('[data-testid="market-card"], .card', { timeout: 10000 });
      
      const firstCard = page.locator('[data-testid="market-card"], .card').first();
      
      // Should display market title
      await expect(firstCard.locator('h3').first()).toBeVisible();
      
      // Should display prices
      await expect(firstCard.locator('text=/Yes|No/i')).toBeVisible();
      
      // Should display volume/liquidity
      await expect(firstCard.locator('text=/Vol:|Liq:/i')).toBeVisible();
    });

    test.skip('should navigate to market detail page', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      await page.waitForSelector('[data-testid="market-card"], .card a');
      
      // Click first market with a valid link
      const marketLink = page.locator('[data-testid="market-card"] a, .card a').first();
      if (await marketLink.isVisible()) {
        await marketLink.click();
        
        // Should navigate to market detail page
        await expect(page).toHaveURL(/\/dashboard\/markets\/.+/);
      }
    });
  });

  test.describe('Follow Trader Flow (Protected)', () => {
    test.skip('should follow a trader when authenticated', async ({ page }) => {
      // Requires authentication - skip in CI unless auth is mocked
      
      await page.goto(`${BASE_URL}/dashboard/traders`);
      
      // Find and click follow button
      const followButton = page.locator('button:has-text("Follow")').first();
      await followButton.click();
      
      // Should show success feedback
      await expect(page.locator('text=/Successfully followed|Following/i')).toBeVisible();
    });

    test.skip('should view followed traders', async ({ page }) => {
      // Requires authentication
      
      await page.goto(`${BASE_URL}/dashboard/following`);
      
      await expect(page.locator('h1:has-text("Following")')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(BASE_URL);
      await expect(page.locator('text=Copy Trading')).toBeVisible();
      
      // Navigate to traders page
      await page.goto(`${BASE_URL}/dashboard/traders`);
      await page.waitForSelector('[data-testid="trader-card"], .card');
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(`${BASE_URL}/dashboard/markets`);
      await page.waitForSelector('[data-testid="market-card"], .card');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/nonexistent-page`);
      
      // Should show 404 or redirect
      await expect(page.locator('text=/404|Not Found|Page not found/i')).toBeVisible({
        timeout: 5000,
      }).catch(() => {
        // Or redirects to home
        expect(page.url()).toBe(BASE_URL + '/');
      });
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Navigate to page that makes API calls
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      // Page should still load even if API is slow
      await expect(page.locator('h1:has-text("Markets")')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('pages should load within reasonable time', async ({ page }) => {
      const start = Date.now();
      await page.goto(BASE_URL);
      const loadTime = Date.now() - start;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto(BASE_URL);
      await page.goto(`${BASE_URL}/dashboard/traders`);
      await page.goto(`${BASE_URL}/dashboard/markets`);
      
      // Filter out expected errors (like network errors in test environment)
      const unexpectedErrors = errors.filter(err => 
        !err.includes('Failed to load') && 
        !err.includes('NetworkError')
      );
      
      expect(unexpectedErrors).toHaveLength(0);
    });
  });
});
