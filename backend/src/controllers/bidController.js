const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// POST /api/bid/submit
const submitBid = async (req, res) => {
  const {
    rfqId,
    carrierName,
    freightCharges,
    originCharges,
    destinationCharges,
    transitTimeDays,
    quoteValidity,
  } = req.body;

  if (
    !rfqId || !carrierName || freightCharges == null ||
    originCharges == null || destinationCharges == null ||
    !transitTimeDays || !quoteValidity
  ) {
    return res.status(400).json({ message: "All bid fields are required" });
  }

  try {
    const rfq = await prisma.rfq.findUnique({ where: { id: parseInt(rfqId) } });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    const now = new Date();

    // Can't bid before auction opens
    if (now < rfq.bidStartTime) {
      return res.status(400).json({ message: "Auction has not started yet" });
    }

    // Can't bid after close (respects current extended close time)
    if (now > rfq.bidCloseTime) {
      return res.status(400).json({
        message: "Bidding is closed for this auction",
      });
    }

    if (rfq.status === "CLOSED" || rfq.status === "FORCE_CLOSED") {
      return res.status(400).json({ message: "This auction is no longer accepting bids" });
    }

    const totalCharges =
      parseFloat(freightCharges) +
      parseFloat(originCharges) +
      parseFloat(destinationCharges);

    const bid = await prisma.bid.create({
      data: {
        rfqId: parseInt(rfqId),
        supplierId: req.user.id,
        carrierName,
        freightCharges: parseFloat(freightCharges),
        originCharges: parseFloat(originCharges),
        destinationCharges: parseFloat(destinationCharges),
        totalCharges,
        transitTimeDays: parseInt(transitTimeDays),
        quoteValidity: new Date(quoteValidity),
      },
      include: {
        supplier: { select: { name: true, email: true } },
      },
    });

    // After new bid, recalculate and update all ranks for this RFQ
    await recalculateRanks(parseInt(rfqId));

    // Emit real-time update to all clients watching this RFQ
    const io = req.app.get("io");
    const updatedBids = await getUpdatedBids(parseInt(rfqId));
    io.to(`rfq-${rfqId}`).emit("bid_update", { rfqId, bids: updatedBids });

    res.status(201).json({ message: "Bid submitted successfully", bid });
  } catch (err) {
    console.error("Submit bid error:", err);
    res.status(500).json({ message: "Failed to submit bid" });
  }
};

// GET /api/bid/:rfqId
const getBidsForRfq = async (req, res) => {
  const { rfqId } = req.params;

  try {
    const bids = await prisma.bid.findMany({
      where: { rfqId: parseInt(rfqId) },
      orderBy: { totalCharges: "asc" },
      include: {
        supplier: { select: { name: true, email: true } },
      },
    });

    const bidsWithRank = bids.map((bid, index) => ({
      ...bid,
      rank: index + 1,
      rankLabel: `L${index + 1}`,
    }));

    res.json({ bids: bidsWithRank });
  } catch (err) {
    console.error("Get bids error:", err);
    res.status(500).json({ message: "Failed to fetch bids" });
  }
};

// Helper — recalculate and persist rank field in DB
const recalculateRanks = async (rfqId) => {
  const bids = await prisma.bid.findMany({
    where: { rfqId },
    orderBy: { totalCharges: "asc" },
  });

  // Update rank for each bid in DB
  const updates = bids.map((bid, index) =>
    prisma.bid.update({
      where: { id: bid.id },
      data: { rank: index + 1 },
    })
  );

  await Promise.all(updates);
};

// Helper — fetch fresh bids with rank labels for socket emission
const getUpdatedBids = async (rfqId) => {
  const bids = await prisma.bid.findMany({
    where: { rfqId },
    orderBy: { totalCharges: "asc" },
    include: {
      supplier: { select: { name: true, email: true } },
    },
  });

  return bids.map((bid, index) => ({
    ...bid,
    rank: index + 1,
    rankLabel: `L${index + 1}`,
  }));
};

module.exports = { submitBid, getBidsForRfq, recalculateRanks, getUpdatedBids };