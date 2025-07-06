const Auth = require("../../Models/Common/Auth");
const WholesalerProfile = require("../../Models/Wholesaler/ShopProfile");
const PhoneOtp = require("../../Models/Common/Phoneotp");
const jwt = require("jsonwebtoken");
const { apiResponse } = require("../../utils/apiResponse");

exports.login = async (req, res) => {
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

    // Find user in Auth model
    const user = await Auth.findOne({ phoneNumber });

    if (!user) {
      return res
        .status(404)
        .json(apiResponse(404, false, "User not found"));
    }

    // Check phone verification
    if (!user.isPhoneVerified) {
      return res
        .status(403)
        .json(apiResponse(403, false, "Phone number not verified"));
    }

    // Handle Retailer login
    if (user.role === "Retailer") {
      if (!user.isActive) {
        return res
          .status(403)
          .json(apiResponse(403, false, "Retailer account is not active"));
      }

      // Create JWT payload
      const payload = {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      };

      // Generate JWT token
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "7d" }
      );

      // Set token in Authorization header
      res.set("Authorization", `Bearer ${token}`);

      // Remove OTP record
      await PhoneOtp.deleteOne({ phoneNumber });

      return res
        .status(200)
        .json(
          apiResponse(200, true, "Retailer logged in successfully", {
            user,
            token,
          })
        );
    }

    // Handle Wholesaler login
    if (user.role === "Wholesaler") {
      if (!user.isActive) {
        return res
          .status(403)
          .json(apiResponse(403, false, "Wholesaler account is not active"));
      }

      if (!user.hasShopDetail) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Shop profile not created"));
      }

      // Find wholesaler profile
      const shopProfile = await WholesalerProfile.findOne({ wholesalerId: user._id });

      if (!shopProfile) {
        return res
          .status(400)
          .json(apiResponse(400, false, "Shop profile not found"));
      }

      if (!shopProfile.isWholesalerVerified) {
        return res
          .status(403)
          .json(apiResponse(403, false, "Wholesaler not verified by admin"));
      }

      // Create JWT payload
      const payload = {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      };

      // Generate JWT token
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "7d" }
      );

      // Set token in Authorization header
      res.set("Authorization", `Bearer ${token}`);

      // Remove OTP record
      await PhoneOtp.deleteOne({ phoneNumber });

      return res
        .status(200)
        .json(
          apiResponse(200, true, "Wholesaler logged in successfully", {
            user,
            shopProfile,
            token,
          })
        );
    }

    // If role is neither Retailer nor Wholesaler
    return res
      .status(403)
      .json(apiResponse(403, false, "Invalid user role"));
  } catch (error) {
    console.log("Error in login:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to log in"));
  }
};