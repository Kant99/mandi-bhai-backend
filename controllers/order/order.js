const mongoose = require('mongoose');
const Order = require('../../Models/Common/Order');
const Product = require('../../Models/Product/Product'); // Import Product model
const RetailerProfile = require('../../Models/Retailer/Profile');
const { apiResponse } = require('../../utils/apiResponse');

exports.getAllOrdersForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const orders = await Order.find({ wholesalerId })
      .populate('retailerId', 'name phoneNumber address avatar')
      .populate('products.productId', 'productName productImage priceAfterGst') // Populate product details
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

exports.getOrderByIdForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, wholesalerId })
      .populate('retailerId', 'name phoneNumber address avatar')
      .populate('products.productId', 'productName productImage priceAfterGst');
    if (!order) {
      return res.status(404).json(apiResponse(404, false, 'Order not found'));
    }
    return res.status(200).json(apiResponse(200, true, 'Order retrieved successfully', { order }));
  } catch (error) {
    console.log('Error in getOrderByIdForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to retrieve order'));
  }
};

exports.updateOrderStatusForWholesaler = async (req, res) => {
  try {
    const wholesalerId = req.user.id;
    const { orderId } = req.params;
    const { status, cancellationReason, notes } = req.body;
    const validStatuses = ['confirmed', 'dispatched', 'delivered', 'cancelled', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(apiResponse(400, false, 'Invalid status update'));
    }
    const order = await Order.findOne({ _id: orderId, wholesalerId })
      .populate('retailerId', 'name phoneNumber address avatar')
      .populate('products.productId', 'productName productImage priceAfterGst');
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

    // Validate required fields
    if (!retailerId || !products || !products.length || !deliveryAddress || !orderTotal) {
      return res.status(400).json(apiResponse(400, false, 'Missing required fields'));
    }

    // Validate retailerId
    const retailer = await RetailerProfile.findById(retailerId);
    if (!retailer) {
      return res.status(400).json(apiResponse(400, false, 'Invalid retailerId'));
    }

    // Validate products and calculate total
    let calculatedTotal = 0;
    const validatedProducts = [];
    for (const product of products) {
      if (!product.productId || !product.quantity || product.quantity < 1) {
        return res.status(400).json(apiResponse(400, false, 'Invalid product data'));
      }
      const productDoc = await Product.findById(product.productId);
      if (!productDoc) {
        return res.status(400).json(apiResponse(400, false, `Product not found: ${product.productId}`));
      }
      const productTotal = productDoc.priceAfterGst * product.quantity;
      validatedProducts.push({
        productId: product.productId,
        quantity: product.quantity,
        total: productTotal
      });
      calculatedTotal += productTotal;
    }

    // Validate orderTotal
    if (calculatedTotal !== orderTotal) {
      return res.status(400).json(apiResponse(400, false, 'Order total does not match calculated total'));
    }

    const order = new Order({
      wholesalerId,
      retailerId,
      products: validatedProducts,
      deliveryAddress,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      orderTotal,
      paymentMethod: paymentMethod || 'cod',
      notes,
      vehicleNumber
    });

    await order.save();
    const populatedOrder = await Order.findById(order._id)
      .populate('retailerId', 'name phoneNumber address avatar')
      .populate('products.productId', 'productName productImage priceAfterGst');
    return res.status(201).json(apiResponse(201, true, 'Order created successfully', { order: populatedOrder }));
  } catch (error) {
    console.log('Error in createOrderForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to create order'));
  }
};

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

    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    if (retailerId) {
      query.retailerId = retailerId;
    }

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

    if (minTotal || maxTotal) {
      query.orderTotal = {};
      if (minTotal) query.orderTotal.$gte = Number(minTotal);
      if (maxTotal) query.orderTotal.$lte = Number(maxTotal);
    }

    if (paymentMethod) {
      query.paymentMethod = { $regex: new RegExp(`^${paymentMethod}$`, 'i') };
    }

    if (vehicleNumber) {
      query.vehicleNumber = { $regex: new RegExp(vehicleNumber, 'i') };
    }

    console.log("Final MongoDB Query:", query);

    const orders = await Order.find(query)
      .populate('retailerId', 'name phoneNumber address avatar')
      .populate('products.productId', 'productName productImage priceAfterGst')
      .sort({ createdAt: -1 });

    console.log("Orders found:", orders.length);
    return res.status(200).json(apiResponse(200, true, 'Orders retrieved successfully', { orders }));
  } catch (error) {
    console.log('Error in searchOrdersForWholesaler:', error.message);
    return res.status(500).json(apiResponse(500, false, 'Failed to search orders'));
  }
};