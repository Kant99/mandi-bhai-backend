const Order = require('../../Models/Common/Order');
const { apiResponse } = require('../../utils/apiResponse');
const RetailerProfile = require('../../Models/Retailer/Profile');


exports.getAllOrdersForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const orders = await Order.find({ wholesalerId })
      .populate('retailerId', 'name phoneNumber address')
      .sort({ createdAt: -1 });
    if (orders.length === 0) {
      return res.status(404).json(apiResponse(404, false, 'No orders found for this wholesaler'));
    }
    return res.status(200).json(apiResponse(200, true, 'Orders retrieved successfully', { orders }));
  } catch (error) {
    console.log('Error in getAllOrdersForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve orders'));
  }
};

/**
 * Get a single order by ID (wholesaler can only access their own orders)
 */
exports.getOrderByIdForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, wholesalerId })
      .populate('retailerId', 'name phoneNumber address');
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    return res.status(200).json(apiResponse(200, true, 'Order retrieved successfully', { order }));
  } catch (error) {
    console.log('Error in getOrderByIdForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve order'));
  }
};

/**
 * Update order status (confirm, dispatch, deliver, reject, cancel) - wholesaler only for their orders
 */
exports.updateOrderStatusForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const { status, cancellationReason, notes } = req.body;
    const validStatuses = [
      'confirmed',
      'dispatched',
      'delivered',
      'cancelled',
      'rejected'
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid status update'));
    }
    const order = await Order.findOne({ _id: orderId, wholesalerId });
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    order.status = status;
    if (cancellationReason) order.cancellationReason = cancellationReason;
    if (notes) order.notes = notes;
    await order.save();
    return res.status(200).json(apiResponse(200, true, 'Order status updated successfully', { order }));
  } catch (error) {
    console.log('Error in updateOrderStatusForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to update order status'));
  }
};



/**
 * Create a new order (for testing/admin; typically, retailers create orders)
 * Now supports vehicleNumber
 */
exports.createOrderForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const {
      retailerId,
      products,
      deliveryAddress,
      deliveryDate,
      orderTotal,
      paymentMethod,
      notes,
      vehicleNumber
    } = req.body;
    if (!retailerId || !products || !deliveryAddress) {
      return res.status(400).json(apiResponse(400, false, 'Missing required fields'));
    }
    const order = new Order({
      wholesalerId,
      retailerId,
      products,
      deliveryAddress,
      deliveryDate,
      orderTotal,
      paymentMethod: paymentMethod || 'cod',
      notes,
      vehicleNumber
    });
    await order.save();
    return res.status(201).json(apiResponse(201, true, 'Order created successfully', { order }));
  } catch (error) {
    console.log('Error in createOrderForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to create order'));
  }
};

/**
 * Search/filter orders for wholesaler (by status, date, retailer, payment method, order amount, vehicle number, etc.)
 */
exports.searchOrdersForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const {
      status,
      retailerId,
      fromDate,
      toDate,
      minTotal,
      maxTotal,
      paymentMethod,
      vehicleNumber,
    } = req.query;

    const query = { wholesalerId };

    // Case-insensitive search for status
    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') }; // exact match, case-insensitive
    }

    if (retailerId) query.retailerId = retailerId;

    // Filter by date range with validation
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        const parsedFrom = new Date(fromDate);
        if (!isNaN(parsedFrom)) query.createdAt.$gte = parsedFrom;
        else console.log("Invalid fromDate:", fromDate);
      }
      if (toDate) {
        const parsedTo = new Date(toDate);
        if (!isNaN(parsedTo)) query.createdAt.$lte = parsedTo;
        else console.log("Invalid toDate:", toDate);
      }
      if (Object.keys(query.createdAt).length === 0) delete query.createdAt;
    }

    // Filter by order amount
    if (minTotal || maxTotal) {
      query.orderTotal = {};
      if (minTotal) query.orderTotal.$gte = Number(minTotal);
      if (maxTotal) query.orderTotal.$lte = Number(maxTotal);
    }

    // Case-insensitive search for payment method
    if (paymentMethod) {
      query.paymentMethod = { $regex: new RegExp(`^${paymentMethod}$`, 'i') };
    }

    // Case-insensitive search for vehicle number
    if (vehicleNumber) {
      query.vehicleNumber = { $regex: new RegExp(vehicleNumber, 'i') }; // partial match, case-insensitive
    }

    console.log("Final MongoDB Query:", query);

    const orders = await Order.find(query)
      .populate("retailerId", "name phoneNumber address")
      .sort({ createdAt: -1 });

    console.log("Orders found:", orders.length);
    return res
      .status(200)
      .json(apiResponse(200, true, "Orders retrieved successfully", { orders }));
  } catch (error) {
    console.log("Error in searchOrdersForWholesaler:", error.message);
    return res
      .status(500)
      .json(apiResponse(500, false, "Failed to search orders"));
  }
};


