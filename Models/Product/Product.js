const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // Ensure "Auth" is the correct name of the referenced model
      required: true
    },
    productName: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    productDescription: {
      type: String,
      trim: true,
    },
    productImage: {
      type: String,
      required: true,
    },
    priceBeforeGst: {
      type: Number,
      required: true,
    },
    gstCategory: {
      type: String,
      enum: ['exempted', 'applicable'],
      required: true,
      default: 'exempted',
      // Whether GST is exempted or applicable for this product
    },
    gstPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      // GST percentage for this product
    },
    priceAfterGst: {
      type: Number,
      required: true,
      // The price after GST is applied
    },
    priceUnit: {
      type: String,
      enum: ["per kg", "per dozen", "per piece"],
      required: true,
    },
    lastPriceUpdate: {
      type: Date,
      default: Date.now,
      required: true
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minimumRequired: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      // Minimum required stock for this product
    },
    filters: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
