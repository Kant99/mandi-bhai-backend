const express = require("express");
const router = express.Router();
const multer = require("multer");

// Controllers
const { signupWholesaler ,createShopProfile, kycVerification } = require("../../controllers/wholesaler/auth");


// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes

// Wholesaler signup (name, phone, email, OTP)
router.post("/signup", signupWholesaler);

// Create wholesaler shop profile (with business certificate file upload)
router.post("/create-shop-profile/:wholesalerId", upload.single("businessCertificate"), createShopProfile);

// KYC Verification route (with file upload)
router.patch(
  "/:wholesalerId/kyc-verification",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "businessRegistration", maxCount: 1 },
  ]),
  kycVerification
);

module.exports = router;