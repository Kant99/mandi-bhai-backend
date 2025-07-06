const Auth = require("../../Models/Common/Auth");
const WholesalerProfile = require("../../Models/Wholesaler/ShopProfile");
const jwt = require("jsonwebtoken");
const { apiResponse } = require("../../utils/apiResponse");

exports.verifyWholesaler = async (req, res) => {
  try {
    const { wholesalerId } = req.body;

    if (!wholesalerId) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Wholesaler ID is required"));
    }

    // Find wholesaler in Auth model
    const wholesaler = await Auth.findOne({ _id: wholesalerId, role: "Wholesaler" });

    if (!wholesaler) {
      return res
        .status(404)
        .json(apiResponse(404, false, "Wholesaler not found"));
    }

    // Find wholesaler profile
    const shopProfile = await WholesalerProfile.findOne({ wholesalerId });

    if (!shopProfile) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Shop profile not found"));
    }

    if (shopProfile.isWholesalerVerified) {
      return res
        .status(400)
        .json(apiResponse(400, false, "Wholesaler already verified"));
    }

    // Verify wholesaler
    shopProfile.isWholesalerVerified = true;
    await shopProfile.save();

    // Activate wholesaler
    wholesaler.isActive = true;
    await wholesaler.save();

    // Create JWT payload
    const payload = {
      id: wholesaler._id,
      name: wholesaler.name,
      phoneNumber: wholesaler.phoneNumber,
      email: wholesaler.email,
      role: wholesaler.role,
      isActive: wholesaler.isActive,
    };

    // Generate JWT token for dashboard access
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "7d" }
    );

    // Set token in Authorization header
    res.set("Authorization", `Bearer ${token}`);

    return res
      .status(200)
      .json(
        apiResponse(200, true, "Wholesaler verified successfully", {
          wholesaler,
          shopProfile,
          token,
        })
      );
  } catch (error) {
    console.log("Error in verifyWholesaler:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to verify wholesaler"));
  }
};

