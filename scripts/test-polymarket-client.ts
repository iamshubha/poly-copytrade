#!/usr/bin/env npx tsx

import { polymarketClient } from '../src/lib/polymarket';

async function test() {
  console.log('Testing Polymarket Client...\n');
  
  try {
    console.log('Calling getMarkets...');
    const markets = await polymarketClient.getMarkets({ limit: 3, active: true });
    
    console.log(`\n✅ Success! Got ${markets.length} markets\n`);
    
    if (markets.length > 0) {
      console.log('First market:');
      console.log(JSON.stringify(markets[0], null, 2));
    } else {
      console.log('❌ No markets returned');
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    console.error('Stack:', error.stack);
  }
}

test();
