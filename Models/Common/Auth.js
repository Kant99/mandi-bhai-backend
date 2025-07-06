const mongoose = require("mongoose");

const AuthSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    hasShopDetail: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["Retailer", "Wholesaler"],
      default: "Retailer",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Auth", AuthSchema);
