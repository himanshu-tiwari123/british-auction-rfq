const cron = require("node-cron");
const { checkAndExtendAuctions } = require("../services/extensionService");

const startAuctionCron = (io) => {
  // Runs every 30 seconds — fine-grained enough for near-real-time extension
  cron.schedule("*/30 * * * * *", async () => {
    console.log("[CRON] Checking auctions for extensions...");
    try {
      await checkAndExtendAuctions(io);
    } catch (err) {
      console.error("[CRON] Error during auction check:", err);
    }
  });

  console.log("[CRON] Auction extension job scheduled (every 30s)");
};

module.exports = { startAuctionCron };