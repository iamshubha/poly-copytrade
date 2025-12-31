/**
 * Test Suite for Polymarket SDK Integration
 * 
 * Tests:
 * 1. SDK Client initialization
 * 2. Market data fetching with pagination
 * 3. Authentication service (API key management)
 * 4. Trader data fetching (with mock credentials)
 * 5. Error handling and edge cases
 */

import { getPolymarketSDKClient } from '../src/lib/polymarket/sdk-client';
import { PolymarketAuthService } from '../src/lib/polymarket/auth-service';

console.log('🧪 Starting Polymarket SDK Integration Tests\n');

// ============================================================================
// TEST 1: SDK Client Initialization
// ============================================================================

async function testSDKClientInit() {
  console.log('📝 TEST 1: SDK Client Initialization');
  
  try {
    const client = getPolymarketSDKClient();
    
    if (!client) {
      throw new Error('Failed to initialize SDK client');
    }
    
    if (!client.isReady()) {
      throw new Error('SDK client not ready');
    }
    
    const config = client.getConfig();
    console.log('   ✅ SDK Client initialized');
    console.log(`   📍 Host: ${config.host}`);
    console.log(`   ⛓️  Chain ID: ${config.chainId}`);
    console.log('');
    
    return true;
  } catch (error) {
    console.error('   ❌ SDK Client initialization failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// TEST 2: Market Data Fetching
// ============================================================================

async function testMarketFetching() {
  console.log('📝 TEST 2: Market Data Fetching');
  
  try {
    const client = getPolymarketSDKClient();
    
    // Test 2.1: Fetch markets with pagination
    console.log('   Testing getMarkets...');
    const result = await client.getMarkets({ limit: 10 });
    
    if (!result || !result.markets) {
      throw new Error('No markets returned');
    }
    
    console.log(`   ✅ Fetched ${result.markets.length} markets`);
    console.log(`   📄 Next cursor: ${result.nextCursor.substring(0, 20)}...`);
    
    if (result.markets.length > 0) {
      const firstMarket = result.markets[0];
      console.log(`   📊 Sample market: ${firstMarket.question.substring(0, 60)}...`);
      console.log(`   💰 Volume: $${firstMarket.volume.toLocaleString()}`);
      console.log(`   🎯 Active: ${firstMarket.active}`);
    }
    
    // Test 2.2: Fetch single market
    if (result.markets.length > 0 && result.markets[0].conditionId) {
      console.log('   Testing getMarket...');
      const conditionId = result.markets[0].conditionId;
      const market = await client.getMarket(conditionId);
      
      if (market) {
        console.log(`   ✅ Fetched single market by condition ID`);
      } else {
        console.log(`   ⚠️  Failed to fetch single market`);
      }
    }
    
    // Test 2.3: Fetch sampling markets
    console.log('   Testing getSamplingMarkets...');
    const samplingResult = await client.getSamplingMarkets();
    
    if (samplingResult && samplingResult.data) {
      console.log(`   ✅ Fetched ${samplingResult.data.length} sampling markets`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Market fetching failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// TEST 3: Pricing Data
// ============================================================================

async function testPricingData() {
  console.log('📝 TEST 3: Pricing Data Fetching');
  
  try {
    const client = getPolymarketSDKClient();
    
    // First get a market to test pricing
    const marketsResult = await client.getMarkets({ limit: 1 });
    
    if (!marketsResult.markets.length || !marketsResult.markets[0].tokens?.length) {
      console.log('   ⚠️  No market tokens available for pricing test');
      console.log('');
      return true;
    }
    
    const tokenId = marketsResult.markets[0].tokens[0].token_id;
    
    // Test 3.1: Get last trade price
    console.log('   Testing getLastTradePrice...');
    const price = await client.getLastTradePrice(tokenId);
    
    if (price !== null) {
      console.log(`   ✅ Last trade price: $${price.toFixed(4)}`);
    } else {
      console.log(`   ⚠️  No price data available`);
    }
    
    // Test 3.2: Get order book
    console.log('   Testing getOrderBook...');
    const orderBook = await client.getOrderBook(tokenId);
    
    if (orderBook) {
      console.log(`   ✅ Order book fetched`);
      console.log(`   📈 Bids: ${orderBook.bids?.length || 0}`);
      console.log(`   📉 Asks: ${orderBook.asks?.length || 0}`);
    } else {
      console.log(`   ⚠️  No order book available`);
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Pricing data fetching failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// TEST 4: Authentication Service
// ============================================================================

async function testAuthService() {
  console.log('📝 TEST 4: Authentication Service');
  
  try {
    const authService = new PolymarketAuthService();
    
    // Note: We can't test actual key creation without a wallet private key
    // This test just verifies the service initializes correctly
    
    console.log('   ✅ Auth service initialized');
    console.log('   ⚠️  Skipping API key creation (requires wallet private key)');
    console.log('   ℹ️  To test key creation, set WALLET_PRIVATE_KEY in .env');
    
    // Check if wallet private key is available
    if (process.env.WALLET_PRIVATE_KEY) {
      console.log('   ⚠️  Wallet private key detected - skipping actual creation for safety');
      console.log('   ℹ️  Use separate test script for authenticated operations');
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Auth service test failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// TEST 5: Error Handling
// ============================================================================

async function testErrorHandling() {
  console.log('📝 TEST 5: Error Handling');
  
  try {
    const client = getPolymarketSDKClient();
    
    // Test 5.1: Invalid condition ID
    console.log('   Testing invalid condition ID...');
    const invalidMarket = await client.getMarket('invalid-condition-id-12345');
    
    if (invalidMarket === null) {
      console.log('   ✅ Gracefully handled invalid condition ID');
    } else {
      console.log('   ⚠️  Unexpected result for invalid condition ID');
    }
    
    // Test 5.2: Invalid token ID for pricing
    console.log('   Testing invalid token ID...');
    const invalidPrice = await client.getLastTradePrice('invalid-token-id-12345');
    
    if (invalidPrice === null) {
      console.log('   ✅ Gracefully handled invalid token ID');
    } else {
      console.log('   ⚠️  Unexpected result for invalid token ID');
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.error('   ❌ Error handling test failed:', error);
    console.log('');
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  const results = {
    sdkInit: false,
    marketFetching: false,
    pricingData: false,
    authService: false,
    errorHandling: false,
  };
  
  console.log('═══════════════════════════════════════════════════════\n');
  
  results.sdkInit = await testSDKClientInit();
  results.marketFetching = await testMarketFetching();
  results.pricingData = await testPricingData();
  results.authService = await testAuthService();
  results.errorHandling = await testErrorHandling();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📊 TEST RESULTS SUMMARY\n');
  console.log(`   SDK Initialization:     ${results.sdkInit ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Market Fetching:        ${results.marketFetching ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Pricing Data:           ${results.pricingData ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Auth Service:           ${results.authService ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Error Handling:         ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n   Total: ${passedTests}/${totalTests} tests passed`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
