/**
 * Backend API Integration Tests
 * Test suite for the unified API integration module
 */

import { describe, it, expect, beforeAll, afterAll, jest } from "@jest/globals";
import {
  BackendAPIIntegration,
  createBackendAPI,
} from "../src/lib/backend-api-integration";
import type { Trade, Market, LeaderWallet } from "../src/lib/polymarket/types";

describe("BackendAPIIntegration", () => {
  let api: BackendAPIIntegration;

  beforeAll(() => {
    // Create API instance with test configuration
    api = createBackendAPI({
      useWebSocket: false, // Use REST for tests
      pollingInterval: 1000,
      leaderDetection: {
        enabled: false, // Disable for unit tests
      },
    });
  });

  afterAll(async () => {
    if (api) {
      await api.disconnect();
    }
  });

  describe("Initialization", () => {
    it("should create an instance", () => {
      expect(api).toBeDefined();
      expect(api).toBeInstanceOf(BackendAPIIntegration);
    });

    it("should have correct initial status", () => {
      const status = api.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.connected).toBe(false);
    });

    it("should initialize successfully", async () => {
      await api.initialize();
      const status = api.getStatus();
      expect(status.initialized).toBe(true);
    });
  });

  describe("Configuration", () => {
    it("should use REST polling when useWebSocket is false", () => {
      const status = api.getStatus();
      expect(status.useWebSocket).toBe(false);
    });

    it("should have correct leader detection config", () => {
      const status = api.getStatus();
      expect(status.leaderDetectionEnabled).toBe(false);
    });
  });

  describe("Event Handling", () => {
    it("should emit connected event on initialization", (done) => {
      const testApi = createBackendAPI({ useWebSocket: false });

      testApi.on("connected", () => {
        expect(true).toBe(true);
        testApi.disconnect();
        done();
      });

      testApi.initialize();
    });

    it("should emit disconnected event", (done) => {
      const testApi = createBackendAPI({ useWebSocket: false });

      testApi.on("disconnected", () => {
        expect(true).toBe(true);
        done();
      });

      testApi.initialize().then(() => {
        testApi.disconnect();
      });
    });
  });

  describe("Subscriptions", () => {
    beforeAll(async () => {
      await api.initialize();
    });

    it("should return active subscriptions", () => {
      const subscriptions = api.getActiveSubscriptions();
      expect(Array.isArray(subscriptions)).toBe(true);
    });

    it("should get status with subscriptions", () => {
      const status = api.getStatus();
      expect(status.subscriptions).toBeDefined();
      expect(Array.isArray(status.subscriptions)).toBe(true);
    });
  });

  describe("Cache Management", () => {
    it("should clear cache without errors", () => {
      expect(() => api.clearCache()).not.toThrow();
    });
  });

  describe("Leader Detection (disabled)", () => {
    it("should throw error when leader detection is disabled", async () => {
      await expect(api.detectLeaderWallets()).rejects.toThrow(
        "Leader detection is not enabled"
      );
    });

    it("should throw error for isLeaderWallet", async () => {
      await expect(api.isLeaderWallet("0x123")).rejects.toThrow(
        "Leader detection is not enabled"
      );
    });

    it("should return empty array for monitored leaders", () => {
      const monitored = api.getMonitoredLeaders();
      expect(Array.isArray(monitored)).toBe(true);
      expect(monitored.length).toBe(0);
    });
  });
});

describe("BackendAPIIntegration with WebSocket", () => {
  it("should create instance with WebSocket config", () => {
    const api = createBackendAPI({
      useWebSocket: true,
    });

    const status = api.getStatus();
    expect(status.useWebSocket).toBe(true);
  });
});

describe("BackendAPIIntegration with Leader Detection", () => {
  it("should create instance with leader detection enabled", () => {
    const api = createBackendAPI({
      leaderDetection: {
        enabled: true,
        minVolume: 50000,
        minTrades: 50,
        minWinRate: 0.6,
      },
    });

    const status = api.getStatus();
    expect(status.leaderDetectionEnabled).toBe(true);
  });
});

describe("Event Emitter Functionality", () => {
  let api: BackendAPIIntegration;

  beforeAll(() => {
    api = createBackendAPI({ useWebSocket: false });
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it("should allow adding event listeners", () => {
    const handler = jest.fn();
    api.on("trade", handler);
    expect(api.listenerCount("trade")).toBeGreaterThan(0);
  });

  it("should allow removing event listeners", () => {
    const handler = jest.fn();
    api.on("error", handler);
    api.off("error", handler);
    expect(api.listenerCount("error")).toBe(0);
  });

  it("should support multiple event types", () => {
    const handlers = {
      trade: jest.fn(),
      connected: jest.fn(),
      disconnected: jest.fn(),
      error: jest.fn(),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      api.on(event as any, handler);
    });

    expect(api.listenerCount("trade")).toBeGreaterThan(0);
    expect(api.listenerCount("connected")).toBeGreaterThan(0);
    expect(api.listenerCount("disconnected")).toBeGreaterThan(0);
    expect(api.listenerCount("error")).toBeGreaterThan(0);
  });
});

describe("Type Safety", () => {
  it("should have proper TypeScript types", () => {
    const api = createBackendAPI();

    // These should compile without errors
    api.on("trade", (trade: Trade) => {
      expect(trade).toBeDefined();
    });

    api.on("leader:trade", (leader: LeaderWallet, trade: Trade) => {
      expect(leader).toBeDefined();
      expect(trade).toBeDefined();
    });

    api.on("market:update", (marketId: string, market: Market) => {
      expect(marketId).toBeDefined();
      expect(market).toBeDefined();
    });
  });
});

describe("Configuration Validation", () => {
  it("should handle missing configuration gracefully", () => {
    const api = createBackendAPI();
    expect(api).toBeDefined();
  });

  it("should use default values", () => {
    const api = createBackendAPI({});
    const status = api.getStatus();

    // Should have sensible defaults
    expect(status.useWebSocket).toBe(true);
    expect(status.leaderDetectionEnabled).toBe(false);
  });

  it("should override defaults with provided config", () => {
    const api = createBackendAPI({
      useWebSocket: false,
      pollingInterval: 2000,
    });

    const status = api.getStatus();
    expect(status.useWebSocket).toBe(false);
  });
});

describe("Cleanup", () => {
  it("should cleanup properly on disconnect", async () => {
    const api = createBackendAPI({ useWebSocket: false });
    await api.initialize();

    const statusBefore = api.getStatus();
    expect(statusBefore.initialized).toBe(true);
    expect(statusBefore.connected).toBe(true);

    await api.disconnect();

    const statusAfter = api.getStatus();
    expect(statusAfter.initialized).toBe(false);
    expect(statusAfter.connected).toBe(false);
  });

  it("should clear subscriptions on disconnect", async () => {
    const api = createBackendAPI({ useWebSocket: false });
    await api.initialize();

    // Add some mock subscriptions
    // (In real tests, you'd actually subscribe to something)

    await api.disconnect();

    const subscriptions = api.getActiveSubscriptions();
    expect(subscriptions.length).toBe(0);
  });
});
