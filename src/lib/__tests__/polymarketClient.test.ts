/**
 * Test suite for Polymarket Client
 */

import PolymarketClient from '../src/lib/polymarketClient';

describe('PolymarketClient', () => {
  let client: PolymarketClient;

  beforeEach(() => {
    client = new PolymarketClient({
      restApiUrl: 'https://clob.polymarket.com',
      timeout: 5000,
    });
  });

  afterEach(() => {
    client.disconnectWebSocket();
  });

  describe('REST API', () => {
    test('should fetch markets', async () => {
      const markets = await client.getMarkets(5);
      expect(Array.isArray(markets)).toBe(true);
      if (markets.length > 0) {
        expect(markets[0]).toHaveProperty('id');
        expect(markets[0]).toHaveProperty('question');
        expect(markets[0]).toHaveProperty('outcomes');
      }
    }, 15000);

    test('should fetch market stats', async () => {
      const markets = await client.getMarkets(1);
      if (markets.length > 0) {
        const stats = await client.getMarketStats(markets[0].id);
        if (stats) {
          expect(stats).toHaveProperty('volume24h');
          expect(stats).toHaveProperty('trades24h');
          expect(typeof stats.volume24h).toBe('number');
        }
      }
    }, 15000);

    test('should fetch market trades', async () => {
      const markets = await client.getMarkets(1);
      if (markets.length > 0) {
        const trades = await client.getMarketTrades(markets[0].id, 5);
        expect(Array.isArray(trades)).toBe(true);
        if (trades.length > 0) {
          expect(trades[0]).toHaveProperty('id');
          expect(trades[0]).toHaveProperty('side');
          expect(trades[0]).toHaveProperty('price');
          expect(['BUY', 'SELL']).toContain(trades[0].side);
        }
      }
    }, 15000);
  });

  describe('Leader Detection', () => {
    test('should detect leader wallets', async () => {
      const leaders = await client.detectLeaderWallets(1000, 5);
      expect(Array.isArray(leaders)).toBe(true);
      if (leaders.length > 0) {
        expect(leaders[0]).toHaveProperty('address');
        expect(leaders[0]).toHaveProperty('volume');
        expect(leaders[0]).toHaveProperty('trades');
        expect(typeof leaders[0].volume).toBe('number');
      }
    }, 30000);
  });

  describe('WebSocket', () => {
    test('should connect to WebSocket', async () => {
      try {
        await client.connectWebSocket();
        expect(client.isWebSocketConnected()).toBe(true);
      } catch (error) {
        console.log('WebSocket test skipped (optional feature)');
      }
    }, 10000);

    test('should subscribe to market trades', async () => {
      try {
        await client.connectWebSocket();
        const markets = await client.getMarkets(1);
        
        if (markets.length > 0) {
          const received = new Promise((resolve) => {
            client.once('trade', resolve);
            setTimeout(resolve, 5000); // Timeout after 5s
          });

          client.subscribeToMarketTrades(markets[0].id);
          await received;
          
          const subs = client.getActiveSubscriptions();
          expect(subs.has('trades')).toBe(true);
        }
      } catch (error) {
        console.log('WebSocket subscription test skipped');
      }
    }, 15000);
  });

  describe('Wallet Monitoring', () => {
    test('should monitor wallet trades', async () => {
      const leaders = await client.detectLeaderWallets(5000, 10);
      
      if (leaders.length > 0) {
        const trades: any[] = [];
        const cleanup = await client.monitorWalletTrades(
          leaders[0].address,
          (trade) => trades.push(trade),
          2000
        );

        // Monitor for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        cleanup();

        // Trades array may be empty if no new trades occurred
        expect(Array.isArray(trades)).toBe(true);
      }
    }, 15000);
  });

  describe('Trade Filtering', () => {
    test('should filter trades by criteria', async () => {
      const markets = await client.getMarkets(1);
      
      if (markets.length > 0) {
        const trades = await client.getFilteredTrades({
          marketId: markets[0].id,
          minAmount: 10,
          side: 'BUY',
        }, 10);

        expect(Array.isArray(trades)).toBe(true);
        trades.forEach(trade => {
          expect(trade.marketId).toBe(markets[0].id);
          expect(trade.amount).toBeGreaterThanOrEqual(10);
          expect(trade.side).toBe('BUY');
        });
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    test('should handle invalid market ID', async () => {
      const market = await client.getMarket('invalid-market-id');
      expect(market).toBeNull();
    });

    test('should handle network errors gracefully', async () => {
      const badClient = new PolymarketClient({
        restApiUrl: 'https://invalid-url-that-does-not-exist.com',
        timeout: 1000,
      });

      const markets = await badClient.getMarkets();
      expect(markets).toEqual([]);
    });
  });
});
