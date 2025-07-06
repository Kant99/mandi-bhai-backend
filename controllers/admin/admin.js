const WholesalerProfile = require('../../Models/Wholesaler/ShopProfile');
const { apiResponse } = require('../../utils/apiResponse');

// View all wholesalers (no auth, for testing)
exports.viewAllWholesalers = async (req, res) => {
  try {
    const wholesalers = await WholesalerProfile.find().populate('wholesalerId', 'name email phone');
    return res.status(200).json(apiResponse(200, true, 'All wholesalers retrieved successfully', { wholesalers }));
  } catch (error) {
    console.log('Error in viewAllWholesalers:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve wholesalers'));
  }
};
