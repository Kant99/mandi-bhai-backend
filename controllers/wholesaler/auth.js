const Auth = require("../../Models/Common/Auth");
const WholesalerProfile = require("../../Models/Wholesaler/ShopProfile");
const PhoneOtp = require("../../Models/Common/Phoneotp");
const { apiResponse } = require("../../utils/apiResponse");
const { uploadImageOrPdf } = require("../../utils/s3Upload");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");


exports.signupWholesaler = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    console.log("recieved phoneNumber and otp", phoneNumber, otp , "from signupWholesaler");
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
    if (String(otpRecord.otp) !== String(otp)) {
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

    // Remove OTP record
    await PhoneOtp.deleteOne({ phoneNumber });
    console.log(wholesaler);

    // Create JWT payload (same as login)
    const payload = {
      id: wholesaler._id,
      role: wholesaler.role,
      isActive: wholesaler.isActive,
      phoneNumber: wholesaler.phoneNumber,
    };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );
    res.set("Authorization", `Bearer ${token}`);
    // Remove OTP record
    await PhoneOtp.deleteOne({ phoneNumber });

    return res
      .status(201)
      .json(apiResponse(201, true, "Wholesaler signed up successfully, please create shop profile", { wholesaler, token }));
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


// KYC Step 1: Profile Details
exports.kycProfileDetails = async (req, res) => {
  try {
    const {
      wholesalerId,
      fullName,
      email,
      phoneNumber,
      businessName,
      businessType,
      gstNumber,
      apmcRegion,
      businessAddress,
      location,
    } = req.body;

    // Validate wholesalerId
    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    // Validate required fields
    if (!fullName || !phoneNumber || !businessName || !businessType || !gstNumber || !apmcRegion || !businessAddress) {
      return res.status(400).json(apiResponse(400, false, "All profile fields are required"));
    }

    // Validate GST number (Indian GST: 15 characters)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      return res.status(400).json(apiResponse(400, false, "Invalid GST number format"));
    }

    // Hardcoded allowed APMC regions (to be replaced with DB/config fetch in future)
    const allowedApmcRegions = ["Mumbai APMC", "Delhi APMC", "Pune APMC", "Vashi APMC Market", "Azadpur APMC Market", "Bangalore APMC Market", "Kolkata APMC Market", "Chennai APMC Market", "Ahmedabad APMC Market"];
    if (!allowedApmcRegions.includes(apmcRegion)) {
      return res.status(400).json(apiResponse(400, false, "Invalid APMC region selected"));
    }

    // Find wholesaler
    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });
    if (!wholesaler) {
      return res.status(404).json(apiResponse(404, false, "Wholesaler not found"));
    }

    // Find or create shop profile
    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });
    if (!shopProfile) {
      shopProfile = new WholesalerProfile({ wholesalerId });
    }

    // Update profile fields
    shopProfile.businessName = businessName;
    shopProfile.businessType = businessType;
    shopProfile.gstNumber = gstNumber;
    shopProfile.apmcRegion = apmcRegion;
    shopProfile.businessAddress = businessAddress;
    // Optionally update fullName, email, phoneNumber in Auth
    wholesaler.fullName = fullName;
    wholesaler.email = email;
    wholesaler.phoneNumber = phoneNumber;

    if (location && location.latitude && location.longitude) {
      shopProfile.location = {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      };
    }

    await shopProfile.save();
    await wholesaler.save();

    return res.status(200).json(apiResponse(200, true, "Profile details saved successfully", { shopProfile }));
  } catch (error) {
    console.log("Error in kycProfileDetails:", error.message);
    return res.status(500).json(apiResponse(500, false, "Failed to save profile details"));
  }
};

// KYC Step 2: Documents Upload
exports.kycDocumentsUpload = async (req, res) => {
  try {
    const { wholesalerId } = req.body;
    // Files: idProof, businessRegistration, addressProof
    const idProofFile = req.files?.idProof?.[0];
    const businessRegistrationFile = req.files?.businessRegistration?.[0];
    const addressProofFile = req.files?.addressProof?.[0];

    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    if (!idProofFile || !businessRegistrationFile || !addressProofFile) {
      return res.status(400).json(apiResponse(400, false, "All document files are required"));
    }

    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });
    if (!wholesaler) {
      return res.status(404).json(apiResponse(404, false, "Wholesaler not found"));
    }

    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });
    if (!shopProfile) {
      shopProfile = new WholesalerProfile({ wholesalerId });
    }

    // Upload files to S3
    try {
      shopProfile.idProof = await uploadImageOrPdf(idProofFile, "id-proofs");
      shopProfile.businessRegistration = await uploadImageOrPdf(businessRegistrationFile, "business-registrations");
      shopProfile.addressProof = await uploadImageOrPdf(addressProofFile, "address-proofs");
    } catch (uploadError) {
      return res.status(400).json(apiResponse(400, false, `Failed to upload documents: ${uploadError.message}`));
    }

    await shopProfile.save();
    return res.status(200).json(apiResponse(200, true, "Documents uploaded successfully", { shopProfile }));
  } catch (error) {
    console.log("Error in kycDocumentsUpload:", error.message);
    return res.status(500).json(apiResponse(500, false, "Failed to upload documents"));
  }
};

// KYC Step 3: Account Details
exports.kycAccountDetails = async (req, res) => {
  try {
    const { wholesalerId, upiId, accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(wholesalerId)) {
      return res.status(400).json(apiResponse(400, false, "Invalid wholesaler ID"));
    }

    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });
    if (!wholesaler) {
      return res.status(404).json(apiResponse(404, false, "Wholesaler not found"));
    }

    let shopProfile = await WholesalerProfile.findOne({ wholesalerId });
    if (!shopProfile) {
      shopProfile = new WholesalerProfile({ wholesalerId });
    }

    // Either UPI or Bank Account must be provided
    if (upiId) {
      shopProfile.upiId = upiId;
      // Clear bank details if switching to UPI
      shopProfile.accountHolderName = undefined;
      shopProfile.accountNumber = undefined;
      shopProfile.ifscCode = undefined;
      shopProfile.bankName = undefined;
    } else if (accountHolderName && accountNumber && ifscCode && bankName) {
      shopProfile.accountHolderName = accountHolderName;
      shopProfile.accountNumber = accountNumber;
      shopProfile.ifscCode = ifscCode;
      shopProfile.bankName = bankName;
      // Clear UPI if switching to bank
      shopProfile.upiId = undefined;
    } else {
      return res.status(400).json(apiResponse(400, false, "Provide either UPI ID or all bank account details"));
    }

    await shopProfile.save();
    return res.status(200).json(apiResponse(200, true, "Account details saved successfully", { shopProfile }));
  } catch (error) {
    console.log("Error in kycAccountDetails:", error.message);
    return res.status(500).json(apiResponse(500, false, "Failed to save account details"));
  }
};

