import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create sample markets first
  const markets = [
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
    {
      id: "market-3",
      title: "Will AI reach AGI in 2025?",
      description: "Artificial General Intelligence prediction",
      category: "Technology",
      outcomes: ["Yes", "No"],
      outcomesPrices: [0.25, 0.75],
      volume: 300000,
      liquidity: 150000,
      active: true,
      resolved: false,
    },
  ];

  for (const market of markets) {
    await prisma.market.upsert({
      where: { id: market.id },
      update: market,
      create: market,
    });
  }

  console.log("✅ Created sample markets");

  // Create demo traders with different performance levels
  const traders = [
    {
      address: "0x1234567890123456789012345678901234567890",
      name: "Elite Trader",
      winRate: 0.75,
      tradeCount: 50,
    },
    {
      address: "0x2345678901234567890123456789012345678901",
      name: "Pro Trader",
      winRate: 0.65,
      tradeCount: 35,
    },
    {
      address: "0x3456789012345678901234567890123456789012",
      name: "Rising Star",
      winRate: 0.55,
      tradeCount: 20,
    },
    {
      address: "0x4567890123456789012345678901234567890123",
      name: "Steady Trader",
      winRate: 0.6,
      tradeCount: 40,
    },
    {
      address: "0x5678901234567890123456789012345678901234",
      name: "Volume King",
      winRate: 0.5,
      tradeCount: 80,
    },
  ];

  for (const traderData of traders) {
    const trader = await prisma.user.upsert({
      where: { address: traderData.address },
      update: {},
      create: {
        address: traderData.address,
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

    console.log(`✅ Created trader: ${traderData.address.slice(0, 10)}...`);

    // Create trades for each trader
    const tradePromises = [];
    for (let i = 0; i < traderData.tradeCount; i++) {
      const isWin = Math.random() < traderData.winRate;
      const amount = 10 + Math.random() * 490; // $10-$500
      const profit = isWin
        ? amount * (0.1 + Math.random() * 0.4) // 10-50% profit
        : -amount * (0.1 + Math.random() * 0.3); // 10-40% loss

      const marketIndex = Math.floor(Math.random() * markets.length);
      const market = markets[marketIndex];
      const outcomeIndex = Math.random() > 0.5 ? 0 : 1;
      const outcomeName = outcomeIndex === 0 ? "Yes" : "No";

      tradePromises.push(
        prisma.trade.create({
          data: {
            userId: trader.id,
            marketId: market.id,
            marketTitle: market.title,
            outcomeIndex,
            outcomeName,
            side: Math.random() > 0.5 ? "BUY" : "SELL",
            amount,
            price: market.outcomesPrices[outcomeIndex],
            shares: amount / market.outcomesPrices[outcomeIndex],
            status: "COMPLETED",
            profit,
            fee: amount * 0.02, // 2% fee
            transactionHash: `0x${Math.random()
              .toString(16)
              .slice(2)}${Math.random().toString(16).slice(2)}`,
          },
        })
      );
    }

    await Promise.all(tradePromises);
    console.log(`  ✅ Created ${traderData.tradeCount} trades`);
  }

  // Create a demo follower
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

  // Create follow relationships (follower follows first 2 traders)
  for (let i = 0; i < 2; i++) {
    const traderAddress = traders[i].address;
    const trader = await prisma.user.findUnique({
      where: { address: traderAddress },
    });

    if (trader) {
      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: follower.id,
            followingId: trader.id,
          },
        },
        update: {},
        create: {
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
      console.log(`  ✅ Follower now following trader ${i + 1}`);
    }
  }

  console.log("🎉 Database seeded successfully!");
  console.log(`   - ${markets.length} markets`);
  console.log(`   - ${traders.length} traders with trades`);
  console.log(`   - 1 follower`);
  console.log(`   - 2 follow relationships`);
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
