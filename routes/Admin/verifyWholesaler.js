const express = require("express");
const router = express.Router();

// Controller
const { verifyWholesaler } = require("../../controllers/admin/verifyWholesaler");

// Route

// Verify wholesaler
router.post("/verify-wholesaler", verifyWholesaler);

module.exports = router;