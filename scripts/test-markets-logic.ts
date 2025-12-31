#!/usr/bin/env bun
/**
 * Test Markets API Route Logic
 */

import { getPolymarketSDKClient } from '../src/lib/polymarket/sdk-client';

async function testMarketsLogic() {
  console.log('🧪 Testing Markets API Logic\n');

  try {
    console.log('1. Getting SDK client...');
    const sdkClient = getPolymarketSDKClient();
    console.log('✅ SDK Client initialized\n');

    console.log('2. Fetching markets...');
    const result = await sdkClient.getMarkets({
      limit: 10,
    });
    console.log(`✅ Fetched ${result.markets.length} markets\n`);

    console.log('3. Filtering markets...');
    let markets = result.markets;
    console.log(`Before filter: ${markets.length} markets`);
    
    markets = markets.filter((market: any) => 
      market.question && market.outcomes && market.outcomes.length > 0
    );
    console.log(`After filter: ${markets.length} markets\n`);

    console.log('4. Transforming markets...');
    const transformedMarkets = markets.map((market: any) => {
      const id = market.id || market.conditionId;
      return {
        id,
        conditionId: market.conditionId,
        title: market.question,
        description: market.description || "",
        volume: market.volume,
        liquidity: market.liquidity,
        outcomes: market.outcomes,
        outcomesPrices: market.outcomesPrices,
        endDate: market.endDate,
        category: market.category || "Other",
        tags: market.category ? [market.category] : [],
        active: market.active,
      };
    });
    console.log(`✅ Transformed ${transformedMarkets.length} markets\n`);

    console.log('5. Sample transformed market:');
    console.log(JSON.stringify(transformedMarkets[0], null, 2));

    console.log('\n🎉 All tests passed!');
    console.log(`\n📊 Summary: ${transformedMarkets.length} markets ready for API response`);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testMarketsLogic();
