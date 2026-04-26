const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// POST /api/rfq/create
const createRfq = async (req, res) => {
  const {
    name,
    pickupDate,
    bidStartTime,
    bidCloseTime,
    forcedBidCloseTime,
    triggerWindowMins,
    extensionDurationMins,
    extensionTrigger,
  } = req.body;

  // Basic field check
  if (
    !name || !pickupDate || !bidStartTime ||
    !bidCloseTime || !forcedBidCloseTime ||
    !triggerWindowMins || !extensionDurationMins || !extensionTrigger
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const closeTime = new Date(bidCloseTime);
  const forcedClose = new Date(forcedBidCloseTime);

  // Validation: forced close must be strictly after bid close
  if (forcedClose <= closeTime) {
    return res.status(400).json({
      message: "Forced Bid Close Time must be later than Bid Close Time",
    });
  }

  const validTriggers = ["BID_RECEIVED", "ANY_RANK_CHANGE", "L1_RANK_CHANGE"];
  if (!validTriggers.includes(extensionTrigger)) {
    return res.status(400).json({ message: "Invalid extension trigger type" });
  }

  try {
    // Auto-generate a reference ID like RFQ-1704067200000
    const referenceId = `RFQ-${Date.now()}`;

    const rfq = await prisma.rfq.create({
      data: {
        referenceId,
        name,
        pickupDate: new Date(pickupDate),
        bidStartTime: new Date(bidStartTime),
        bidCloseTime: closeTime,
        forcedBidCloseTime: forcedClose,
        triggerWindowMins: parseInt(triggerWindowMins),
        extensionDurationMins: parseInt(extensionDurationMins),
        extensionTrigger,
        buyerId: req.user.id,
        status: "UPCOMING",
      },
    });

    res.status(201).json({ message: "RFQ created successfully", rfq });
  } catch (err) {
    console.error("Create RFQ error:", err);
    res.status(500).json({ message: "Failed to create RFQ" });
  }
};

// GET /api/rfq/list
const listRfqs = async (req, res) => {
  try {
    const rfqs = await prisma.rfq.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { name: true, email: true } },
        bids: {
          orderBy: { totalCharges: "asc" },
          take: 1, // get only the lowest bid for listing
          select: { totalCharges: true },
        },
      },
    });

    // Shape the response for the listing page
    const shaped = rfqs.map((rfq) => ({
      id: rfq.id,
      referenceId: rfq.referenceId,
      name: rfq.name,
      status: rfq.status,
      bidCloseTime: rfq.bidCloseTime,
      forcedBidCloseTime: rfq.forcedBidCloseTime,
      lowestBid: rfq.bids.length > 0 ? rfq.bids[0].totalCharges : null,
      buyer: rfq.buyer.name,
    }));

    res.json({ rfqs: shaped });
  } catch (err) {
    console.error("List RFQ error:", err);
    res.status(500).json({ message: "Failed to fetch RFQs" });
  }
};

// GET /api/rfq/:id
const getRfqById = async (req, res) => {
  const { id } = req.params;

  try {
    const rfq = await prisma.rfq.findUnique({
      where: { id: parseInt(id) },
      include: {
        buyer: { select: { name: true, email: true } },
        bids: {
          orderBy: { totalCharges: "asc" },
          include: {
            supplier: { select: { name: true, email: true } },
          },
        },
        extensionLogs: {
          orderBy: { triggeredAt: "asc" },
        },
      },
    });

    if (!rfq) {
      return res.status(404).json({ message: "RFQ not found" });
    }

    // Add rank labels L1, L2, L3...
    const bidsWithRank = rfq.bids.map((bid, index) => ({
      ...bid,
      rank: index + 1,
      rankLabel: `L${index + 1}`,
    }));

    res.json({
      rfq: {
        ...rfq,
        bids: bidsWithRank,
      },
    });
  } catch (err) {
    console.error("Get RFQ error:", err);
    res.status(500).json({ message: "Failed to fetch RFQ details" });
  }
};

module.exports = { createRfq, listRfqs, getRfqById };