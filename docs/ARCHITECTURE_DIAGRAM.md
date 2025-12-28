# Backend API Integration - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Backend API Integration Module                   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    BackendAPIIntegration                       │  │
│  │                      (Main Controller)                         │  │
│  │                                                                 │  │
│  │  • Event Emitter (Node.js EventEmitter)                       │  │
│  │  • Subscription Management                                     │  │
│  │  • Cache Management                                            │  │
│  │  • State Management                                            │  │
│  └────────────┬─────────────────┬────────────────┬───────────────┘  │
│               │                 │                │                   │
│               ▼                 ▼                ▼                   │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐    │
│  │  REST Client   │  │   WS Client     │  │ Leader Detector  │    │
│  │                │  │                 │  │                  │    │
│  │ • HTTP Calls   │  │ • WebSocket     │  │ • Discovery      │    │
│  │ • Retry Logic  │  │ • Real-time     │  │ • Monitoring     │    │
│  │ • Caching      │  │ • Reconnection  │  │ • Analysis       │    │
│  └────────┬───────┘  └────────┬────────┘  └────────┬─────────┘    │
│           │                   │                     │               │
└───────────┼───────────────────┼─────────────────────┼───────────────┘
            │                   │                     │
            ▼                   ▼                     ▼
    ┌───────────────────────────────────────────────────────┐
    │              Polymarket API Infrastructure             │
    │                                                         │
    │  • REST API: https://gamma-api.polymarket.com         │
    │  • WebSocket: wss://ws-subscriptions-clob.polymarket  │
    │  • Authentication & Rate Limiting                      │
    └───────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Trade Subscription Flow (WebSocket)

```
User Application
     │
     │ subscribeToMarketTrades('market-id')
     ▼
BackendAPIIntegration
     │
     │ Check if WebSocket mode
     ▼
PolymarketWSClient
     │
     │ ws.send({ type: 'subscribe', market: 'market-id' })
     ▼
Polymarket WebSocket Server
     │
     │ Real-time trade updates
     ▼
PolymarketWSClient
     │
     │ Parse & validate message
     ▼
BackendAPIIntegration
     │
     │ emit('trade', trade)
     │ emit('trade:market', marketId, trade)
     ▼
User Application Event Handlers
```

### 2. Trade Subscription Flow (REST Polling)

```
User Application
     │
     │ subscribeToMarketTrades('market-id', { useWebSocket: false })
     ▼
BackendAPIIntegration
     │
     │ Create polling interval
     ▼
setInterval (every 5 seconds)
     │
     ▼
PolymarketRestClient
     │
     │ GET /markets/{marketId}/trades
     ▼
Polymarket REST API
     │
     │ JSON response with trades
     ▼
PolymarketRestClient
     │
     │ Parse & format trades
     ▼
BackendAPIIntegration
     │
     │ emit('trade', trade) for each
     ▼
User Application Event Handlers
```

### 3. Market Stats Flow

```
User Application
     │
     │ fetchMarketStats('market-id')
     ▼
BackendAPIIntegration
     │
     │ Check cache (1-min TTL)
     ▼
Cache Hit?
     │
     ├─ YES ─────────┐
     │               │
     │ NO            │
     ▼               │
PolymarketRestClient│
     │               │
     │ GET /markets/{id}/stats
     ▼               │
Polymarket REST API │
     │               │
     │ Stats data    │
     ▼               │
BackendAPIIntegration
     │               │
     │ Update cache  │
     ▼               ▼
User Application (with stats)
```

### 4. Leader Detection Flow

```
User Application
     │
     │ detectLeaderWallets()
     ▼
BackendAPIIntegration
     │
     │ Check if leader detection enabled
     ▼
LeaderWalletDetector
     │
     │ discoverLeaderWallets()
     ▼
PolymarketRestClient
     │
     │ GET /wallets?min_volume=100000&min_trades=100&min_win_rate=0.55
     ▼
Polymarket REST API
     │
     │ Array of top wallets
     ▼
LeaderWalletDetector
     │
     │ Filter by criteria
     │ Cache leaders
     │ Save to database
     ▼
BackendAPIIntegration
     │
     │ emit('leader:detected', wallet)
     ▼
User Application
```

### 5. Leader Trade Monitoring Flow

```
User Application
     │
     │ monitorLeaderWallet('0x123...')
     ▼
BackendAPIIntegration
     │
     ▼
LeaderWalletDetector
     │
     │ Add to monitored wallets
     ▼
WebSocket OR Polling
     │
     │ Subscribe to wallet trades
     ▼
Trade Event Received
     │
     │ Check if from monitored leader
     ▼
LeaderWalletDetector
     │
     │ isLeaderWallet() check
     ▼
BackendAPIIntegration
     │
     │ emit('leader:trade', leader, trade)
     │ emit('trade:leader', leader, trade)
     ▼
User Application
     │
     │ Copy trading logic
     ▼
Execute Copy Trade
```

## Event Flow Diagram

```
                    ┌─────────────────────────────────┐
                    │   BackendAPIIntegration        │
                    │      (EventEmitter)             │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
                    ▼                             ▼
        ┌──────────────────────┐      ┌────────────────────┐
        │   Internal Events    │      │  External Events   │
        │                      │      │                    │
        │ • Data received      │      │ • trade            │
        │ • Cache updated      │      │ • trade:market     │
        │ • Subscription added │      │ • trade:wallet     │
        │ • Connection changed │      │ • leader:trade     │
        └──────────┬───────────┘      │ • market:stats     │
                   │                  │ • connected        │
                   │                  │ • disconnected     │
                   │                  │ • error            │
                   │                  └────────┬───────────┘
                   │                           │
                   └───────────┬───────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  User Application   │
                    │   Event Handlers    │
                    └─────────────────────┘
```

## Data Flow: Complete Copy Trading Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. INITIALIZATION                                                    │
│                                                                       │
│    User Code                                                          │
│        │                                                              │
│        │ getBackendAPI({ useWebSocket: true, ... })                 │
│        ▼                                                              │
│    BackendAPIIntegration.initialize()                                │
│        │                                                              │
│        ├─► Connect WebSocket                                         │
│        ├─► Initialize Leader Detector                                │
│        └─► emit('connected')                                         │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 2. LEADER DISCOVERY                                                  │
│                                                                       │
│    User Code                                                          │
│        │                                                              │
│        │ api.detectLeaderWallets()                                   │
│        ▼                                                              │
│    BackendAPIIntegration                                             │
│        │                                                              │
│        │ leaderDetector.discoverLeaderWallets()                      │
│        ▼                                                              │
│    REST API Call                                                     │
│        │                                                              │
│        │ Filter by: volume, trades, win rate                         │
│        ▼                                                              │
│    Returns: [Leader1, Leader2, ...]                                 │
│        │                                                              │
│        │ emit('leader:detected', wallet)                             │
│        ▼                                                              │
│    User Code: Got leaders list                                       │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 3. MONITORING SETUP                                                  │
│                                                                       │
│    User Code                                                          │
│        │                                                              │
│        │ api.monitorLeaderWallet('0x123...')                         │
│        ▼                                                              │
│    BackendAPIIntegration                                             │
│        │                                                              │
│        │ leaderDetector.monitorWallet('0x123...')                    │
│        ▼                                                              │
│    WebSocket Subscribe                                               │
│        │                                                              │
│        │ { type: 'subscribe', wallet: '0x123...' }                  │
│        ▼                                                              │
│    Monitoring Active                                                 │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 4. TRADE DETECTION                                                   │
│                                                                       │
│    Polymarket WebSocket                                              │
│        │                                                              │
│        │ { type: 'trade', data: { ... } }                           │
│        ▼                                                              │
│    PolymarketWSClient                                                │
│        │                                                              │
│        │ Parse & validate                                            │
│        ▼                                                              │
│    BackendAPIIntegration.handleIncomingTrade()                      │
│        │                                                              │
│        │ Is this from a monitored leader?                            │
│        ▼                                                              │
│    YES: emit('leader:trade', leader, trade)                         │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 5. COPY DECISION                                                     │
│                                                                       │
│    User Event Handler: on('leader:trade')                           │
│        │                                                              │
│        │ Receive: leader data, trade data                            │
│        ▼                                                              │
│    Fetch market stats                                                │
│        │                                                              │
│        │ api.fetchMarketStats(trade.market)                          │
│        ▼                                                              │
│    Decision Logic                                                    │
│        │                                                              │
│        ├─► Check: leader.stats.win_rate > 0.65                      │
│        ├─► Check: marketStats.liquidity > 50000                     │
│        └─► Check: trade.size > 100                                  │
│                │                                                      │
│                ▼                                                      │
│           All criteria met?                                          │
│                │                                                      │
│           YES  │  NO                                                 │
│                ▼   ▼                                                 │
│           Copy  Skip                                                 │
└───────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ 6. EXECUTE COPY                                                      │
│                                                                       │
│    User Code                                                          │
│        │                                                              │
│        │ executeCopyTrade(trade)                                     │
│        ▼                                                              │
│    Your Order Execution Logic                                        │
│        │                                                              │
│        │ Create similar order on Polymarket                          │
│        ▼                                                              │
│    Trade Copied Successfully                                         │
└───────────────────────────────────────────────────────────────────────┘
```

## Class Structure

```
BackendAPIIntegration
├── Properties
│   ├── restClient: PolymarketRestClient
│   ├── wsClient: PolymarketWSClient | null
│   ├── leaderDetector: LeaderWalletDetector | null
│   ├── subscriptions: Map<string, TradeSubscription>
│   ├── marketStatsCache: Map<string, MarketStatsCache>
│   ├── marketsCache: Map<string, Market>
│   └── config: BackendAPIConfig
│
├── Initialization Methods
│   ├── initialize(): Promise<void>
│   ├── disconnect(): Promise<void>
│   └── getStatus(): APIStatus
│
├── Trade Subscription Methods
│   ├── subscribeToMarketTrades(marketId, options?)
│   ├── subscribeToWalletTrades(walletAddress, options?)
│   ├── subscribeToAllTrades(options?)
│   ├── unsubscribe(subscriptionId)
│   └── getActiveSubscriptions()
│
├── Market Stats Methods
│   ├── fetchMarketStats(marketId, useCache?)
│   ├── fetchMultipleMarketStats(marketIds[], useCache?)
│   ├── fetchMarket(marketId, useCache?)
│   ├── searchMarkets(filter?)
│   └── getTrendingMarkets(limit?)
│
├── Leader Detection Methods
│   ├── detectLeaderWallets()
│   ├── isLeaderWallet(walletAddress)
│   ├── getLeaderWalletDetails(walletAddress)
│   ├── monitorLeaderWallet(walletAddress)
│   └── getMonitoredLeaders()
│
├── Wallet Methods
│   ├── fetchWalletStats(walletAddress)
│   └── fetchWalletPositions(walletAddress)
│
└── Utility Methods
    ├── clearCache()
    ├── setupWebSocketHandlers()
    ├── setupLeaderDetectorHandlers()
    └── handleIncomingTrade(trade)
```

## Event Types Hierarchy

```
Events
├── Trade Events
│   ├── 'trade' → (trade: Trade)
│   ├── 'trade:market' → (marketId: string, trade: Trade)
│   ├── 'trade:wallet' → (walletAddress: string, trade: Trade)
│   └── 'trade:leader' → (leader: LeaderWallet, trade: Trade)
│
├── Market Events
│   ├── 'market:update' → (marketId: string, market: Market)
│   └── 'market:stats' → (marketId: string, stats: MarketStats)
│
├── Leader Events
│   ├── 'leader:detected' → (wallet: LeaderWallet)
│   └── 'leader:trade' → (wallet: LeaderWallet, trade: Trade)
│
└── Connection Events
    ├── 'connected' → ()
    ├── 'disconnected' → ()
    ├── 'error' → (error: Error)
    └── 'reconnecting' → (attempt: number)
```

## Caching Strategy

```
                   API Request
                        │
                        ▼
                 Check Cache
                        │
         ┌──────────────┴──────────────┐
         │                             │
    Cache Hit                      Cache Miss
         │                             │
    ┌────▼────┐                   ┌────▼────┐
    │ Check   │                   │  Call   │
    │  TTL    │                   │   API   │
    └────┬────┘                   └────┬────┘
         │                             │
    ┌────▼────┐                   ┌────▼────┐
    │ Still   │                   │ Store   │
    │ Valid?  │                   │ in Cache│
    └────┬────┘                   └────┬────┘
         │                             │
    YES  │  NO                         │
         │  │                          │
         │  └──────────┐               │
         │             │               │
         └─────────────┴───────────────┘
                       │
                       ▼
                Return Data
```

---

This architecture provides:
- **Separation of Concerns**: Each component has a clear responsibility
- **Flexibility**: Easy to swap WebSocket/REST modes
- **Scalability**: Event-driven design scales well
- **Maintainability**: Clear structure and interfaces
- **Testability**: Components can be tested independently
