#!/usr/bin/env bun
/**
 * Test Polymarket SDK Client - Quick Verification
 */

import { getPolymarketSDKClient } from '../src/lib/polymarket/sdk-client';

async function testSDKClient() {
  console.log('🧪 Testing Polymarket SDK Client\n');

  try {
    const client = getPolymarketSDKClient();
    console.log('✅ SDK Client initialized\n');

    console.log('📊 Fetching markets...');
    const result = await client.getMarkets({ limit: 5 });
    
    console.log(`\n✅ Successfully fetched ${result.markets.length} markets`);
    console.log(`Next cursor: ${result.nextCursor}`);
    console.log(`\nFirst market:`);
    console.log(JSON.stringify(result.markets[0], null, 2));

    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testSDKClient();
