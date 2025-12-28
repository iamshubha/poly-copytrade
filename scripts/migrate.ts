import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function migrate() {
  console.log("🔄 Running Prisma migrations...");

  try {
    // Generate Prisma Client
    console.log("Generating Prisma Client...");
    await execAsync("npx prisma generate");
    console.log("✅ Prisma Client generated");

    // Push schema to database
    console.log("Pushing schema to database...");
    await execAsync("npx prisma db push");
    console.log("✅ Schema pushed to database");

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
