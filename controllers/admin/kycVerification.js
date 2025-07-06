const ShopProfile = require("../../Models/Wholesaler/ShopProfile");
const { apiResponse } = require("../../utils/apiResponse");

exports.verifyKyc = async (req, res) => {
  try {
    const { wholesalerId } = req.params;
    const { kycStatus } = req.body;
    if (!['Completed', 'Rejected'].includes(kycStatus)) {
      return res.status(400).json(apiResponse(400, false, "Invalid KYC status. Must be 'Completed' or 'Rejected'."));
    }
    const shopProfile = await ShopProfile.findOne({ wholesalerId });
    if (!shopProfile) {
      return res.status(404).json(apiResponse(404, false, "Shop profile not found"));
    }
    shopProfile.kycStatus = kycStatus;
    await shopProfile.save();
    return res.status(200).json(apiResponse(200, true, `KYC ${kycStatus.toLowerCase()} successfully`, { shopProfile }));
  } catch (error) {
    console.log("Error in verifyKyc:", error.message);
    return res.status(500).json(apiResponse(500, false, "Failed to verify KYC"));
  }
};
