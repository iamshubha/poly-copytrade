#!/bin/bash

# Trade Display Fix - Complete Reset and Reseed Script

echo "🔧 Fixing Trades Display Issue"
echo "================================"
echo ""

# Step 1: Apply schema changes
echo "📝 Step 1: Applying schema changes..."
echo "   - Added 'profit' field to Trade model"
echo "   - Schema now includes all required fields"
bun run prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi
echo "✅ Prisma client generated"
echo ""

# Step 2: Push schema to database
echo "📊 Step 2: Pushing schema to database..."
bun run prisma db push --accept-data-loss
if [ $? -ne 0 ]; then
    echo "❌ Failed to push schema"
    exit 1
fi
echo "✅ Schema pushed to database"
echo ""

# Step 3: Seed the database
echo "🌱 Step 3: Seeding database with sample data..."
echo "   Creating:"
echo "   - 5 traders with different performance levels"
echo "   - 225 total trades across all traders"
echo "   - 3 prediction markets"
echo "   - 1 follower following 2 traders"
bun run scripts/seed.ts
if [ $? -ne 0 ]; then
    echo "❌ Failed to seed database"
    exit 1
fi
echo ""

# Step 4: Verify data
echo "🔍 Step 4: Verifying data..."
echo ""
echo "Run this command to check your database:"
echo "  bun run prisma studio"
echo ""
echo "Or test the API directly:"
echo "  curl http://localhost:3000/api/trades"
echo ""

echo "✨ Trade display fix complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Start your dev server: bun run dev"
echo "2. Navigate to: http://localhost:3000/dashboard/trades"
echo "3. You should see trades from all 5 sample traders"
echo ""
echo "💡 Tip: Log in with any of these addresses to see their trades:"
echo "   - 0x1234567890123456789012345678901234567890 (Elite Trader - 50 trades)"
echo "   - 0x2345678901234567890123456789012345678901 (Pro Trader - 35 trades)"
echo "   - 0x3456789012345678901234567890123456789012 (Rising Star - 20 trades)"
echo "   - 0x4567890123456789012345678901234567890123 (Steady Trader - 40 trades)"
echo "   - 0x5678901234567890123456789012345678901234 (Volume King - 80 trades)"
echo ""
