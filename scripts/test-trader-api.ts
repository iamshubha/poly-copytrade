/**
 * Authenticated Trader API Test
 * 
 * This script tests the trader data fetching capabilities
 * that require L2 API key authentication.
 * 
 * Prerequisites:
 * - Set WALLET_PRIVATE_KEY in .env
 * - Set CLOB_API_KEY, CLOB_SECRET, CLOB_PASS_PHRASE in .env
 *   OR let the script derive keys automatically
 * 
 * Usage:
 *   npx tsx scripts/test-trader-api.ts
 */

import { PolymarketAuthService } from '../src/lib/polymarket/auth-service';
import { PolymarketTraderAPI } from '../src/lib/polymarket/trader-api';
import type { ApiKeyCreds } from '@polymarket/clob-client';

console.log('🧪 Testing Polymarket Trader API (Authenticated)\n');

// ============================================================================
// CHECK PREREQUISITES
// ============================================================================

function checkPrerequisites(): { privateKey: string; existingCreds?: ApiKeyCreds } {
  const privateKey = process.env.WALLET_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('❌ WALLET_PRIVATE_KEY not set in environment');
    console.error('   Please set your wallet private key in .env file');
    console.error('   Example: WALLET_PRIVATE_KEY=0x...');
    process.exit(1);
  }
  
  console.log('✅ Wallet private key found\n');
  
  // Check if API credentials exist
  const existingCreds = {
    key: process.env.CLOB_API_KEY || '',
    secret: process.env.CLOB_SECRET || '',
    passphrase: process.env.CLOB_PASS_PHRASE || '',
  };
  
  if (existingCreds.key && existingCreds.secret && existingCreds.passphrase) {
    console.log('✅ Existing API credentials found\n');
    return { privateKey, existingCreds };
  }
  
  console.log('⚠️  No existing API credentials found');
  console.log('   Will derive new credentials from wallet\n');
  
  return { privateKey };
}

// ============================================================================
// TEST 1: API Key Creation/Derivation
// ============================================================================

async function testApiKeyManagement(privateKey: string, existingCreds?: ApiKeyCreds): Promise<ApiKeyCreds> {
  console.log('📝 TEST 1: API Key Management\n');
  
  try {
    if (existingCreds?.key) {
      console.log('   Using existing API credentials from environment');
      return existingCreds as ApiKeyCreds;
    }
    
    console.log('   Creating/deriving API key...');
    const authService = new PolymarketAuthService();
    
    const creds = await authService.createOrDeriveApiKey(privateKey);
    
    console.log('   ✅ API key obtained successfully');
    console.log(`   📝 Key: ${creds.key.substring(0, 16)}...`);
    console.log('');
    
    return creds;
  } catch (error) {
    console.error('   ❌ API key management failed:', error);
    throw error;
  }
}

// ============================================================================
// TEST 2: Trader API Initialization
// ============================================================================

async function testTraderAPIInit(privateKey: string, creds: ApiKeyCreds): Promise<PolymarketTraderAPI> {
  console.log('📝 TEST 2: Trader API Initialization\n');
  
  try {
    const traderAPI = await PolymarketTraderAPI.initialize(privateKey, creds);
    
    console.log('   ✅ Trader API initialized');
    console.log(`   👤 Wallet: ${traderAPI.getWalletAddress()}`);
    console.log(`   🔒 Authenticated: ${traderAPI.isAuthenticated()}`);
    console.log('');
    
    return traderAPI;
  } catch (error) {
    console.error('   ❌ Trader API initialization failed:', error);
    throw error;
  }
}

// ============================================================================
// TEST 3: Fetch Trader Trades
// ============================================================================

async function testFetchTrades(traderAPI: PolymarketTraderAPI) {
  console.log('📝 TEST 3: Fetch Trader Trades\n');
  
  try {
    console.log('   Fetching trader trades...');
    const trades = await traderAPI.getTraderTrades({ limit: 100, paginateAll: false });
    
    console.log(`   ✅ Fetched ${trades.length} trades`);
    
    if (trades.length > 0) {
      const lastTrade = trades[0];
      console.log(`   📊 Latest trade:`);
      console.log(`      Market: ${lastTrade.market.substring(0, 20)}...`);
      console.log(`      Side: ${lastTrade.side}`);
      console.log(`      Size: ${lastTrade.size}`);
      console.log(`      Price: $${lastTrade.price}`);
      console.log(`      Time: ${new Date(lastTrade.match_time).toLocaleString()}`);
    } else {
      console.log('   ℹ️  No trades found for this wallet');
    }
    
    console.log('');
    return trades;
  } catch (error) {
    console.error('   ❌ Fetch trades failed:', error);
    console.log('');
    return [];
  }
}

// ============================================================================
// TEST 4: Fetch Open Orders
// ============================================================================

async function testFetchOpenOrders(traderAPI: PolymarketTraderAPI) {
  console.log('📝 TEST 4: Fetch Open Orders\n');
  
  try {
    console.log('   Fetching open orders...');
    const orders = await traderAPI.getOpenOrders({ paginateAll: false });
    
    console.log(`   ✅ Fetched ${orders.length} open orders`);
    
    if (orders.length > 0) {
      const firstOrder = orders[0];
      console.log(`   📋 First order:`);
      console.log(`      Market: ${firstOrder.market?.substring(0, 20)}...`);
      console.log(`      Asset ID: ${firstOrder.asset_id.substring(0, 20)}...`);
      console.log(`      Size: ${firstOrder.original_size}`);
    } else {
      console.log('   ℹ️  No open orders for this wallet');
    }
    
    console.log('');
    return orders;
  } catch (error) {
    console.error('   ❌ Fetch open orders failed:', error);
    console.log('');
    return [];
  }
}

// ============================================================================
// TEST 5: Calculate Positions
// ============================================================================

async function testCalculatePositions(traderAPI: PolymarketTraderAPI) {
  console.log('📝 TEST 5: Calculate Positions\n');
  
  try {
    console.log('   Calculating positions from trade history...');
    const positions = await traderAPI.getPositions();
    
    console.log(`   ✅ Calculated ${positions.length} active positions`);
    
    if (positions.length > 0) {
      console.log(`   📊 Position summary:`);
      positions.slice(0, 3).forEach((pos, i) => {
        console.log(`      ${i + 1}. Market: ${pos.marketId.substring(0, 20)}...`);
        console.log(`         Size: ${pos.size.toFixed(4)}`);
        console.log(`         Avg Price: $${pos.avgPrice.toFixed(4)}`);
      });
      
      if (positions.length > 3) {
        console.log(`      ... and ${positions.length - 3} more`);
      }
    } else {
      console.log('   ℹ️  No active positions');
    }
    
    console.log('');
    return positions;
  } catch (error) {
    console.error('   ❌ Calculate positions failed:', error);
    console.log('');
    return [];
  }
}

// ============================================================================
// TEST 6: Get Trader Statistics
// ============================================================================

async function testTraderStats(traderAPI: PolymarketTraderAPI) {
  console.log('📝 TEST 6: Get Trader Statistics\n');
  
  try {
    console.log('   Calculating trader statistics...');
    const stats = await traderAPI.getTraderStats();
    
    console.log('   ✅ Statistics calculated');
    console.log(`   📊 Total trades: ${stats.totalTrades}`);
    console.log(`   💰 Total volume: $${stats.totalVolume.toLocaleString()}`);
    console.log(`   📏 Avg trade size: ${stats.avgTradeSize.toFixed(4)}`);
    console.log(`   🎯 Markets traded: ${stats.markets.size}`);
    
    if (stats.lastTradeTime) {
      console.log(`   🕐 Last trade: ${stats.lastTradeTime.toLocaleString()}`);
    }
    
    console.log('');
    return stats;
  } catch (error) {
    console.error('   ❌ Get trader stats failed:', error);
    console.log('');
    return null;
  }
}

// ============================================================================
// TEST 7: Paginated Trade Fetching
// ============================================================================

async function testPaginatedTrades(traderAPI: PolymarketTraderAPI) {
  console.log('📝 TEST 7: Paginated Trade Fetching\n');
  
  try {
    console.log('   Fetching first page of trades...');
    const firstPage = await traderAPI.getTradesPaginated({ limit: 10 });
    
    console.log(`   ✅ Fetched page with ${firstPage.trades.length} trades`);
    console.log(`   📄 Next cursor: ${firstPage.nextCursor.substring(0, 20)}...`);
    console.log(`   📊 Total count: ${firstPage.count}`);
    
    if (firstPage.nextCursor !== 'LTE=') {
      console.log('   📄 Fetching second page...');
      const secondPage = await traderAPI.getTradesPaginated(undefined, firstPage.nextCursor);
      console.log(`   ✅ Fetched second page with ${secondPage.trades.length} trades`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Paginated trades test failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Check prerequisites
    const { privateKey, existingCreds } = checkPrerequisites();
    
    // Test 1: API Key Management
    const creds = await testApiKeyManagement(privateKey, existingCreds);
    
    // Test 2: Initialize Trader API
    const traderAPI = await testTraderAPIInit(privateKey, creds);
    
    // Test 3: Fetch Trades
    const trades = await testFetchTrades(traderAPI);
    
    // Test 4: Fetch Open Orders
    const orders = await testFetchOpenOrders(traderAPI);
    
    // Test 5: Calculate Positions
    const positions = await testCalculatePositions(traderAPI);
    
    // Test 6: Get Trader Stats
    const stats = await testTraderStats(traderAPI);
    
    // Test 7: Paginated Trades
    await testPaginatedTrades(traderAPI);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n🎉 All trader API tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Trades: ${trades.length}`);
    console.log(`   - Open Orders: ${orders.length}`);
    console.log(`   - Active Positions: ${positions.length}`);
    if (stats) {
      console.log(`   - Total Volume: $${stats.totalVolume.toLocaleString()}`);
    }
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
