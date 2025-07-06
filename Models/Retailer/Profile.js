const mongoose = require("mongoose");

const RetailerProfileSchema = new mongoose.Schema({
  retailerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Auth",
    required: true
  },
  name: {
    type: String
  },
  phoneNumber: {
    type: String
  },
  address: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("RetailerProfile", RetailerProfileSchema);

