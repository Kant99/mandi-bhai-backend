const Auth = require("../../Models/Common/Auth");
const WholesalerProfile = require("../../Models/Wholesaler/ShopProfile");
const PhoneOtp = require("../../Models/Common/Phoneotp");
const { apiResponse } = require("../../utils/apiResponse");
const { uploadImageOrPdf } = require("../../utils/s3Upload");
const mongoose = require("mongoose");


exports.signupWholesaler = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    // Validate required fields
    if (!phoneNumber || !otp) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number and OTP are required"));
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number must be 10 digits"));
    }

    // Fetch OTP record
    const otpRecord = await PhoneOtp.findOne({ phoneNumber }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res
        .status(400)
        .json(apiResponse(400, false, "OTP not found for this phone number"));
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(401).json(apiResponse(401, false, "Invalid OTP"));
    }

    // Check OTP expiry (5 minutes)
    const otpExpiryTime = 5 * 60 * 1000; // 5 minutes
    const otpAge = Date.now() - otpRecord.createdAt.getTime();
    if (otpAge > otpExpiryTime) {
      return res.status(400).json(apiResponse(400, false, "OTP has expired"));
    }

    // Check if wholesaler exists
    let wholesaler = await Auth.findOne({ phoneNumber });

    if (wholesaler) {
      if (wholesaler.role !== "Wholesaler") {
        return res
          .status(403)
          .json(apiResponse(403, false, "Phone number registered with a different role"));
      }
      if (wholesaler.hasShopDetail) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Wholesaler already exists with profile"));
      } else {
        // Check if shop profile exists, if not, create it
        let shopProfile = await WholesalerProfile.findOne({ wholesalerId: wholesaler._id });
        if (!shopProfile) {
          shopProfile = new WholesalerProfile({ wholesalerId: wholesaler._id });
          await shopProfile.save();
        }
        return res
          .status(200)
          .json(apiResponse(200, true, "Wholesaler profile not created, please create profile", { wholesalerId: wholesaler._id }));
      }
    }

    // Create new wholesaler
    wholesaler = new Auth({
      phoneNumber: phoneNumber,
      isPhoneVerified: true,
      role: "Wholesaler",
    });

    // Save wholesaler
    await wholesaler.save();

    // Create empty shop profile with wholesalerId
    const shopProfile = new WholesalerProfile({
      wholesalerId: wholesaler._id,
    });

    // Save shop profile
    await shopProfile.save();

    // Remove OTP record
    await PhoneOtp.deleteOne({ phoneNumber });
    console.log(wholesaler);

    return res
      .status(201)
      .json(apiResponse(201, true, "Wholesaler signed up successfully, please create shop profile", { wholesaler }));
  } catch (error) {
    console.log("Error in signupWholesaler:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to sign up wholesaler"));
  }
};


exports.createShopProfile = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const {
      apmcRegion,
      businessName,
      businessHours: businessHoursString,
      gstNumber,
    } = req.body;

    const businessCertificateFile = req.file; // From multer

    // Validate wholesalerId
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    // Hardcoded allowed APMC regions (to be replaced with DB/config fetch in future)
    const allowedApmcRegions = ["Mumbai APMC", "Delhi APMC", "Pune APMC"];

    // Validate required fields
    if (
      !businessHoursString ||
      !gstNumber ||
      !businessCertificateFile ||
      !apmcRegion ||
      !businessName 
    ) {
      return res
        .status(400)
        .json(apiResponse(400, false, "All shop profile fields and business certificate file are required"));
    }

    // Validate apmcRegion against allowed list
    if (!allowedApmcRegions.includes(apmcRegion)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid APMC region selected"));
    }

    // Parse businessHours
    let businessHours;
    try {
      businessHours = JSON.parse(businessHoursString);
    } catch (parseError) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid business hours format: must be a valid JSON string"));
    }

    // Validate businessHours structure and format
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (
      !businessHours.monToSat ||
      !businessHours.monToSat.open ||
      !businessHours.monToSat.close ||
      !businessHours.sunday ||
      !businessHours.sunday.open ||
      !businessHours.sunday.close ||
      !timeRegex.test(businessHours.monToSat.open) ||
      !timeRegex.test(businessHours.monToSat.close) ||
      !timeRegex.test(businessHours.sunday.open) ||
      !timeRegex.test(businessHours.sunday.close)
    ) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid business hours format (e.g., '08:00 AM')"));
    }

    // Validate GST number (Indian GST: 15 characters)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid GST number format"));
    }

    // Find wholesaler
    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });

    if (!wholesaler) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Wholesaler not found"));
    }

    if (!wholesaler.isPhoneVerified) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Phone number not verified"));
    }

    if (wholesaler.hasShopDetail) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Shop profile already created"));
    }

    // Find existing shop profile
    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });

    if (!shopProfile) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Shop profile not found for this wholesaler"));
    }

    // Upload business certificate to S3
    let businessCertificateUrl;
    try {
      businessCertificateUrl = await uploadImageOrPdf(businessCertificateFile, "business-certificates");
    } catch (uploadError) {
      return res
        .status(400)
        .json(apiResponse(400, false, `Failed to upload business certificate: ${uploadError.message}`));
    }

    // Update shop profile with details
    shopProfile.apmcRegion = apmcRegion;
    shopProfile.businessName = businessName;
    shopProfile.businessHours = businessHours;
    shopProfile.gstNumber = gstNumber;
    shopProfile.businessCertificate = businessCertificateUrl;

    // Save updated profile
    await shopProfile.save();

    // Update Auth model
    wholesaler.hasShopDetail = true;
    await wholesaler.save();

    return res
      .status(201)
      .json(apiResponse(201, true, "Shop profile updated successfully, awaiting admin verification", { shopProfile }));
  } catch (error) {
    console.log("Error in createShopProfile:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "GST number already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to update shop profile"));
  }
};


exports.kycVerification = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const {
      apmcRegion,
      businessName,
      businessHours: businessHoursString,
      gstNumber,
      businessType,
      businessAddress,
      location,
      upiId,
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName,
    } = req.body;

    // Correctly access files from multer.fields
    const businessCertificateFile = req.file || req.files?.businessCertificate?.[0];
    const idProofFile = req.files?.idProof?.[0];
    const businessRegistrationFile = req.files?.businessRegistration?.[0];

    // Validate wholesalerId
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    // Hardcoded allowed APMC regions (to be replaced with DB/config fetch in future)
    const allowedApmcRegions = ["Mumbai APMC", "Delhi APMC", "Pune APMC"];

    // Validate required shop profile fields
    if (
      !businessHoursString ||
      !gstNumber ||
      !businessCertificateFile ||
      !apmcRegion ||
      !businessName
    ) {
      return res.status(400).json(apiResponse(400, false, "All shop profile fields and business certificate file are required"));
    }

    // Validate apmcRegion against allowed list
    if (!allowedApmcRegions.includes(apmcRegion)) {
      return res.status(400).json(apiResponse(400, false, "Invalid APMC region selected"));
    }

    // Parse and validate businessHours
    let businessHours;
    try {
      businessHours = JSON.parse(businessHoursString);
    } catch (parseError) {
      return res.status(400).json(apiResponse(400, false, "Invalid business hours format: must be a valid JSON string"));
    }

    // Validate businessHours structure and format
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (
      !businessHours.monToSat ||
      !businessHours.monToSat.open ||
      !businessHours.monToSat.close ||
      !businessHours.sunday ||
      !businessHours.sunday.open ||
      !businessHours.sunday.close ||
      !timeRegex.test(businessHours.monToSat.open) ||
      !timeRegex.test(businessHours.monToSat.close) ||
      !timeRegex.test(businessHours.sunday.open) ||
      !timeRegex.test(businessHours.sunday.close)
    ) {
      return res.status(400).json(apiResponse(400, false, "Invalid business hours format (e.g., '08:00 AM')"));
    }

    // Validate GST number (Indian GST: 15 characters)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      return res.status(400).json(apiResponse(400, false, "Invalid GST number format"));
    }

    // Parse businessAddress and location if they are strings
    let parsedBusinessAddress = businessAddress;
    let parsedLocation = location;
    if (typeof businessAddress === "string") {
      try {
        parsedBusinessAddress = JSON.parse(businessAddress);
      } catch (e) {
        return res.status(400).json(apiResponse(400, false, "Invalid businessAddress JSON format"));
      }
    }
    if (typeof location === "string") {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        return res.status(400).json(apiResponse(400, false, "Invalid location JSON format"));
      }
    }

    // Find wholesaler
    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });
    if (!wholesaler) {
      return res.status(404).json(apiResponse(404, false, "Wholesaler not found"));
    }

    if (!wholesaler.isPhoneVerified) {
      return res.status(403).json(apiResponse(403, false, "Phone number not verified"));
    }

    // Find or create shop profile
    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });
    if (!shopProfile) {
      shopProfile = new WholesalerProfile({ wholesalerId });
    }

    // Check if shop profile already exists
    if (wholesaler.hasShopDetail) {
      return res.status(400).json(apiResponse(400, false, "Shop profile already created"));
    }

    // Upload business certificate to S3
    let businessCertificateUrl;
    try {
      businessCertificateUrl = await uploadImageOrPdf(businessCertificateFile, "business-certificates");
    } catch (uploadError) {
      return res.status(400).json(apiResponse(400, false, `Failed to upload business certificate: ${uploadError.message}`));
    }

    // Update shop profile with all details
    shopProfile.apmcRegion = apmcRegion;
    shopProfile.businessName = businessName;
    shopProfile.businessHours = businessHours;
    shopProfile.gstNumber = gstNumber;
    shopProfile.businessCertificate = businessCertificateUrl;

    // Update KYC fields if provided
    if (businessType) shopProfile.businessType = businessType;
    if (parsedBusinessAddress) shopProfile.businessAddress = parsedBusinessAddress;
    if (parsedLocation) shopProfile.location = parsedLocation;
    if (upiId) shopProfile.upiId = upiId;
    if (accountHolderName) shopProfile.accountHolderName = accountHolderName;
    if (accountNumber) shopProfile.accountNumber = accountNumber;
    if (ifscCode) shopProfile.ifscCode = ifscCode;
    if (bankName) shopProfile.bankName = bankName;

    // Handle additional file uploads
    if (idProofFile) {
      shopProfile.idProof = await uploadImageOrPdf(idProofFile, "id-proofs");
    }
    if (businessRegistrationFile) {
      shopProfile.businessRegistration = await uploadImageOrPdf(businessRegistrationFile, "business-registrations");
    }

    // Save updated profile
    await shopProfile.save();

    // Update Auth model
    wholesaler.hasShopDetail = true;
    await wholesaler.save();

    return res.status(201).json(apiResponse(201, true, "KYC verification and shop profile updated successfully, awaiting admin verification", { shopProfile }));
  } catch (error) {
    console.log("Error in kycVerification:", error.message);
    if (error.code === 11000) {
      return res.status(400).json(apiResponse(400, false, "GST number already exists"));
    }
    return res.status(500).json(apiResponse(500, false, "Failed to update KYC verification and shop profile"));
  }
};

