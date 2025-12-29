#!/usr/bin/env bun

/**
 * Test database connection
 * Usage: bun run scripts/test-db-connection.ts
 */

import prisma from "../src/lib/prisma";

async function testConnection() {
  console.log("🔍 Testing database connections...\n");

  try {
    // Test Prisma connection
    console.log("1️⃣ Testing Prisma connection...");
    await prisma.$connect();

    // Get database info
    const result =
      (await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`) as Array<{
        current_time: Date;
        db_version: string;
      }>;
    console.log("✅ Prisma connected successfully");
    console.log("   Time:", result[0].current_time);
    console.log("   Version:", result[0].db_version.split("\n")[0]);
    console.log("");

    // Check if tables exist
    console.log("2️⃣ Checking database tables...");
    try {
      const userCount = await prisma.user.count();
      const marketCount = await prisma.market.count();
      const tradeCount = await prisma.trade.count();
      console.log("✅ Tables found");
      console.log("   Users:", userCount);
      console.log("   Markets:", marketCount);
      console.log("   Trades:", tradeCount);
    } catch (e) {
      console.log("⚠️  Tables not found - run migrations first");
      console.log("   Run: bun run db:migrate");
    }
    console.log("");

    // Test Redis connection (if available)
    console.log("3️⃣ Testing Redis connection...");
    try {
      const Redis = (await import("ioredis")).default;
      const redis = new Redis(
        process.env.REDIS_URL || "redis://localhost:6379"
      );

      const pong = await redis.ping();
      console.log("✅ Redis connected");
      console.log("   Response:", pong);

      // Test set/get
      await redis.set("test-key", "test-value", "EX", 10);
      const value = await redis.get("test-key");
      console.log(
        "   Set/Get test:",
        value === "test-value" ? "✅ PASS" : "❌ FAIL"
      );
      await redis.del("test-key");

      await redis.quit();
    } catch (error) {
      console.log("⚠️  Redis connection failed");
      console.log(
        "   Error:",
        error instanceof Error ? error.message : String(error)
      );
      console.log("   Make sure Redis is running: docker-compose up -d");
    }
    console.log("");

    console.log("✅ Database tests completed successfully!");
    console.log("\n🚀 System is ready");
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\nTroubleshooting:");
    console.error(
      "1. Make sure Docker containers are running: docker-compose up -d"
    );
    console.error("2. Check .env file has correct DATABASE_URL");
    console.error("3. Wait a few seconds after starting Docker");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
