import { sql } from "@vercel/postgres";
import prisma from "./prisma";

export async function testDatabaseConnection() {
  try {
    // Test Vercel Postgres
    const result = await sql`SELECT NOW()`;
    console.log("✅ Database connected:", result.rows[0]);

    // Test Prisma
    await prisma.$connect();
    console.log("✅ Prisma connected");

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

export async function initializeDatabase() {
  try {
    // Create indexes if not exists
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_address ON "User"(address);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trades_user_created ON "Trade"(user_id, created_at DESC);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_copied_trades_copier ON "CopiedTrade"(copier_id, created_at DESC);
    `;

    console.log("✅ Database indexes created");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return false;
  }
}
