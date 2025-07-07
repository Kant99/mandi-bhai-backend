const express = require("express");
const router = express.Router();
const multer = require("multer");

// Controllers
const {
  signupWholesaler,
  kycProfileDetails,
  kycDocumentsUpload,
  kycAccountDetails
} = require("../../controllers/wholesaler/auth");

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes

// Wholesaler signup ( phone, OTP)
router.post("/signup", signupWholesaler);

// KYC Step 1: Profile Details
router.post("/kyc/profile", kycProfileDetails);

// KYC Step 2: Documents Upload
router.post(
  "/kyc/documents",
  upload.fields([
    { name: "idProof", maxCount: 1 },
    { name: "businessRegistration", maxCount: 1 },
    { name: "addressProof", maxCount: 1 }
  ]),
  kycDocumentsUpload
);

// KYC Step 3: Account Details
router.post("/kyc/account", kycAccountDetails);


module.exports = router;