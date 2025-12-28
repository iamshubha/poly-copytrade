#!/usr/bin/env npx tsx

/**
 * Test Polymarket API Connection
 * Verifies that we can fetch real market data
 */

import axios from 'axios';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

async function testGammaAPI() {
  console.log('\n🔍 Testing Gamma API...');
  try {
    const response = await axios.get(`${GAMMA_API}/markets`, {
      params: {
        limit: 5,
        active: true,
      },
    });
    
    console.log('✅ Gamma API working!');
    console.log(`Found ${response.data.length} active markets`);
    
    if (response.data.length > 0) {
      const market = response.data[0];
      console.log('\nSample Market:');
      console.log(`- Question: ${market.question}`);
      console.log(`- ID: ${market.condition_id}`);
      console.log(`- Active: ${market.active}`);
      console.log(`- Volume: $${market.volume || 0}`);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Gamma API failed:', error.message);
    return [];
  }
}

async function testCLOBAPI() {
  console.log('\n🔍 Testing CLOB API...');
  try {
    const response = await axios.get(`${CLOB_API}/markets`, {
      params: {
        limit: 5,
      },
      timeout: 10000,
    });
    
    console.log('✅ CLOB API working!');
    console.log(`Response type: ${typeof response.data}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ CLOB API failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Testing Polymarket API Connection\n');
  console.log('='.repeat(50));
  
  // Test Gamma API (recommended for market data)
  const gammaMarkets = await testGammaAPI();
  
  // Test CLOB API
  await testCLOBAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✅ API Connection Test Complete\n');
  
  if (gammaMarkets.length > 0) {
    console.log('✓ Gamma API is working and returning data');
    console.log('✓ You can use https://gamma-api.polymarket.com for market data');
  }
  
  process.exit(0);
}

main().catch(console.error);
