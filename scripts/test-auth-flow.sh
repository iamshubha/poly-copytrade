#!/bin/bash

echo "Testing Authentication Flow..."
echo "================================"
echo ""

# Test 1: Health Check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3000/api/health)
echo "Response: $HEALTH"
echo ""

# Test 2: Nonce Generation
echo "2. Testing nonce generation..."
NONCE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}')
echo "Response: $NONCE_RESPONSE"
echo ""

# Test 3: Markets API
echo "3. Testing markets API..."
MARKETS=$(curl -s "http://localhost:3000/api/markets?limit=2&refresh=true")
echo "Markets count: $(echo $MARKETS | grep -o '"id"' | wc -l | tr -d ' ')"
echo ""

echo "================================"
echo "Tests completed!"
