#!/bin/bash

echo "🧪 Testing Polymarket Copy Trading Platform"
echo "============================================"
echo ""

# Start server in background
echo "📡 Starting Next.js server on port 3006..."
cd /Users/shubhabanerjee/ai/trade/dex/copytrade
PORT=3006 bun run dev > /tmp/nextjs-test.log 2>&1 &
SERVER_PID=$!

echo "   Server PID: $SERVER_PID"
echo "   Waiting for server to start..."
sleep 8

# Check if server is running
if ! ps -p $SERVER_PID > /dev/null; then
    echo "❌ Server failed to start!"
    cat /tmp/nextjs-test.log
    exit 1
fi

echo "✅ Server started successfully"
echo ""

# Test endpoints
echo "🔍 Testing API Endpoints"
echo "========================"
echo ""

# Test 1: Health Check
echo "1. Health Check (/api/health):"
HEALTH=$(curl -s http://localhost:3006/api/health)
if [ -n "$HEALTH" ]; then
    echo "   ✅ Response: $HEALTH"
else
    echo "   ❌ No response"
fi
echo ""

# Test 2: Markets API
echo "2. Markets API (/api/markets?limit=3):"
MARKETS=$(curl -s "http://localhost:3006/api/markets?limit=3")
if echo "$MARKETS" | grep -q "success"; then
    COUNT=$(echo "$MARKETS" | grep -o '"title"' | wc -l)
    echo "   ✅ Received $COUNT markets"
else
    echo "   ⚠️  Response: $(echo $MARKETS | cut -c1-100)"
fi
echo ""

# Test 3: Auth Nonce
echo "3. Auth Nonce (/api/auth/nonce):"
NONCE=$(curl -s -X POST http://localhost:3006/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address":"0x1234567890123456789012345678901234567890"}')
if echo "$NONCE" | grep -q "nonce"; then
    echo "   ✅ Nonce generated"
else
    echo "   ⚠️  Response: $(echo $NONCE | cut -c1-100)"
fi
echo ""

# Test 4: Home page
echo "4. Home Page (/):"
HOME=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/)
if [ "$HOME" = "200" ]; then
    echo "   ✅ HTTP 200 OK"
else
    echo "   ⚠️  HTTP $HOME"
fi
echo ""

# Test 5: Dashboard (should redirect to auth)
echo "5. Dashboard (/dashboard):"
DASHBOARD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/dashboard)
if [ "$DASHBOARD" = "200" ] || [ "$DASHBOARD" = "307" ]; then
    echo "   ✅ HTTP $DASHBOARD (OK)"
else
    echo "   ⚠️  HTTP $DASHBOARD"
fi
echo ""

# Show recent logs
echo "📋 Recent Server Logs:"
echo "======================"
tail -20 /tmp/nextjs-test.log
echo ""

# Cleanup
echo "🧹 Cleaning up..."
kill $SERVER_PID 2>/dev/null
echo ""
echo "✅ Tests complete!"
echo ""
echo "💡 To start the server manually:"
echo "   cd /Users/shubhabanerjee/ai/trade/dex/copytrade"
echo "   bun run dev"
echo ""
echo "🌐 Then visit: http://localhost:3000"
