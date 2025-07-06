const express = require("express");
const router = express.Router();

const { login } = require("../../controllers/common/login");

// Login for Retailer or Wholesaler (phone number, OTP)
router.post("/", login);

module.exports = router;