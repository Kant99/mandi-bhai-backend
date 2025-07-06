const { apiResponse } = require("../utils/apiResponse");

exports.isWholesaler = (req, res, next) => {
  if (!req.user || req.user.role !== "Wholesaler") {
    return res
      .status(403)
      .json(apiResponse(403, false, "Partner access required"));
  }
  next();
};
