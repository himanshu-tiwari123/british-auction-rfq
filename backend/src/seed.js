const { PrismaClient } = require('@prisma/client');
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding database...");

  // ─────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("password123", 10);

  const buyer = await prisma.user.upsert({
    where: { email: "buyer@gocomet.com" },
    update: {},
    create: {
      name: "Rajesh Kumar",
      email: "buyer@gocomet.com",
      password: hashedPassword,
      role: "BUYER",
    },
  });

  const supplier1 = await prisma.user.upsert({
    where: { email: "supplier1@logistics.com" },
    update: {},
    create: {
      name: "FastShip Logistics",
      email: "supplier1@logistics.com",
      password: hashedPassword,
      role: "SUPPLIER",
    },
  });

  const supplier2 = await prisma.user.upsert({
    where: { email: "supplier2@logistics.com" },
    update: {},
    create: {
      name: "QuickFreight Co",
      email: "supplier2@logistics.com",
      password: hashedPassword,
      role: "SUPPLIER",
    },
  });

  const supplier3 = await prisma.user.upsert({
    where: { email: "supplier3@logistics.com" },
    update: {},
    create: {
      name: "GlobalMove Ltd",
      email: "supplier3@logistics.com",
      password: hashedPassword,
      role: "SUPPLIER",
    },
  });

  console.log("Users seeded");

  // ─────────────────────────────────────────────
  // RFQ 1 — Active auction with trigger window active soon
  // Bid close is 10 minutes from now so the cron can test extension
  // ─────────────────────────────────────────────
  const now = new Date();
  const bidCloseTime1 = new Date(now.getTime() + 10 * 60 * 1000); // 10 mins from now
  const forcedClose1 = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins from now

  const rfq1 = await prisma.rfq.create({
    data: {
      referenceId: `RFQ-DEMO-001`,
      name: "Mumbai to Delhi Freight Q1 2025",
      pickupDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      bidStartTime: new Date(now.getTime() - 30 * 60 * 1000), // started 30 mins ago
      bidCloseTime: bidCloseTime1,
      forcedBidCloseTime: forcedClose1,
      triggerWindowMins: 10,
      extensionDurationMins: 5,
      extensionTrigger: "BID_RECEIVED",
      status: "ACTIVE",
      buyerId: buyer.id,
    },
  });

  // Bids for RFQ 1
  await prisma.bid.createMany({
    data: [
      {
        rfqId: rfq1.id,
        supplierId: supplier1.id,
        carrierName: "BlueDart Express",
        freightCharges: 15000,
        originCharges: 2000,
        destinationCharges: 1500,
        totalCharges: 18500,
        transitTimeDays: 3,
        quoteValidity: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        rank: 2,
      },
      {
        rfqId: rfq1.id,
        supplierId: supplier2.id,
        carrierName: "DTDC Cargo",
        freightCharges: 13000,
        originCharges: 1800,
        destinationCharges: 1200,
        totalCharges: 16000,
        transitTimeDays: 4,
        quoteValidity: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        rank: 1,
      },
      {
        rfqId: rfq1.id,
        supplierId: supplier3.id,
        carrierName: "Delhivery",
        freightCharges: 17000,
        originCharges: 2200,
        destinationCharges: 1800,
        totalCharges: 21000,
        transitTimeDays: 2,
        quoteValidity: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        rank: 3,
      },
    ],
  });

  console.log("RFQ 1 seeded with bids");

  // ─────────────────────────────────────────────
  // RFQ 2 — Upcoming auction (starts in 1 hour)
  // Uses L1_RANK_CHANGE trigger
  // ─────────────────────────────────────────────
  const bidStart2 = new Date(now.getTime() + 60 * 60 * 1000);
  const bidClose2 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const forcedClose2 = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  await prisma.rfq.create({
    data: {
      referenceId: `RFQ-DEMO-002`,
      name: "Chennai to Kolkata Sea Freight",
      pickupDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      bidStartTime: bidStart2,
      bidCloseTime: bidClose2,
      forcedBidCloseTime: forcedClose2,
      triggerWindowMins: 15,
      extensionDurationMins: 10,
      extensionTrigger: "L1_RANK_CHANGE",
      status: "UPCOMING",
      buyerId: buyer.id,
    },
  });

  console.log("RFQ 2 seeded");

  console.log("\n✅ Seeding complete!");
  console.log("──────────────────────────────────────────");
  console.log("Test Credentials:");
  console.log("  Buyer    → buyer@gocomet.com / password123");
  console.log("  Supplier1 → supplier1@logistics.com / password123");
  console.log("  Supplier2 → supplier2@logistics.com / password123");
  console.log("  Supplier3 → supplier3@logistics.com / password123");
  console.log("──────────────────────────────────────────");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });