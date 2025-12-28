#!/usr/bin/env npx tsx

/**
 * Comprehensive System Test
 * Tests all critical endpoints and functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string, data?: any) {
  results.push({ name, passed, message, data });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (data && passed) {
    console.log('   Data sample:', JSON.stringify(data).slice(0, 200) + '...');
  }
}

async function testHealthEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    const passed = response.status === 200 && response.data.success;
    addResult(
      'Health Check',
      passed,
      passed ? 'API is healthy' : 'API returned error',
      response.data
    );
  } catch (error: any) {
    addResult('Health Check', false, error.message);
  }
}

async function testMarketsEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}/api/markets?limit=5&refresh=true`, {
      timeout: 15000,
    });
    const passed = response.status === 200 && response.data.success && Array.isArray(response.data.data);
    const marketCount = response.data.data?.length || 0;
    
    addResult(
      'Markets API',
      passed,
      passed ? `Fetched ${marketCount} markets from Polymarket` : 'Failed to fetch markets',
      passed ? response.data.data[0] : response.data
    );
    
    return response.data.data;
  } catch (error: any) {
    addResult('Markets API', false, error.message);
    return [];
  }
}

async function testMarketDataStructure(markets: any[]) {
  if (markets.length === 0) {
    addResult('Market Data Structure', false, 'No markets to test');
    return;
  }
  
  const market = markets[0];
  const requiredFields = ['id', 'question', 'outcomes', 'active', 'volume'];
  const missingFields = requiredFields.filter(field => !(field in market));
  
  const passed = missingFields.length === 0;
  addResult(
    'Market Data Structure',
    passed,
    passed
      ? 'All required fields present'
      : `Missing fields: ${missingFields.join(', ')}`,
    market
  );
}

async function testNonceEndpoint() {
  try {
    const testAddress = '0x1234567890123456789012345678901234567890';
    const response = await axios.post(
      `${BASE_URL}/api/auth/nonce`,
      { address: testAddress },
      { timeout: 5000 }
    );
    
    const passed = response.status === 200 && response.data.success && response.data.data?.nonce;
    addResult(
      'Nonce Generation',
      passed,
      passed ? 'Nonce generated successfully' : 'Failed to generate nonce',
      response.data
    );
  } catch (error: any) {
    addResult('Nonce Generation', false, error.message);
  }
}

async function testDatabaseConnection() {
  try {
    // The health endpoint checks DB connection
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    const passed = response.data.database?.connected === true;
    addResult(
      'Database Connection',
      passed,
      passed ? 'PostgreSQL connected' : 'Database connection failed',
      response.data.database
    );
  } catch (error: any) {
    addResult('Database Connection', false, error.message);
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(0);
  
  console.log(`\nTests Passed: ${passed}/${total} (${percentage}%)\n`);
  
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('❌ Failed Tests:');
    failed.forEach(r => console.log(`   - ${r.name}: ${r.message}`));
  } else {
    console.log('✅ All tests passed!');
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (passed === total) {
    console.log('\n🎉 System is fully operational!');
    console.log('✓ Database connected');
    console.log('✓ Polymarket API integrated');
    console.log('✓ Authentication ready');
    console.log('✓ Market data fetching works');
    console.log('\n📱 Open http://localhost:3000 in your browser');
    console.log('💼 Connect your wallet to get started\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.\n');
  }
}

async function main() {
  console.log('🧪 Running System Tests...\n');
  console.log('Server: ' + BASE_URL);
  console.log('='.repeat(60) + '\n');
  
  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run tests
  await testHealthEndpoint();
  await testDatabaseConnection();
  const markets = await testMarketsEndpoint();
  await testMarketDataStructure(markets);
  await testNonceEndpoint();
  
  // Print summary
  printSummary();
  
  process.exit(results.every(r => r.passed) ? 0 : 1);
}

main().catch((error) => {
  console.error('\n❌ Test suite crashed:', error.message);
  process.exit(1);
});
