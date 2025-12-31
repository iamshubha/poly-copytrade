# Polymarket SDK Integration

This document describes the official Polymarket CLOB-Client SDK integration implemented in this project.

## Overview

The implementation uses the official `@polymarket/clob-client` SDK for:
- ✅ Market data fetching with cursor-based pagination
- ✅ Authenticated trader data access (trades, orders, positions)
- ✅ API key management (creation, derivation, storage)
- ✅ Type-safe interfaces and proper error handling

## Architecture

### Core Components

```
src/lib/polymarket/
├── sdk-client.ts        # Public market data (no auth required)
├── auth-service.ts      # API key lifecycle management
└── trader-api.ts        # Authenticated trader data (L2 auth)
```

### 1. SDK Client (`sdk-client.ts`)

**Purpose:** Fetch public market data without authentication

**Key Features:**
- Market data with pagination support
- Order book and pricing data
- Price history
- Sampling markets (optimized subset)

**Usage:**
```typescript
import { getPolymarketSDKClient } from '@/lib/polymarket/sdk-client';

const client = getPolymarketSDKClient();

// Fetch markets with pagination
const { markets, nextCursor } = await client.getMarkets({ 
  limit: 100,
  simplified: false 
});

// Get single market
const market = await client.getMarket(conditionId);

// Get pricing data
const price = await client.getLastTradePrice(tokenId);
const orderBook = await client.getOrderBook(tokenId);
```

### 2. Authentication Service (`auth-service.ts`)

**Purpose:** Manage API keys for authenticated operations

**Key Features:**
- Create or derive API keys from wallet
- Encrypted storage in database
- Key rotation and validation
- Automatic fallback (derive → create)

**Usage:**
```typescript
import { PolymarketAuthService } from '@/lib/polymarket/auth-service';

const authService = new PolymarketAuthService();

// Get or create API key for user
const creds = await authService.getOrCreateApiKey(userId, privateKey);

// Rotate API key
const newCreds = await authService.rotateApiKey(userId, privateKey);

// Validate API key
const isValid = await authService.validateApiKey(creds, privateKey);
```

### 3. Trader API (`trader-api.ts`)

**Purpose:** Fetch authenticated trader-specific data

**Key Features:**
- Trade history with pagination
- Open orders tracking
- Position calculation
- Trader statistics
- Real-time monitoring (polling)

**Usage:**
```typescript
import { PolymarketTraderAPI } from '@/lib/polymarket/trader-api';

// Initialize with authentication
const traderAPI = await PolymarketTraderAPI.initialize(privateKey, apiCreds);

// Fetch trades
const trades = await traderAPI.getTraderTrades({ 
  limit: 100,
  after: '2024-01-01T00:00:00Z' 
});

// Get open orders
const orders = await traderAPI.getOpenOrders();

// Calculate positions
const positions = await traderAPI.getPositions();

// Get statistics
const stats = await traderAPI.getTraderStats();

// Monitor new trades
const stopMonitoring = await traderAPI.monitorNewTrades(
  (newTrades) => console.log('New trades:', newTrades),
  10000 // 10 second interval
);
```

## Environment Configuration

Add the following to your `.env` file:

```bash
# Polymarket CLOB API
POLYMARKET_API_URL="https://clob.polymarket.com"
POLYMARKET_DATA_API_URL="https://data-api.polymarket.com"
CHAIN_ID="137"  # 137 = Polygon Mainnet, 80002 = Amoy Testnet

# Authentication (for trader data)
CLOB_API_KEY=""           # Your API key (optional - can be derived)
CLOB_SECRET=""            # Your API secret
CLOB_PASS_PHRASE=""       # Your API passphrase
WALLET_PRIVATE_KEY=""     # Wallet for key derivation/creation
```

## Database Schema

The `PolymarketApiKey` model stores encrypted API credentials:

```prisma
model PolymarketApiKey {
  id                  String   @id @default(cuid())
  userId              String   @unique
  key                 String   // Public API key
  encryptedSecret     String   // Encrypted secret
  encryptedPassphrase String   // Encrypted passphrase
  derivedFrom         String   // Wallet address
  lastUsed            DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

## API Routes

### GET /api/markets

Fetches market data using the SDK client.

**Query Parameters:**
- `limit` (number): Max markets to return (default: 50, max: 100)
- `search` (string): Search markets by question/description
- `category` (string): Filter by category
- `sortBy` (string): Sort field (volume, liquidity, endDate)
- `sortOrder` (string): Sort direction (asc, desc)
- `nextCursor` (string): Pagination cursor
- `simplified` (boolean): Use simplified market data

**Response:**
```json
{
  "success": true,
  "data": {
    "markets": [...],
    "nextCursor": "MTAwMA==",
    "count": 50
  }
}
```

## Testing

### Basic SDK Test

Tests public market data fetching:

```bash
npx tsx scripts/test-polymarket-sdk.ts
```

**Tests:**
1. ✅ SDK Client Initialization
2. ✅ Market Data Fetching with Pagination
3. ✅ Pricing Data (order book, last trade price)
4. ✅ Authentication Service Initialization
5. ✅ Error Handling

### Authenticated Trader API Test

Tests trader-specific data (requires credentials):

```bash
# Set WALLET_PRIVATE_KEY in .env first
npx tsx scripts/test-trader-api.ts
```

**Tests:**
1. ✅ API Key Creation/Derivation
2. ✅ Trader API Initialization
3. ✅ Trade History Fetching
4. ✅ Open Orders Fetching
5. ✅ Position Calculation
6. ✅ Trader Statistics
7. ✅ Paginated Trade Fetching

## Key Differences from Previous Implementation

| Feature | Old Implementation | New Implementation |
|---------|-------------------|-------------------|
| **API Client** | Manual REST calls with axios | Official `@polymarket/clob-client` SDK |
| **Pagination** | Offset-based (limit/offset) | Cursor-based (next_cursor) |
| **Authentication** | Not implemented | L2 API key authentication |
| **Trader Data** | Public data only | Full trade history, orders, positions |
| **Type Safety** | Custom interfaces | SDK-provided TypeScript types |
| **Error Handling** | Basic try/catch | SDK error handling + graceful fallbacks |
| **API Key Management** | N/A | Full lifecycle (create, store, rotate, validate) |

## Migration Guide

### For Market Data

**Before:**
```typescript
import { polymarketClient } from '@/lib/polymarket';

const markets = await polymarketClient.getMarkets({ limit: 100, offset: 0 });
```

**After:**
```typescript
import { getPolymarketSDKClient } from '@/lib/polymarket/sdk-client';

const client = getPolymarketSDKClient();
const { markets, nextCursor } = await client.getMarkets({ limit: 100 });
```

### For Trader Data (New)

```typescript
import { getPolymarketAuthService } from '@/lib/polymarket/auth-service';
import { PolymarketTraderAPI } from '@/lib/polymarket/trader-api';

// Get API credentials
const authService = getPolymarketAuthService();
const creds = await authService.getOrCreateApiKey(userId, privateKey);

// Initialize trader API
const traderAPI = await PolymarketTraderAPI.initialize(privateKey, creds);

// Fetch trader data
const trades = await traderAPI.getTraderTrades();
const orders = await traderAPI.getOpenOrders();
```

## Security Considerations

1. **API Key Storage**: Secrets and passphrases are encrypted before storage
2. **Private Keys**: Never exposed in logs or client-side code
3. **Rate Limiting**: Respect CLOB API rate limits (built into SDK)
4. **Key Rotation**: Implement periodic key rotation for security
5. **Environment Variables**: Use secure storage for production keys

## Troubleshooting

### "No API credentials found"

**Solution:** Either:
1. Set `CLOB_API_KEY`, `CLOB_SECRET`, `CLOB_PASS_PHRASE` in `.env`, OR
2. Set `WALLET_PRIVATE_KEY` to derive keys automatically

### "Authentication failed"

**Causes:**
- Invalid API credentials
- Expired API key
- Incorrect wallet private key

**Solution:**
```typescript
const authService = new PolymarketAuthService();
await authService.rotateApiKey(userId, privateKey);
```

### "Rate limit exceeded"

**Solution:**
- Implement request throttling
- Use caching for frequently accessed data
- Respect SDK's built-in rate limiting

## Performance Optimization

1. **Caching**: Cache market data with 30-60s TTL
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Batch Requests**: Use `getPrices()` and `getOrderBooks()` for multiple tokens
4. **Simplified Markets**: Use `simplified: true` for lighter payloads
5. **Sampling Markets**: Use `getSamplingMarkets()` for representative subset

## Further Reading

- [Polymarket CLOB Client Docs](https://github.com/Polymarket/clob-client)
- [Polymarket API Documentation](https://docs.polymarket.com)
- [Order Utils Package](https://github.com/Polymarket/order-utils)

## Support

For issues or questions:
1. Check this documentation
2. Review test scripts for usage examples
3. Consult official Polymarket SDK documentation
4. Check CLOB API status page
