const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Who placed the order (Retailer)
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RetailerProfile', // or 'Retailer' if that's your model
    required: true
  },
  // Who fulfills the order (Wholesaler)
  wholesalerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WholesalerShopProfile', // or 'Wholesaler' if that's your model
    required: true
  },
  // List of products in the order
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      total: Number // priceAmount * quantity
    }
  ],
  // Order status
  status: {
    type: String,
    enum: [
      'pending',        // Order placed, awaiting wholesaler action
      'confirmed',      // Wholesaler confirmed
      'dispatched',     // Out for delivery
      'delivered',      // Delivered to retailer
      'cancelled',      // Cancelled by retailer/wholesaler/admin
      'rejected'        // Explicitly rejected by wholesaler
    ],
    default: 'pending'
  },
  // Payment details
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'online', 'upi', 'card'],
    default: 'cod'
  },
  // Delivery details
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryDate: Date,
  // Order summary
  orderTotal: {
    type: Number,
    required: true
  },
  // Optional: notes, cancellation reason, etc.
  notes: String,
  cancellationReason: String,
  // Vehicle number for delivery (optional)
  vehicleNumber: {
    type: String,
    default: null,
    // Optional: can be used to track delivery vehicle
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema); 