# Implementation Guide - Backend API Integration

Step-by-step guide to implement the Backend API Integration Module in your application.

## 📋 Prerequisites

- Node.js/Bun installed
- TypeScript configured
- Existing Polymarket infrastructure (REST client, WS client, Leader detector)
- Environment variables configured

## 🚀 Implementation Steps

### Step 1: Import the Module

```typescript
import { getBackendAPI } from '@/lib/backend-api-integration';
```

### Step 2: Configure

```typescript
const api = getBackendAPI({
  // Connection settings
  apiUrl: process.env.POLYMARKET_API_URL,
  wsUrl: process.env.POLYMARKET_WS_URL,
  apiKey: process.env.POLYMARKET_API_KEY,
  
  // Mode selection
  useWebSocket: true,        // or false for REST polling
  pollingInterval: 5000,     // if using REST
  autoReconnect: true,
  
  // Leader detection (optional)
  leaderDetection: {
    enabled: true,
    minVolume: 100000,       // $100k minimum
    minTrades: 100,
    minWinRate: 0.60,        // 60%
    updateInterval: 300000,  // 5 minutes
  },
});
```

### Step 3: Initialize

```typescript
async function init() {
  try {
    await api.initialize();
    console.log('✅ API initialized');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  }
}
```

### Step 4: Set Up Event Handlers

```typescript
// Error handling (important!)
api.on('error', (error) => {
  console.error('API Error:', error.message);
  // Log to error tracking service
});

// Connection monitoring
api.on('connected', () => {
  console.log('✅ Connected');
});

api.on('disconnected', () => {
  console.log('❌ Disconnected');
});

// Trade events
api.on('trade', (trade) => {
  console.log('📊 Trade:', trade.id);
});

api.on('leader:trade', (leader, trade) => {
  console.log('🌟 Leader trade detected!');
  // Implement your copy logic here
});
```

### Step 5: Subscribe to Data

```typescript
// Subscribe to specific market
const marketSub = await api.subscribeToMarketTrades('market-condition-id');

// Subscribe to wallet
const walletSub = await api.subscribeToWalletTrades('0x123...');

// Subscribe to all trades (WebSocket only)
const allSub = await api.subscribeToAllTrades();
```

### Step 6: Fetch Market Stats

```typescript
// Single market
const stats = await api.fetchMarketStats('market-id');
console.log('Volume 24h:', stats.volume_24h);

// Multiple markets
const marketIds = ['id1', 'id2', 'id3'];
const statsMap = await api.fetchMultipleMarketStats(marketIds);

// Trending markets
const trending = await api.getTrendingMarkets(10);
```

### Step 7: Leader Detection (Optional)

```typescript
if (api.getStatus().leaderDetectionEnabled) {
  // Discover leaders
  const leaders = await api.detectLeaderWallets();
  console.log(`Found ${leaders.length} leaders`);
  
  // Monitor top leaders
  for (const leader of leaders.slice(0, 5)) {
    await api.monitorLeaderWallet(leader.address);
  }
  
  // Get monitored leaders
  const monitored = api.getMonitoredLeaders();
  console.log(`Monitoring ${monitored.length} leaders`);
}
```

### Step 8: Cleanup

```typescript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await api.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await api.disconnect();
  process.exit(0);
});
```

## 🎯 Complete Implementation Example

Here's a complete, copy-paste ready implementation:

```typescript
import { getBackendAPI } from '@/lib/backend-api-integration';

class TradingBot {
  private api: ReturnType<typeof getBackendAPI>;
  
  constructor() {
    this.api = getBackendAPI({
      useWebSocket: true,
      leaderDetection: {
        enabled: true,
        minVolume: 100000,
        minWinRate: 0.65,
      },
    });
  }
  
  async initialize() {
    // Set up event handlers
    this.setupEventHandlers();
    
    // Initialize API
    await this.api.initialize();
    
    // Set up subscriptions
    await this.setupSubscriptions();
    
    console.log('✅ Bot initialized');
  }
  
  private setupEventHandlers() {
    // Error handling
    this.api.on('error', (error) => {
      console.error('❌ Error:', error.message);
    });
    
    // Connection events
    this.api.on('connected', () => {
      console.log('✅ Connected to API');
    });
    
    this.api.on('disconnected', () => {
      console.log('❌ Disconnected from API');
    });
    
    // Trade events
    this.api.on('trade', (trade) => {
      this.handleTrade(trade);
    });
    
    this.api.on('leader:trade', (leader, trade) => {
      this.handleLeaderTrade(leader, trade);
    });
  }
  
  private async setupSubscriptions() {
    // Get trending markets
    const trending = await this.api.getTrendingMarkets(20);
    console.log(`Subscribing to ${trending.length} trending markets`);
    
    // Subscribe to each
    for (const market of trending) {
      await this.api.subscribeToMarketTrades(market.condition_id);
    }
    
    // Discover and monitor leaders
    const leaders = await this.api.detectLeaderWallets();
    console.log(`Found ${leaders.length} leaders`);
    
    for (const leader of leaders.slice(0, 10)) {
      await this.api.monitorLeaderWallet(leader.address);
    }
  }
  
  private async handleTrade(trade: any) {
    // Log all trades
    console.log('📊 Trade:', {
      market: trade.market.slice(0, 8) + '...',
      side: trade.side,
      price: trade.price,
      size: trade.size,
    });
  }
  
  private async handleLeaderTrade(leader: any, trade: any) {
    console.log('\n🌟 LEADER TRADE DETECTED!');
    console.log('Leader:', leader.address.slice(0, 10) + '...');
    console.log('Win Rate:', `${(leader.stats.win_rate * 100).toFixed(2)}%`);
    
    // Fetch market stats for decision making
    const marketStats = await this.api.fetchMarketStats(trade.market);
    
    // Decision logic
    if (
      leader.stats.win_rate > 0.65 &&
      marketStats.liquidity > 50000 &&
      parseFloat(trade.size) > 100
    ) {
      console.log('✅ Trade meets criteria - would copy');
      // Implement your copy logic here
      await this.copyTrade(leader, trade);
    } else {
      console.log('⏭️  Trade does not meet criteria - skipping');
    }
  }
  
  private async copyTrade(leader: any, trade: any) {
    // Implement your copy trading logic here
    console.log('Copying trade...');
    // e.g., call your order execution API
  }
  
  async shutdown() {
    console.log('Shutting down bot...');
    await this.api.disconnect();
  }
  
  getStatus() {
    return this.api.getStatus();
  }
}

// Usage
async function main() {
  const bot = new TradingBot();
  
  // Initialize
  await bot.initialize();
  
  // Monitor status
  setInterval(() => {
    const status = bot.getStatus();
    console.log('\n📊 Status Update:');
    console.log(`   Connected: ${status.connected}`);
    console.log(`   Subscriptions: ${status.subscriptions.length}`);
    console.log(`   Monitored Leaders: ${status.monitoredLeaders}`);
  }, 60000); // Every minute
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await bot.shutdown();
    process.exit(0);
  });
}

main().catch(console.error);
```

## 🔧 Configuration Tips

### Development
```typescript
const api = getBackendAPI({
  useWebSocket: false,        // Use REST for easier debugging
  pollingInterval: 3000,      // Poll every 3 seconds
  leaderDetection: {
    enabled: false,           // Disable for faster startup
  },
});
```

### Production
```typescript
const api = getBackendAPI({
  useWebSocket: true,         // Real-time updates
  autoReconnect: true,        // Handle disconnections
  leaderDetection: {
    enabled: true,
    minVolume: 100000,
    minTrades: 100,
    minWinRate: 0.60,
  },
});
```

## 🐛 Debugging

### Enable Detailed Logging

```typescript
// Log all events
const events = ['trade', 'connected', 'disconnected', 'error', 'leader:trade'];
events.forEach(event => {
  api.on(event as any, (...args) => {
    console.log(`[${event}]`, ...args);
  });
});

// Check status regularly
setInterval(() => {
  console.log('Status:', api.getStatus());
}, 10000);
```

### Common Issues

1. **WebSocket connection fails**
   - Check `POLYMARKET_WS_URL` environment variable
   - Try REST polling mode instead
   - Check firewall/network settings

2. **No trades received**
   - Verify market IDs are correct
   - Check if markets are active
   - Ensure subscription was successful

3. **Leader detection not working**
   - Ensure `leaderDetection.enabled = true`
   - Check criteria thresholds (might be too high)
   - Verify Polymarket API access

## 📊 Monitoring

### Track Key Metrics

```typescript
const metrics = {
  tradesReceived: 0,
  leaderTrades: 0,
  errors: 0,
  reconnections: 0,
};

api.on('trade', () => metrics.tradesReceived++);
api.on('leader:trade', () => metrics.leaderTrades++);
api.on('error', () => metrics.errors++);
api.on('reconnecting', () => metrics.reconnections++);

// Log metrics every minute
setInterval(() => {
  console.log('Metrics:', metrics);
}, 60000);
```

## 🔒 Security

### Best Practices

1. **Never commit API keys**
   ```typescript
   // Use environment variables
   apiKey: process.env.POLYMARKET_API_KEY
   ```

2. **Validate trade data**
   ```typescript
   api.on('trade', (trade) => {
     if (!trade.id || !trade.market) {
       console.error('Invalid trade data');
       return;
     }
     // Process trade
   });
   ```

3. **Rate limiting**
   ```typescript
   // Implement your own rate limiting
   const rateLimiter = new RateLimiter(100, 60000); // 100 req/min
   ```

## 🚀 Deployment

### Environment Variables

```bash
# .env
POLYMARKET_API_URL=https://gamma-api.polymarket.com
POLYMARKET_WS_URL=wss://ws-subscriptions-clob.polymarket.com
POLYMARKET_API_KEY=your_api_key_here
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## ✅ Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Error handlers implemented
- [ ] Graceful shutdown implemented
- [ ] Monitoring/logging set up
- [ ] Rate limiting considered
- [ ] Security review completed
- [ ] Tested with REST and WebSocket modes
- [ ] Leader detection configured (if needed)
- [ ] Backup/fallback strategy in place

## 📚 Next Steps

1. Review [Complete API Documentation](./BACKEND_API_INTEGRATION.md)
2. Check [Usage Examples](../examples/backend-api-usage.ts)
3. Run tests: `npm test src/__tests__/backend-api-integration.test.ts`
4. Implement your copy trading logic
5. Deploy and monitor

## 💡 Pro Tips

- Start simple, add complexity gradually
- Use REST polling for development
- Switch to WebSocket for production
- Monitor connection status
- Implement retry logic for API calls
- Cache frequently accessed data
- Log everything for debugging
- Test with small position sizes first

---

**Happy Trading! 🚀**
