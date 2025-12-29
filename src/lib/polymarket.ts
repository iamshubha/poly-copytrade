import axios, { AxiosInstance } from "axios";
import { PolymarketMarket, PolymarketOrder } from "@/types";

class PolymarketClient {
  private client: AxiosInstance;
  private wsUrl: string;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.POLYMARKET_API_URL || "https://clob.polymarket.com",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 10000,
    });

    this.wsUrl =
      process.env.POLYMARKET_WS_URL ||
      "wss://ws-subscriptions-clob.polymarket.com";
  }

  // Get all active markets
  async getMarkets(params?: {
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PolymarketMarket[]> {
    try {
      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.append("limit", String(params?.limit || 20));

      if (params?.active !== undefined) {
        queryParams.append("active", String(params.active));
      }
      if (params?.closed !== undefined) {
        queryParams.append("closed", String(params.closed));
      }
      if (params?.offset) {
        queryParams.append("offset", String(params.offset));
      }

      const baseURL =
        process.env.POLYMARKET_API_URL || "https://clob.polymarket.com";
      const url = `${baseURL}/markets?${queryParams.toString()}`;

      console.log("[Polymarket Client] Fetching from:", url);
      // Use fetch instead of axios to avoid Bun compatibility issues
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // CLOB API returns nested in 'data' property, Gamma API returns array directly
      const markets = Array.isArray(data)
        ? data
        : data?.data || data?.markets || [];

      // Map API response to our format
      return markets.map((market: any) => {
        // Parse JSON strings if they exist
        let outcomes = market.outcomes || ["Yes", "No"];
        let outcomePrices = market.outcomePrices || market.outcome_prices || [];

        // Handle JSON strings
        if (typeof outcomes === "string") {
          try {
            outcomes = JSON.parse(outcomes);
          } catch (e) {
            outcomes = ["Yes", "No"];
          }
        }

        if (typeof outcomePrices === "string") {
          try {
            outcomePrices = JSON.parse(outcomePrices);
          } catch (e) {
            outcomePrices = [];
          }
        }

        // Extract prices from tokens array if outcomePrices is empty
        if (
          (!outcomePrices || outcomePrices.length === 0) &&
          market.tokens &&
          Array.isArray(market.tokens)
        ) {
          outcomePrices = market.tokens.map((token: any) => {
            const price = parseFloat(token.price || "0.5");
            return price;
          });
        }

        const mapped = {
          id: market.condition_id || market.id,
          condition_id: market.condition_id || market.id,
          question: market.question || market.title,
          description: market.description || "",
          outcomes,
          outcomePrices,
          volume: market.volume || "0",
          liquidity: market.liquidity || "0",
          active: market.active !== false,
          closed: market.closed || false,
          market_slug: market.market_slug || market.slug || "",
          end_date_iso:
            market.end_date_iso || market.endDate || new Date().toISOString(),
          tags: market.tags || [],
          image: market.image || market.icon,
        };
        return mapped;
      });
    } catch (error: any) {
      console.error("Error fetching markets:", error.message);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  }

  // Get specific market by ID
  async getMarket(marketId: string): Promise<PolymarketMarket> {
    try {
      const baseURL =
        process.env.POLYMARKET_API_URL || "https://clob.polymarket.com";
      const url = `${baseURL}/markets/${marketId}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const market = data?.data || data;

      // Parse outcomes and prices
      let outcomes = market.outcomes || ["Yes", "No"];
      let outcomePrices = market.outcomePrices || market.outcome_prices || [];

      if (typeof outcomes === "string") {
        try {
          outcomes = JSON.parse(outcomes);
        } catch (e) {
          outcomes = ["Yes", "No"];
        }
      }

      if (typeof outcomePrices === "string") {
        try {
          outcomePrices = JSON.parse(outcomePrices);
        } catch (e) {
          outcomePrices = [];
        }
      }

      // Extract prices from tokens if needed
      if (
        (!outcomePrices || outcomePrices.length === 0) &&
        market.tokens &&
        Array.isArray(market.tokens)
      ) {
        outcomePrices = market.tokens.map((token: any) =>
          parseFloat(token.price || "0.5")
        );
      }

      return {
        id: market.id || market.condition_id || market.conditionId,
        condition_id: market.conditionId || market.condition_id,
        question: market.question || market.title,
        description: market.description || "",
        outcomes,
        outcomePrices,
        volume: market.volume || "0",
        liquidity: market.liquidity || "0",
        active: market.active !== false,
        closed: market.closed || false,
        market_slug: market.market_slug || market.slug || "",
        end_date_iso:
          market.end_date_iso || market.endDate || new Date().toISOString(),
        tags: market.tags || [],
        image: market.image || market.icon,
      };
    } catch (error) {
      console.error("Error fetching market:", error);
      throw error;
    }
  }

  // Get order book for a market
  async getOrderBook(marketId: string) {
    try {
      const response = await this.client.get(`/book`, {
        params: { token_id: marketId },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching order book:", error);
      throw error;
    }
  }

  // Get recent trades for a market
  async getMarketTrades(
    marketId: string,
    limit: number = 100
  ): Promise<PolymarketOrder[]> {
    try {
      const response = await this.client.get(`/trades`, {
        params: { market: marketId, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching market trades:", error);
      throw error;
    }
  }

  // Get trades by wallet address
  async getWalletTrades(
    address: string,
    limit: number = 100
  ): Promise<PolymarketOrder[]> {
    try {
      const response = await this.client.get(`/trades`, {
        params: { maker: address, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching wallet trades:", error);
      throw error;
    }
  }

  // Get current prices for a market
  async getMarketPrices(
    marketId: string
  ): Promise<{ yes: number; no: number }> {
    try {
      const orderBook = await this.getOrderBook(marketId);

      // Calculate mid prices from order book
      const yesBids = orderBook.bids?.[0] || [];
      const yesAsks = orderBook.asks?.[0] || [];
      const noBids = orderBook.bids?.[1] || [];
      const noAsks = orderBook.asks?.[1] || [];

      const yesPrice =
        yesBids.length && yesAsks.length
          ? (parseFloat(yesBids[0].price) + parseFloat(yesAsks[0].price)) / 2
          : 0.5;

      const noPrice =
        noBids.length && noAsks.length
          ? (parseFloat(noBids[0].price) + parseFloat(noAsks[0].price)) / 2
          : 0.5;

      return { yes: yesPrice, no: noPrice };
    } catch (error) {
      console.error("Error fetching market prices:", error);
      return { yes: 0.5, no: 0.5 };
    }
  }

  // Create a buy order
  async createBuyOrder(params: {
    marketId: string;
    outcomeIndex: number;
    amount: number; // USDC
    price: number; // 0-1
    maker: string; // wallet address
  }) {
    try {
      // In production, this would create an actual order on Polymarket
      // For now, return a mock response
      return {
        id: `order-${Date.now()}`,
        status: "PENDING",
        ...params,
      };
    } catch (error) {
      console.error("Error creating buy order:", error);
      throw error;
    }
  }

  // Create a sell order
  async createSellOrder(params: {
    marketId: string;
    outcomeIndex: number;
    shares: number;
    price: number;
    maker: string;
  }) {
    try {
      return {
        id: `order-${Date.now()}`,
        status: "PENDING",
        ...params,
      };
    } catch (error) {
      console.error("Error creating sell order:", error);
      throw error;
    }
  }

  // Get user's positions
  async getUserPositions(address: string) {
    try {
      const response = await this.client.get(`/positions`, {
        params: { user: address },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user positions:", error);
      throw error;
    }
  }

  // Monitor real-time trades via WebSocket
  subscribeToTrades(
    address: string,
    callback: (trade: PolymarketOrder) => void
  ) {
    try {
      const ws = new WebSocket(`${this.wsUrl}/trades?user=${address}`);

      ws.onmessage = (event) => {
        const trade = JSON.parse(event.data);
        callback(trade);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return ws;
    } catch (error) {
      console.error("Error subscribing to trades:", error);
      throw error;
    }
  }

  // Calculate expected shares for an amount at a price
  calculateShares(amount: number, price: number): number {
    return amount / price;
  }

  // Calculate expected cost for shares at a price
  calculateCost(shares: number, price: number): number {
    return shares * price;
  }

  // Validate trade parameters
  validateTrade(params: {
    amount: number;
    price: number;
    minAmount?: number;
    maxAmount?: number;
  }): { valid: boolean; error?: string } {
    const { amount, price, minAmount = 1, maxAmount = 10000 } = params;

    if (amount < minAmount) {
      return {
        valid: false,
        error: `Amount must be at least ${minAmount} USDC`,
      };
    }

    if (maxAmount && amount > maxAmount) {
      return {
        valid: false,
        error: `Amount must not exceed ${maxAmount} USDC`,
      };
    }

    if (price <= 0 || price >= 1) {
      return { valid: false, error: "Price must be between 0 and 1" };
    }

    return { valid: true };
  }
}

export const polymarketClient = new PolymarketClient();
export default polymarketClient;
