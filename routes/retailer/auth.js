const express = require("express");
const router = express.Router();

const { signupRetailer } = require("../../controllers/retailer/auth");

// Retailer signup (name, phone, email, OTP)
router.post("/signup", signupRetailer);

module.exports = router;