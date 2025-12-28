/**
 * Polymarket Integration Module
 * Main export file for all Polymarket functionality
 */

// Types
export * from "./types";

// Clients
export { PolymarketRestClient, polymarketClient } from "./rest-client";
export { PolymarketWSClient, polymarketWSClient } from "./ws-client";
export { LeaderWalletDetector, leaderDetector } from "./leader-detector";

// Re-export for convenience
import { polymarketClient } from "./rest-client";
import { polymarketWSClient } from "./ws-client";
import { leaderDetector } from "./leader-detector";

export const polymarket = {
  rest: polymarketClient,
  ws: polymarketWSClient,
  leader: leaderDetector,
};

export default polymarket;
