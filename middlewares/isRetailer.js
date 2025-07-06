const { apiResponse } = require("../utils/apiResponse");


exports.isPartner = (req, res, next) => {
    if (!req.user || req.user.role !== "Retailer") {
      return res.status(403).json(
        apiResponse(403, false, "Retailer access required")
      );
    }
    next();
  };