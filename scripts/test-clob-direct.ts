#!/usr/bin/env bun
import { ClobClient } from '@polymarket/clob-client';

async function testClobClient() {
  console.log('Testing ClobClient directly...\n');
  
  const client = new ClobClient('https://clob.polymarket.com', 137);
  console.log('Client created');
  
  try {
    console.log('Calling getMarkets...');
    const result = await client.getMarkets('MA==');
    console.log('Result type:', typeof result);
    console.log('Result:', JSON.stringify(result).substring(0, 500));
    
    if (result && typeof result === 'object') {
      console.log('\nResult keys:', Object.keys(result));
      console.log('Data length:', result.data?.length);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testClobClient();
