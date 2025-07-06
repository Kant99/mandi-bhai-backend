const Auth = require("../../Models/Common/Auth");
const PhoneOtp = require("../../Models/Common/Phoneotp");
const jwt = require("jsonwebtoken");
const { apiResponse } = require("../../utils/apiResponse");

exports.signupRetailer = async (req, res) => {
  try {
    const { name, phoneNumber, email, otp } = req.body;

    // Validate required fields
    if (!name || !phoneNumber || !email || !otp) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Name, phone number, email, and OTP are required"));
    }

    // Validate name (alphanumeric and spaces, 2-50 characters)
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    if (!nameRegex.test(name)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid name format (2-50 characters, letters and spaces only)"));
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number must be 10 digits"));
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Invalid email format"));
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

    // Check if user exists
    let user = await Auth.findOne({ phoneNumber });

    if (user) {
      if (user.role !== "Retailer") {
        return res
          .status(403)
          .json(apiResponse(403, false, "Phone number registered with a different role"));
      }
      return res
        .status(400)
        .json(apiResponse(400, false, "Retailer already exists"));
    }

    // Check email uniqueness
    user = await Auth.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Email already exists"));
    }

    // Create new retailer
    user = new Auth({
      name,
      phoneNumber,
      email,
      isPhoneVerified: true,
      role: "Retailer",
      isActive: true, 
    });

    // Save retailer
    await user.save();

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
      .status(201)
      .json(
        apiResponse(201, true, "Retailer signed up successfully", {
          user,
          token,
        })
      );
  } catch (error) {
    console.log("Error in signupRetailer:", error.message);
    if (error.code === 11000) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Phone number or email already exists"));
    }
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to sign up retailer"));
  }
};