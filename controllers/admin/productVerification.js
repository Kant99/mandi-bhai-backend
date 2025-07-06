const Product = require("../../Models/Product/Product");
const { apiResponse } = require("../../utils/apiResponse");

exports.verifyProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { approvalStatus } = req.body;
    if (!['Verified', 'Rejected'].includes(approvalStatus)) {
      return res.status(400).json(apiResponse(400, false, "Invalid approval status. Must be 'Verified' or 'Rejected'."));
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json(apiResponse(404, false, "Product not found"));
    }
    product.approvalStatus = approvalStatus;
    await product.save();
    return res.status(200).json(apiResponse(200, true, `Product ${approvalStatus.toLowerCase()} successfully`, { product }));
  } catch (error) {
    console.log("Error in verifyProduct:", error.message);
    return res.status(500).json(apiResponse(500, false, "Failed to verify product"));
  }
};
