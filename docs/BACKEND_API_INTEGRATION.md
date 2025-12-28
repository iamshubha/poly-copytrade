# Backend API Integration Module

Complete backend API integration for Polymarket trading with WebSocket/REST support, market stats, and leader wallet detection.

## Features

🔹 **Trade Subscriptions** - Real-time or polling-based trade data  
🔹 **Market Stats** - Comprehensive market statistics and filtering  
🔹 **Leader Detection** - Automatic detection and monitoring of high-performing wallets  
🔹 **Event-Driven** - Rich event system for reactive applications  
🔹 **Type-Safe** - Full TypeScript support with detailed interfaces  
🔹 **Caching** - Built-in caching for optimal performance  
🔹 **Flexible** - WebSocket or REST polling modes

---

## Quick Start

### Installation

```typescript
import { getBackendAPI } from '@/lib/backend-api-integration';

// Get singleton instance
const api = getBackendAPI({
  useWebSocket: true,
  leaderDetection: {
    enabled: true,
  },
});

// Initialize
await api.initialize();
```

### Basic Usage

```typescript
// Subscribe to market trades
await api.subscribeToMarketTrades('market-id');

// Listen for trades
api.on('trade', (trade) => {
  console.log('New trade:', trade);
});

// Fetch market stats
const stats = await api.fetchMarketStats('market-id');

// Detect leader wallets
const leaders = await api.detectLeaderWallets();
```

---

## Configuration

### BackendAPIConfig

```typescript
interface BackendAPIConfig {
  // Connection
  apiUrl?: string;              // API endpoint URL
  wsUrl?: string;               // WebSocket endpoint URL
  apiKey?: string;              // Optional API key
  timeout?: number;             // Request timeout (ms)
  
  // Mode
  useWebSocket?: boolean;       // Use WebSocket (true) or REST polling (false)
  pollingInterval?: number;     // Polling interval in ms (default: 5000)
  autoReconnect?: boolean;      // Auto-reconnect on disconnect (default: true)
  
  // Leader Detection
  leaderDetection?: {
    enabled: boolean;           // Enable leader detection
    minVolume?: number;         // Minimum volume threshold
    minTrades?: number;         // Minimum number of trades
    minWinRate?: number;        // Minimum win rate (0-1)
    updateInterval?: number;    // Update interval in ms
  };
}
```

### Example Configurations

#### Production (WebSocket)
```typescript
const api = getBackendAPI({
  useWebSocket: true,
  autoReconnect: true,
  leaderDetection: {
    enabled: true,
    minVolume: 100000,
    minTrades: 100,
    minWinRate: 0.60,
  },
});
```

#### Development (REST Polling)
```typescript
const api = getBackendAPI({
  useWebSocket: false,
  pollingInterval: 3000,
  leaderDetection: {
    enabled: false,
  },
});
```

---

## API Reference

### Initialization & Connection

#### `initialize(): Promise<void>`
Initialize the API integration and establish connections.

```typescript
await api.initialize();
```

#### `disconnect(): Promise<void>`
Disconnect and cleanup all resources.

```typescript
await api.disconnect();
```

#### `getStatus()`
Get current connection and subscription status.

```typescript
const status = api.getStatus();
console.log(status);
// {
//   initialized: true,
//   connected: true,
//   useWebSocket: true,
//   subscriptions: [...],
//   leaderDetectionEnabled: true,
//   monitoredLeaders: 5
// }
```

---

### Trade Subscriptions

#### `subscribeToMarketTrades(marketId: string, options?): Promise<string>`
Subscribe to trades for a specific market.

```typescript
const subscriptionId = await api.subscribeToMarketTrades('market-id');

// With options
const subId = await api.subscribeToMarketTrades('market-id', {
  useWebSocket: false, // Override default mode
});
```

**Returns:** Subscription ID for unsubscribing later

#### `subscribeToWalletTrades(walletAddress: string, options?): Promise<string>`
Subscribe to trades from a specific wallet.

```typescript
const subscriptionId = await api.subscribeToWalletTrades('0x123...');
```

#### `subscribeToAllTrades(options?): Promise<string>`
Subscribe to all trades across all markets (requires WebSocket).

```typescript
const subscriptionId = await api.subscribeToAllTrades();
```

#### `unsubscribe(subscriptionId: string): Promise<void>`
Unsubscribe from a trade subscription.

```typescript
await api.unsubscribe(subscriptionId);
```

#### `getActiveSubscriptions(): TradeSubscription[]`
Get all active subscriptions.

```typescript
const subs = api.getActiveSubscriptions();
subs.forEach(sub => {
  console.log(`${sub.id}: ${sub.type}`);
});
```

---

### Market Stats

#### `fetchMarketStats(marketId: string, useCache?): Promise<MarketStats>`
Fetch statistics for a specific market.

```typescript
const stats = await api.fetchMarketStats('market-id');
console.log({
  volume24h: stats.volume_24h,
  liquidity: stats.liquidity,
  tradesCount: stats.trades_count_24h,
  priceChange: stats.price_change_24h,
});
```

**Parameters:**
- `marketId` - Market condition ID
- `useCache` - Use cached data if available (default: true)

**Returns:** `MarketStats` object

#### `fetchMultipleMarketStats(marketIds: string[], useCache?): Promise<Map<string, MarketStats>>`
Fetch stats for multiple markets concurrently.

```typescript
const marketIds = ['market-1', 'market-2', 'market-3'];
const statsMap = await api.fetchMultipleMarketStats(marketIds);

statsMap.forEach((stats, marketId) => {
  console.log(`${marketId}: $${stats.volume_24h}`);
});
```

#### `fetchMarket(marketId: string, useCache?): Promise<Market>`
Fetch detailed market information.

```typescript
const market = await api.fetchMarket('market-id');
console.log({
  question: market.question,
  volume: market.volume,
  endDate: market.end_date_iso,
  active: market.active,
});
```

#### `searchMarkets(filter?: MarketFilter): Promise<Market[]>`
Search and filter markets.

```typescript
const markets = await api.searchMarkets({
  active: true,
  category: 'sports',
  min_volume: 10000,
  limit: 20,
  order_by: 'volume',
  order_dir: 'desc',
});
```

**MarketFilter Options:**
```typescript
interface MarketFilter {
  active?: boolean;
  closed?: boolean;
  archived?: boolean;
  category?: string;
  tags?: string[];
  min_volume?: number;
  min_liquidity?: number;
  limit?: number;
  offset?: number;
  order_by?: 'volume' | 'liquidity' | 'end_date' | 'created_at';
  order_dir?: 'asc' | 'desc';
}
```

#### `getTrendingMarkets(limit?): Promise<Market[]>`
Get trending markets sorted by volume.

```typescript
const trending = await api.getTrendingMarkets(10);
trending.forEach(market => {
  console.log(`${market.question}: $${market.volume}`);
});
```

---

### Leader Wallet Detection

#### `detectLeaderWallets(): Promise<LeaderWallet[]>`
Discover and cache leader wallets based on configured criteria.

```typescript
const leaders = await api.detectLeaderWallets();
leaders.forEach(leader => {
  console.log(`${leader.address}: $${leader.stats.total_volume}`);
});
```

#### `isLeaderWallet(walletAddress: string): Promise<boolean>`
Check if a wallet meets leader criteria.

```typescript
const isLeader = await api.isLeaderWallet('0x123...');
if (isLeader) {
  console.log('This wallet is a leader!');
}
```

#### `getLeaderWalletDetails(walletAddress: string): Promise<LeaderWallet | null>`
Get detailed information about a leader wallet.

```typescript
const details = await api.getLeaderWalletDetails('0x123...');
if (details) {
  console.log({
    volume: details.stats.total_volume,
    trades: details.stats.total_trades,
    winRate: details.stats.win_rate,
    pnl: details.stats.total_pnl,
  });
}
```

#### `monitorLeaderWallet(walletAddress: string): Promise<void>`
Start monitoring a specific leader wallet for trades.

```typescript
await api.monitorLeaderWallet('0x123...');
// Now receive 'leader:trade' events for this wallet
```

#### `getMonitoredLeaders(): string[]`
Get list of currently monitored leader wallets.

```typescript
const monitored = api.getMonitoredLeaders();
console.log(`Monitoring ${monitored.length} leaders`);
```

---

### Wallet Stats

#### `fetchWalletStats(walletAddress: string): Promise<WalletStats>`
Fetch statistics for any wallet.

```typescript
const stats = await api.fetchWalletStats('0x123...');
console.log({
  volume: stats.total_volume,
  trades: stats.total_trades,
  winRate: stats.win_rate,
  pnl: stats.total_pnl,
});
```

#### `fetchWalletPositions(walletAddress: string)`
Fetch current positions for a wallet.

```typescript
const positions = await api.fetchWalletPositions('0x123...');
positions.forEach(pos => {
  console.log(`${pos.market_id}: ${pos.size} @ ${pos.average_entry_price}`);
});
```

---

## Events

The API uses Node.js EventEmitter for reactive programming.

### Trade Events

#### `trade`
Emitted for every trade from all subscriptions.

```typescript
api.on('trade', (trade: Trade) => {
  console.log('New trade:', trade.id);
});
```

#### `trade:market`
Emitted for trades in a specific market.

```typescript
api.on('trade:market', (marketId: string, trade: Trade) => {
  console.log(`Trade in ${marketId}:`, trade.side, trade.price);
});
```

#### `trade:wallet`
Emitted for trades from a specific wallet.

```typescript
api.on('trade:wallet', (walletAddress: string, trade: Trade) => {
  console.log(`Trade from ${walletAddress}:`, trade);
});
```

#### `trade:leader`
Emitted when a leader wallet makes a trade.

```typescript
api.on('trade:leader', (leader: LeaderWallet, trade: Trade) => {
  console.log('Leader trade detected!');
  console.log('Leader:', leader.address);
  console.log('Trade:', trade);
});
```

### Market Events

#### `market:update`
Emitted when market data is updated.

```typescript
api.on('market:update', (marketId: string, market: Market) => {
  console.log(`Market ${marketId} updated`);
});
```

#### `market:stats`
Emitted when market stats are fetched.

```typescript
api.on('market:stats', (marketId: string, stats: MarketStats) => {
  console.log(`Stats for ${marketId}:`, stats.volume_24h);
});
```

### Leader Events

#### `leader:detected`
Emitted when a new leader wallet is discovered.

```typescript
api.on('leader:detected', (wallet: LeaderWallet) => {
  console.log('New leader:', wallet.address);
});
```

#### `leader:trade`
Emitted when a monitored leader makes a trade.

```typescript
api.on('leader:trade', (wallet: LeaderWallet, trade: Trade) => {
  console.log('Leader trade!');
  // Implement copy trading logic here
});
```

### Connection Events

#### `connected`
Emitted when successfully connected.

```typescript
api.on('connected', () => {
  console.log('API connected');
});
```

#### `disconnected`
Emitted when disconnected.

```typescript
api.on('disconnected', () => {
  console.log('API disconnected');
});
```

#### `error`
Emitted on errors.

```typescript
api.on('error', (error: Error) => {
  console.error('API error:', error.message);
});
```

---

## Type Definitions

### Trade
```typescript
interface Trade {
  id: string;
  market: string;
  asset_id: string;
  side: 'BUY' | 'SELL';
  price: string;
  size: string;
  timestamp: string;
  maker_address: string;
  taker_address: string;
  transaction_hash?: string;
  fee_rate_bps?: number;
  status: 'MATCHED' | 'SETTLED';
}
```

### Market
```typescript
interface Market {
  condition_id: string;
  question: string;
  description?: string;
  market_slug: string;
  end_date_iso: string;
  volume: string;
  liquidity?: string;
  outcomes: string[];
  outcomePrices?: string[];
  active: boolean;
  closed: boolean;
  archived: boolean;
  category?: string;
  tags?: string[];
}
```

### MarketStats
```typescript
interface MarketStats {
  market_id: string;
  volume_24h: number;
  volume_total: number;
  liquidity: number;
  price_change_24h: number;
  trades_count_24h: number;
  unique_traders_24h: number;
  last_trade_time?: string;
}
```

### LeaderWallet
```typescript
interface LeaderWallet {
  address: string;
  stats: WalletStats;
  recent_trades: Trade[];
  active_positions: WalletPosition[];
  is_verified?: boolean;
  rank?: number;
}
```

### WalletStats
```typescript
interface WalletStats {
  wallet_address: string;
  total_volume: number;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  active_positions: number;
  markets_traded: number;
  last_trade_time: string;
  reputation_score?: number;
}
```

---

## Usage Patterns

### Pattern 1: Copy Trading Bot

```typescript
const api = getBackendAPI({
  useWebSocket: true,
  leaderDetection: {
    enabled: true,
    minVolume: 100000,
    minWinRate: 0.65,
  },
});

await api.initialize();

// Discover leaders
const leaders = await api.detectLeaderWallets();

// Monitor top 10 leaders
for (const leader of leaders.slice(0, 10)) {
  await api.monitorLeaderWallet(leader.address);
}

// Listen for leader trades
api.on('leader:trade', async (leader, trade) => {
  const marketStats = await api.fetchMarketStats(trade.market);
  
  if (marketStats.liquidity > 50000) {
    // Execute copy trade
    console.log('Copying trade:', trade);
  }
});
```

### Pattern 2: Market Analysis Dashboard

```typescript
const api = getBackendAPI({ useWebSocket: true });
await api.initialize();

// Get trending markets
const trending = await api.getTrendingMarkets(20);

// Subscribe to all trending markets
for (const market of trending) {
  await api.subscribeToMarketTrades(market.condition_id);
}

// Aggregate market data
const marketData = new Map();

api.on('trade:market', (marketId, trade) => {
  if (!marketData.has(marketId)) {
    marketData.set(marketId, { trades: [], volume: 0 });
  }
  
  const data = marketData.get(marketId);
  data.trades.push(trade);
  data.volume += parseFloat(trade.size);
});

// Update dashboard every 10 seconds
setInterval(() => {
  marketData.forEach((data, marketId) => {
    console.log(`${marketId}: ${data.trades.length} trades, $${data.volume} volume`);
  });
}, 10000);
```

### Pattern 3: Wallet Tracker

```typescript
const api = getBackendAPI({ useWebSocket: true });
await api.initialize();

const walletToTrack = '0x123...';

// Subscribe to wallet trades
await api.subscribeToWalletTrades(walletToTrack);

// Get wallet stats
const stats = await api.fetchWalletStats(walletToTrack);
console.log('Wallet Stats:', stats);

// Monitor trades
api.on('trade:wallet', async (wallet, trade) => {
  console.log('New trade from tracked wallet:');
  
  // Get market info
  const market = await api.fetchMarket(trade.market);
  console.log(`Market: ${market.question}`);
  console.log(`Side: ${trade.side}`);
  console.log(`Price: ${trade.price}`);
  console.log(`Size: ${trade.size}`);
});
```

---

## Error Handling

```typescript
const api = getBackendAPI();

// Listen for errors
api.on('error', (error: Error) => {
  console.error('API Error:', error.message);
  
  // Implement retry logic
  if (error.message.includes('connection')) {
    setTimeout(() => api.initialize(), 5000);
  }
});

// Wrap API calls in try-catch
try {
  const stats = await api.fetchMarketStats('market-id');
} catch (error) {
  console.error('Failed to fetch stats:', error);
  // Handle error appropriately
}
```

---

## Best Practices

1. **Always initialize before use**
   ```typescript
   await api.initialize();
   ```

2. **Cleanup on shutdown**
   ```typescript
   process.on('SIGINT', async () => {
     await api.disconnect();
     process.exit(0);
   });
   ```

3. **Use caching for frequently accessed data**
   ```typescript
   const stats = await api.fetchMarketStats('market-id', true);
   ```

4. **Limit subscriptions**
   - Don't subscribe to hundreds of markets simultaneously
   - Use polling for less critical data

5. **Handle errors gracefully**
   ```typescript
   api.on('error', (error) => {
     // Log and handle errors
   });
   ```

6. **Monitor connection status**
   ```typescript
   api.on('disconnected', () => {
     // Handle reconnection
   });
   ```

---

## Performance Tips

- Use WebSocket mode for real-time updates
- Use REST polling for less frequent updates
- Enable caching for market stats (1 minute TTL by default)
- Limit concurrent subscriptions
- Use `fetchMultipleMarketStats()` for batch requests
- Clear cache periodically with `api.clearCache()`

---

## Examples

See [examples/backend-api-usage.ts](../examples/backend-api-usage.ts) for complete working examples:

- Basic setup and initialization
- WebSocket and polling subscriptions
- Market stats and filtering
- Leader wallet detection
- Complete trading bot implementation
- Event-driven architecture

---

## Support

For issues or questions:
- Check the examples directory
- Review type definitions in `src/lib/polymarket/types.ts`
- See individual client documentation:
  - [REST Client](./src/lib/polymarket/rest-client.ts)
  - [WebSocket Client](./src/lib/polymarket/ws-client.ts)
  - [Leader Detector](./src/lib/polymarket/leader-detector.ts)
