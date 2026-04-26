const express = require("express");
const router = express.Router();
const { submitBid, getBidsForRfq } = require("../controllers/bidController");
const { protect, supplierOnly } = require("../middleware/authMiddleware");

// Only suppliers can submit bids
router.post("/submit", protect, supplierOnly, submitBid);

// Anyone logged in can view bids
router.get("/:rfqId", protect, getBidsForRfq);

module.exports = router;