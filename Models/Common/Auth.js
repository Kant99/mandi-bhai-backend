const mongoose = require("mongoose");

const AuthSchema = new mongoose.Schema(
  {
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
