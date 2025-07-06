const mongoose = require("mongoose");

const WholesalerProfileSchema = new mongoose.Schema(
  {
    wholesalerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    fullName: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    businessName: {
      type: String,
    },
    businessType: {
      type: String,
      enum: ['Proprietorship', 'Partnership', 'Private Limited', 'LLP', 'Other'],
    },
    gstNumber: {
      type: String,
      unique: true,
    },
    apmcRegion: {
      type: String,
    },
    businessAddress: {
      shopNumber: { type: String },
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    businessHours: {
      monToSat: {
        open: { type: String, default: "08:00 AM" },
        close: { type: String, default: "08:00 PM" },
      },
      sunday: {
        open: { type: String, default: "09:00 AM" },
        close: { type: String, default: "06:00 PM" },
      },
    },
    isShopOpen: {
      type: Boolean,
      default: true,
    },
    businessCertificate: {
      // URL link
      type: String,
    },
    kycStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Rejected'],
      default: 'Pending',
    },
    isWholesalerVerified: {
      type: Boolean,
      default: false,
    },
    idProof: {
      type: String, // URL to uploaded Aadhaar or PAN card
    },
    businessRegistration: {
      type: String, // URL to uploaded Certificate of Incorporation
    },
    // Payment details (for future use)
    upiId: { type: String },
    accountHolderName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WholesalerProfile", WholesalerProfileSchema);
