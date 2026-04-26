const express = require("express");
const router = express.Router();
const { createRfq, listRfqs, getRfqById } = require("../controllers/rfqController");
const { protect, buyerOnly } = require("../middleware/authMiddleware");

// Only buyers can create RFQs
router.post("/create", protect, buyerOnly, createRfq);

// Anyone logged in can view the auction list and details
router.get("/list", protect, listRfqs);
router.get("/:id", protect, getRfqById);

module.exports = router;