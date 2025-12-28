import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create demo trader
  const trader = await prisma.user.upsert({
    where: { address: "0x1234567890123456789012345678901234567890" },
    update: {},
    create: {
      address: "0x1234567890123456789012345678901234567890",
      settings: {
        create: {
          maxCopyPercentage: 10,
          minTradeAmount: 5,
          maxOpenPositions: 50,
          autoCopyEnabled: true,
        },
      },
    },
  });

  console.log("✅ Created trader:", trader.address);

  // Create demo follower
  const follower = await prisma.user.upsert({
    where: { address: "0x9876543210987654321098765432109876543210" },
    update: {},
    create: {
      address: "0x9876543210987654321098765432109876543210",
      settings: {
        create: {
          maxCopyPercentage: 5,
          minTradeAmount: 1,
          maxOpenPositions: 20,
          autoCopyEnabled: true,
        },
      },
    },
  });

  console.log("✅ Created follower:", follower.address);

  // Create follow relationship
  const follow = await prisma.follow.create({
    data: {
      followerId: follower.id,
      followingId: trader.id,
      copySettings: {
        create: {
          enabled: true,
          copyPercentage: 100,
        },
      },
    },
  });

  console.log("✅ Created follow relationship");

  // Create sample markets
  const markets = await prisma.market.createMany({
    data: [
      {
        id: "market-1",
        title: "Will Bitcoin reach $100k by end of 2024?",
        description: "Bitcoin price prediction market",
        category: "Crypto",
        outcomes: ["Yes", "No"],
        outcomesPrices: [0.65, 0.35],
        volume: 1000000,
        liquidity: 500000,
        active: true,
        resolved: false,
      },
      {
        id: "market-2",
        title: "Will ETH ETF be approved in Q1 2024?",
        description: "Ethereum ETF approval prediction",
        category: "Crypto",
        outcomes: ["Yes", "No"],
        outcomesPrices: [0.42, 0.58],
        volume: 500000,
        liquidity: 250000,
        active: true,
        resolved: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Created sample markets");

  console.log("🎉 Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
