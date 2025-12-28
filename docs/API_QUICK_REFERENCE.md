# Backend API Integration - Quick Reference

Quick reference for the Backend API Integration Module.

## Import

```typescript
import { getBackendAPI, createBackendAPI } from '@/lib/backend-api-integration';
```

## Setup

```typescript
// Singleton instance
const api = getBackendAPI({ useWebSocket: true });

// Or new instance
const api = createBackendAPI({ useWebSocket: true });

// Initialize
await api.initialize();
```

## Trade Subscriptions

```typescript
// Subscribe to market trades
const subId = await api.subscribeToMarketTrades('market-id');

// Subscribe to wallet trades
const subId = await api.subscribeToWalletTrades('0x123...');

// Subscribe to all trades (WebSocket only)
const subId = await api.subscribeToAllTrades();

// Unsubscribe
await api.unsubscribe(subId);
```

## Market Stats

```typescript
// Single market
const stats = await api.fetchMarketStats('market-id');

// Multiple markets
const statsMap = await api.fetchMultipleMarketStats(['id1', 'id2']);

// Market details
const market = await api.fetchMarket('market-id');

// Search markets
const markets = await api.searchMarkets({
  active: true,
  category: 'sports',
  min_volume: 10000,
  limit: 20,
});

// Trending markets
const trending = await api.getTrendingMarkets(10);
```

## Leader Detection

```typescript
// Discover leaders
const leaders = await api.detectLeaderWallets();

// Check if leader
const isLeader = await api.isLeaderWallet('0x123...');

// Get leader details
const details = await api.getLeaderWalletDetails('0x123...');

// Monitor leader
await api.monitorLeaderWallet('0x123...');

// Get monitored leaders
const monitored = api.getMonitoredLeaders();
```

## Wallet Stats

```typescript
// Get wallet stats
const stats = await api.fetchWalletStats('0x123...');

// Get wallet positions
const positions = await api.fetchWalletPositions('0x123...');
```

## Events

```typescript
// All trades
api.on('trade', (trade) => { /* ... */ });

// Market trades
api.on('trade:market', (marketId, trade) => { /* ... */ });

// Wallet trades
api.on('trade:wallet', (wallet, trade) => { /* ... */ });

// Leader trades
api.on('leader:trade', (leader, trade) => { /* ... */ });

// Market updates
api.on('market:update', (marketId, market) => { /* ... */ });
api.on('market:stats', (marketId, stats) => { /* ... */ });

// Connection
api.on('connected', () => { /* ... */ });
api.on('disconnected', () => { /* ... */ });
api.on('error', (error) => { /* ... */ });
```

## Status & Utilities

```typescript
// Get status
const status = api.getStatus();

// Get subscriptions
const subs = api.getActiveSubscriptions();

// Clear cache
api.clearCache();

// Disconnect
await api.disconnect();
```

## Configuration Options

```typescript
{
  // Connection
  apiUrl?: string,
  wsUrl?: string,
  apiKey?: string,
  timeout?: number,
  
  // Mode
  useWebSocket?: boolean,        // default: true
  pollingInterval?: number,      // default: 5000ms
  autoReconnect?: boolean,       // default: true
  
  // Leader Detection
  leaderDetection?: {
    enabled: boolean,            // default: false
    minVolume?: number,          // default: 100000
    minTrades?: number,          // default: 100
    minWinRate?: number,         // default: 0.55
    updateInterval?: number,     // default: 300000ms
  }
}
```

## Common Patterns

### Copy Trading Bot
```typescript
const api = getBackendAPI({
  useWebSocket: true,
  leaderDetection: { enabled: true, minWinRate: 0.65 },
});

await api.initialize();
const leaders = await api.detectLeaderWallets();

for (const leader of leaders.slice(0, 10)) {
  await api.monitorLeaderWallet(leader.address);
}

api.on('leader:trade', async (leader, trade) => {
  const stats = await api.fetchMarketStats(trade.market);
  if (stats.liquidity > 50000) {
    // Copy trade
  }
});
```

### Market Monitor
```typescript
const api = getBackendAPI({ useWebSocket: true });
await api.initialize();

const markets = await api.getTrendingMarkets(20);
for (const market of markets) {
  await api.subscribeToMarketTrades(market.condition_id);
}

api.on('trade:market', (marketId, trade) => {
  console.log(`Trade in ${marketId}`);
});
```

### Wallet Tracker
```typescript
const api = getBackendAPI({ useWebSocket: true });
await api.initialize();

await api.subscribeToWalletTrades('0x123...');

api.on('trade:wallet', async (wallet, trade) => {
  const market = await api.fetchMarket(trade.market);
  console.log(`${wallet} traded on ${market.question}`);
});
```

## Error Handling

```typescript
// Global error handler
api.on('error', (error) => {
  console.error('API Error:', error);
});

// Try-catch for async operations
try {
  const stats = await api.fetchMarketStats('market-id');
} catch (error) {
  console.error('Failed:', error);
}
```

## Cleanup

```typescript
// Graceful shutdown
process.on('SIGINT', async () => {
  await api.disconnect();
  process.exit(0);
});
```

## Type Imports

```typescript
import type {
  Trade,
  Market,
  MarketStats,
  LeaderWallet,
  WalletStats,
  TradeFilter,
  MarketFilter,
} from '@/lib/polymarket/types';
```

## Quick Example

```typescript
import { getBackendAPI } from '@/lib/backend-api-integration';

async function main() {
  const api = getBackendAPI({ useWebSocket: true });
  await api.initialize();
  
  // Subscribe to market
  await api.subscribeToMarketTrades('market-id');
  
  // Listen for trades
  api.on('trade', (trade) => {
    console.log('Trade:', trade.side, trade.price);
  });
  
  // Get market stats
  const stats = await api.fetchMarketStats('market-id');
  console.log('Volume:', stats.volume_24h);
  
  // Cleanup
  process.on('SIGINT', () => api.disconnect());
}

main();
```
