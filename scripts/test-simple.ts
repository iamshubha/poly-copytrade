#!/usr/bin/env bun

/**
 * Simple database test
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  console.log("🔍 Testing database...\n");

  try {
    console.log("Connecting to database...");
    const result =
      await prisma.$queryRaw`SELECT NOW() as time, version() as ver`;
    console.log("✅ Connected!");
    console.log("Time:", result[0].time);
    console.log("");

    console.log("Counting tables...");
    const users = await prisma.user.count();
    console.log("✅ Users:", users);

    console.log("\n✅ Database working!");
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
