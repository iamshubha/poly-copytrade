import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { polymarketClient } from "@/lib/polymarket";

// Mock axios
jest.mock("axios");

describe("Polymarket Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should validate trade parameters correctly", () => {
    const validTrade = {
      amount: 100,
      price: 0.5,
      minAmount: 1,
      maxAmount: 1000,
    };

    const result = polymarketClient.validateTrade(validTrade);
    expect(result.valid).toBe(true);
  });

  it("should reject trade below minimum amount", () => {
    const invalidTrade = {
      amount: 0.5,
      price: 0.5,
      minAmount: 1,
    };

    const result = polymarketClient.validateTrade(invalidTrade);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("at least");
  });

  it("should reject trade above maximum amount", () => {
    const invalidTrade = {
      amount: 1500,
      price: 0.5,
      minAmount: 1,
      maxAmount: 1000,
    };

    const result = polymarketClient.validateTrade(invalidTrade);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not exceed");
  });

  it("should reject invalid price", () => {
    const invalidTrade1 = {
      amount: 100,
      price: 0,
    };

    const invalidTrade2 = {
      amount: 100,
      price: 1,
    };

    const result1 = polymarketClient.validateTrade(invalidTrade1);
    const result2 = polymarketClient.validateTrade(invalidTrade2);

    expect(result1.valid).toBe(false);
    expect(result2.valid).toBe(false);
  });

  it("should calculate shares correctly", () => {
    const amount = 100;
    const price = 0.5;
    const expectedShares = 200;

    const shares = polymarketClient.calculateShares(amount, price);
    expect(shares).toBe(expectedShares);
  });

  it("should calculate cost correctly", () => {
    const shares = 200;
    const price = 0.5;
    const expectedCost = 100;

    const cost = polymarketClient.calculateCost(shares, price);
    expect(cost).toBe(expectedCost);
  });
});
