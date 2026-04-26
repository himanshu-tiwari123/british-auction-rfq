const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Main function called by the cron job every 30 seconds.
 * Checks all active auctions and extends them if trigger conditions are met.
 * Also closes auctions that have passed their bidCloseTime or forcedBidCloseTime.
 */
const checkAndExtendAuctions = async (io) => {
  const now = new Date();

  // Fetch all auctions that are currently active or upcoming
  const activeAuctions = await prisma.rfq.findMany({
    where: {
      status: { in: ["ACTIVE", "UPCOMING"] },
    },
  });

  for (const rfq of activeAuctions) {
    // --- Step 1: Activate upcoming auctions whose start time has passed ---
    if (rfq.status === "UPCOMING" && now >= rfq.bidStartTime) {
      await prisma.rfq.update({
        where: { id: rfq.id },
        data: { status: "ACTIVE" },
      });
      io.to(`rfq-${rfq.id}`).emit("auction_status_change", {
        rfqId: rfq.id,
        status: "ACTIVE",
      });
      console.log(`[CRON] RFQ ${rfq.referenceId} is now ACTIVE`);
      continue; // let it be processed next cycle
    }

    // --- Step 2: Force close if forced close time has passed ---
    if (now >= rfq.forcedBidCloseTime) {
      await prisma.rfq.update({
        where: { id: rfq.id },
        data: { status: "FORCE_CLOSED" },
      });
      io.to(`rfq-${rfq.id}`).emit("auction_status_change", {
        rfqId: rfq.id,
        status: "FORCE_CLOSED",
        message: "Auction has reached its forced close time",
      });
      console.log(`[CRON] RFQ ${rfq.referenceId} FORCE CLOSED`);
      continue;
    }

    // --- Step 3: Normal close if bid close time has passed ---
    if (now >= rfq.bidCloseTime) {
      await prisma.rfq.update({
        where: { id: rfq.id },
        data: { status: "CLOSED" },
      });
      io.to(`rfq-${rfq.id}`).emit("auction_status_change", {
        rfqId: rfq.id,
        status: "CLOSED",
        message: "Auction has closed",
      });
      console.log(`[CRON] RFQ ${rfq.referenceId} CLOSED normally`);
      continue;
    }

    // --- Step 4: Check if we're inside the trigger window ---
    const triggerWindowMs = rfq.triggerWindowMins * 60 * 1000;
    const timeUntilClose = rfq.bidCloseTime - now;

    if (timeUntilClose > triggerWindowMs) {
      // Still outside trigger window — nothing to do
      continue;
    }

    // We are inside the trigger window — check the trigger condition
    const windowStartTime = new Date(rfq.bidCloseTime - triggerWindowMs);
    const shouldExtend = await evaluateTrigger(rfq, windowStartTime, now);

    if (shouldExtend.triggered) {
      await applyExtension(rfq, shouldExtend.reason, io);
    }
  }
};

/**
 * Evaluates whether the trigger condition for a specific RFQ has been met.
 * Returns { triggered: bool, reason: string }
 */
const evaluateTrigger = async (rfq, windowStart, now) => {
  switch (rfq.extensionTrigger) {
    case "BID_RECEIVED":
      return await checkBidReceived(rfq, windowStart);

    case "ANY_RANK_CHANGE":
      return await checkAnyRankChange(rfq, windowStart);

    case "L1_RANK_CHANGE":
      return await checkL1RankChange(rfq, windowStart);

    default:
      return { triggered: false, reason: "" };
  }
};

/**
 * Trigger A — Did any bid come in during the trigger window?
 */
const checkBidReceived = async (rfq, windowStart) => {
  const recentBid = await prisma.bid.findFirst({
    where: {
      rfqId: rfq.id,
      submittedAt: { gte: windowStart },
    },
    include: { supplier: { select: { name: true } } },
  });

  if (recentBid) {
    return {
      triggered: true,
      reason: `New bid received from ${recentBid.supplier.name} at ${recentBid.submittedAt.toISOString()} during the trigger window`,
    };
  }

  return { triggered: false, reason: "" };
};

/**
 * Trigger B — Did any supplier's rank change during the trigger window?
 * We detect this by checking if any bid submitted in the window changed
 * the ordering when compared to bids before the window.
 */
const checkAnyRankChange = async (rfq, windowStart) => {
  // Get all bids before the window to establish baseline ranking
  const bidsBeforeWindow = await prisma.bid.findMany({
    where: { rfqId: rfq.id, submittedAt: { lt: windowStart } },
    orderBy: { totalCharges: "asc" },
    include: { supplier: { select: { name: true } } },
  });

  // Get bids submitted during the window
  const bidsInWindow = await prisma.bid.findMany({
    where: { rfqId: rfq.id, submittedAt: { gte: windowStart } },
    include: { supplier: { select: { name: true } } },
  });

  if (bidsInWindow.length === 0) {
    return { triggered: false, reason: "" };
  }

  // Check if any window bid is lower than the existing cheapest bid
  const lowestBefore = bidsBeforeWindow.length > 0 ? bidsBeforeWindow[0].totalCharges : Infinity;

  for (const bid of bidsInWindow) {
    if (bid.totalCharges < lowestBefore) {
      return {
        triggered: true,
        reason: `${bid.supplier.name} submitted a lower bid (${bid.totalCharges}) causing rank changes during the trigger window`,
      };
    }
  }

  // Even if not lowest, if there are multiple suppliers, any new bid shifts others
  if (bidsInWindow.length > 0 && bidsBeforeWindow.length > 0) {
    return {
      triggered: true,
      reason: `${bidsInWindow[0].supplier.name} submitted a bid during the trigger window causing supplier rank changes`,
    };
  }

  return { triggered: false, reason: "" };
};

/**
 * Trigger C — Did the L1 (lowest price / rank 1) supplier change?
 */
const checkL1RankChange = async (rfq, windowStart) => {
  // Get lowest bid before the window
  const l1Before = await prisma.bid.findFirst({
    where: { rfqId: rfq.id, submittedAt: { lt: windowStart } },
    orderBy: { totalCharges: "asc" },
    include: { supplier: { select: { name: true } } },
  });

  // Get the current overall lowest bid
  const l1Now = await prisma.bid.findFirst({
    where: { rfqId: rfq.id },
    orderBy: { totalCharges: "asc" },
    include: { supplier: { select: { name: true } } },
  });

  if (!l1Now) return { triggered: false, reason: "" };

  // If there was no prior L1 (first bid ever) — treat as rank change
  if (!l1Before) {
    return {
      triggered: true,
      reason: `${l1Now.supplier.name} became the first L1 bidder with a bid of ${l1Now.totalCharges}`,
    };
  }

  // L1 changed if the current lowest bidder is a different supplier
  if (l1Before.supplierId !== l1Now.supplierId) {
    return {
      triggered: true,
      reason: `L1 changed from ${l1Before.supplier.name} to ${l1Now.supplier.name} with a new low of ${l1Now.totalCharges}`,
    };
  }

  return { triggered: false, reason: "" };
};

/**
 * Applies the time extension to an RFQ.
 * Respects the forced close cap — never exceeds it.
 */
const applyExtension = async (rfq, reason, io) => {
  const extensionMs = rfq.extensionDurationMins * 60 * 1000;
  let newCloseTime = new Date(rfq.bidCloseTime.getTime() + extensionMs);

  // Hard cap: never go beyond forced close time
  if (newCloseTime > rfq.forcedBidCloseTime) {
    newCloseTime = rfq.forcedBidCloseTime;
    reason += " (capped at forced close time)";
  }

  // Skip if extension doesn't actually change anything
  if (newCloseTime <= rfq.bidCloseTime) {
    return;
  }

  const previousClose = rfq.bidCloseTime;

  // Update the RFQ's close time in DB
  await prisma.rfq.update({
    where: { id: rfq.id },
    data: { bidCloseTime: newCloseTime },
  });

  // Record the extension in the activity log
  await prisma.auctionExtensionLog.create({
    data: {
      rfqId: rfq.id,
      previousClose,
      newClose: newCloseTime,
      reason,
    },
  });

  console.log(
    `[EXTENSION] RFQ ${rfq.referenceId}: ${previousClose.toISOString()} → ${newCloseTime.toISOString()} | ${reason}`
  );

  // Notify all connected clients about the extension
  io.to(`rfq-${rfq.id}`).emit("auction_extended", {
    rfqId: rfq.id,
    previousClose,
    newClose: newCloseTime,
    reason,
  });
};

module.exports = { checkAndExtendAuctions };