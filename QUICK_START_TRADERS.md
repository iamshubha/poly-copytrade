# Quick Start Guide - Polymarket Traders

## 🚀 Accessing the Traders Section

### For Users

1. **Navigate to Traders Page**
   ```
   Dashboard → Traders
   ```

2. **View Polymarket Traders**
   - Click the "Polymarket Leaders" tab
   - Real traders from Polymarket will be displayed

3. **Browse Traders**
   - Each card shows:
     - Wallet address
     - Trading volume
     - Number of trades
     - ROI (Return on Investment)
     - Win rate
     - Average trade size

4. **Sort Traders**
   - Click sort buttons to organize by:
     - **Volume**: Highest trading volume (default)
     - **ROI**: Best return on investment
     - **Trades**: Most active traders
     - **Win Rate**: Highest success rate

5. **Follow a Trader**
   - Click the "Follow" button on any trader card
   - Your system will start copying their trades automatically

### Switch Between Sources

Toggle between two data sources:
- **Polymarket Leaders**: Real traders from Polymarket (NEW!)
- **Internal Users**: Platform users who have made trades

---

## 💻 For Developers

### API Endpoint

**Base URL:** `/api/traders/polymarket`

### Example Requests

#### Basic Request
```bash
curl "http://localhost:3000/api/traders/polymarket"
```

#### With Parameters
```bash
curl "http://localhost:3000/api/traders/polymarket?minVolume=500&minTrades=10&sortBy=roi&limit=20"
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `minVolume` | number | 100 | Minimum trading volume in USD |
| `minTrades` | number | 5 | Minimum number of trades |
| `sortBy` | string | volume | Sort field: `volume`, `roi`, `trades`, `winRate` |
| `limit` | number | 50 | Maximum number of traders to return |

### Response Format

```json
{
  "success": true,
  "data": {
    "traders": [
      {
        "id": "0x7f69983eb28245bba0d5083502a78744a8f66162",
        "address": "0x7f69983eb28245bba0d5083502a78744a8f66162",
        "isPolymarket": true,
        "stats": {
          "followers": 0,
          "totalTrades": 37,
          "totalVolume": 561,
          "winRate": 35.0,
          "totalProfit": -207.57,
          "avgProfit": 15.16,
          "roi": -37.0
        }
      }
    ],
    "total": 4,
    "criteria": {
      "minVolume": 100,
      "minTrades": 5,
      "sortBy": "volume"
    },
    "source": "polymarket-data-api"
  }
}
```

### Frontend Integration

```typescript
// Using React Query
import { useQuery } from '@tanstack/react-query';

function TradersComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['polymarket-traders'],
    queryFn: async () => {
      const res = await fetch(
        '/api/traders/polymarket?minVolume=100&minTrades=5&sortBy=volume'
      );
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.data?.traders?.map((trader) => (
        <div key={trader.id}>
          <p>Address: {trader.address}</p>
          <p>Volume: ${trader.stats.totalVolume}</p>
          <p>ROI: {trader.stats.roi}%</p>
        </div>
      ))}
    </div>
  );
}
```

### Direct Client Usage

```typescript
import { PolymarketClient } from '@/lib/polymarketClient';

const client = new PolymarketClient();

// Fetch all trades
const trades = await client.getAllTrades({
  limit: 1000,
  offset: 0,
});

console.log(`Fetched ${trades.length} trades`);

// Detect leader wallets
const leaders = await client.detectLeaderWallets(
  100,  // min volume
  5     // min trades
);

console.log(`Found ${leaders.length} qualified traders`);

// Display top trader
if (leaders.length > 0) {
  const topTrader = leaders[0];
  console.log('Top Trader:', {
    address: topTrader.address,
    volume: `$${topTrader.volume}`,
    trades: topTrader.trades,
    roi: `${topTrader.roi}%`,
    winRate: `${topTrader.winRate * 100}%`,
  });
}
```

---

## 🧪 Testing

### Run Test Script

```bash
bun run scripts/test-polymarket-traders.ts
```

### Expected Output

```
============================================================
Testing Polymarket Traders Data API Integration
============================================================

[Test 1] Fetching trades from Polymarket Data API...
✅ Fetched 500 trades

[Test 2] Detecting leader wallets...
✅ Found 4 qualified leaders

🏆 Top 5 leaders by volume:
  1. 0x7f69983e... - Volume: $561, Trades: 37, ROI: -37%
  2. 0x6031b6ee... - Volume: $192, Trades: 22, ROI: -22%

📊 Statistics:
   Total Traders: 4
   Total Volume: $1,022
   Total Trades: 71
   Average ROI: -17.75%
   Average Win Rate: 42.3%

✅ All tests completed successfully!
```

### Manual Testing in Browser

1. Open browser DevTools (F12)
2. Navigate to Traders page
3. Open Network tab
4. Check API calls to `/api/traders/polymarket`
5. Verify response data

---

## 🎯 Use Cases

### 1. Discover Top Traders
Find the most successful Polymarket traders based on real trading data.

```typescript
// Get traders sorted by ROI
const response = await fetch(
  '/api/traders/polymarket?sortBy=roi&limit=10'
);
const topPerformers = await response.json();
```

### 2. Find High Volume Traders
Identify traders with significant market activity.

```typescript
// Get traders with $5000+ volume
const response = await fetch(
  '/api/traders/polymarket?minVolume=5000&sortBy=volume'
);
const highVolume = await response.json();
```

### 3. Filter Active Traders
Get traders with consistent trading activity.

```typescript
// Get traders with 50+ trades
const response = await fetch(
  '/api/traders/polymarket?minTrades=50&sortBy=trades'
);
const activeTraders = await response.json();
```

### 4. Balanced Portfolio
Find traders with good win rates.

```typescript
// Get traders sorted by win rate
const response = await fetch(
  '/api/traders/polymarket?sortBy=winRate&limit=20'
);
const consistentWinners = await response.json();
```

---

## 📊 Understanding Metrics

### Trading Volume
- Total USD value of all trades
- Indicates trader activity level
- Higher = more active trader

### Number of Trades
- Count of all executed trades
- Shows trading frequency
- More trades = more data points for analysis

### ROI (Return on Investment)
- Percentage profit/loss
- Calculated from buy/sell volume difference
- Positive = profitable, Negative = loss

### Win Rate
- Estimated success rate
- Based on trading patterns
- Higher = more successful trades

### Average Trade Size
- Typical trade amount
- Calculated: Total Volume / Number of Trades
- Shows trader's position sizing

---

## 🔧 Troubleshooting

### No Traders Displayed

**Problem:** Empty trader list

**Solutions:**
1. Lower minimum thresholds:
   ```
   /api/traders/polymarket?minVolume=50&minTrades=3
   ```

2. Check console for errors:
   ```bash
   # Terminal output
   [Polymarket Data API] Fetched X trades
   Found X unique traders
   ```

3. Verify API is accessible:
   ```bash
   curl https://data-api.polymarket.com/trades?limit=10
   ```

### Slow Loading

**Problem:** Traders take long to load

**Solutions:**
1. Reduce batch size in code (default: 1000)
2. Decrease max batches (default: 5)
3. Implement pagination
4. Use frontend caching (default: 5 min)

### Negative ROI for All Traders

**Problem:** All traders show negative ROI

**Explanation:**
- ROI calculation based on snapshot data
- Recent trades may be buy-heavy
- Not indicative of actual portfolio performance
- Use as relative comparison, not absolute measure

---

## 🛠️ Configuration

### Adjust Minimum Thresholds

**Frontend** (`src/app/dashboard/traders/page.tsx`):
```typescript
const res = await fetch(
  `/api/traders/polymarket?minVolume=100&minTrades=5`
);
```

**API** (`src/app/api/traders/polymarket/route.ts`):
```typescript
const minVolume = parseInt(searchParams.get("minVolume") || "100");
const minTrades = parseInt(searchParams.get("minTrades") || "5");
```

### Change Cache Duration

**Frontend** (`src/app/dashboard/traders/page.tsx`):
```typescript
staleTime: 5 * 60 * 1000, // 5 minutes (in milliseconds)
```

### Modify Batch Size

**Client** (`src/lib/polymarketClient.ts`):
```typescript
const batchSize = 1000;  // Trades per batch
const maxBatches = 5;     // Maximum batches to fetch
```

---

## 📚 Additional Resources

- **Full Documentation**: `docs/POLYMARKET_TRADERS_INTEGRATION.md`
- **Summary**: `TRADERS_SECTION_FIX_SUMMARY.md`
- **Polymarket API Docs**: https://docs.polymarket.com/developers/CLOB/trades/trades-data-api
- **Test Script**: `scripts/test-polymarket-traders.ts`

---

## ⚠️ Important Notes

1. **Data Freshness**: Traders are fetched in real-time from Polymarket
2. **Rate Limits**: Polymarket API has rate limiting (handled automatically)
3. **ROI Accuracy**: ROI is estimated from snapshot data, not complete positions
4. **Privacy**: All wallet addresses are public blockchain data
5. **No Authentication**: Viewing traders doesn't require login

---

## 🎉 Quick Win

**Test it now in 3 steps:**

1. Start your dev server:
   ```bash
   bun run dev
   ```

2. Navigate to:
   ```
   http://localhost:3000/dashboard/traders
   ```

3. Click "Polymarket Leaders" and see real traders!

---

**Need Help?** Check the comprehensive documentation in `docs/POLYMARKET_TRADERS_INTEGRATION.md`
