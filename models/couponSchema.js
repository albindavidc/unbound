// couponSchema.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    set: (value) => value.toUpperCase(),
  },
  description: {
    type: String,
    required: true,
  },
  rateOfDiscount: {
    type: Number,
    required: true,
    min: 0,
  },
  minPurchaseAmount: {
    type: Number,
    required: true,
    default: 400,
    min: 0, // Ensures the value is non-negative
  },
  usedBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],

  isActive: {
    type: Boolean,
    default: true,
  },
  startingDate: {
    type: Date,
    required: true,
  },
  expiringDate: {
    type: Date,
    required: true,
  },
});

// Compile the schema into a model
const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
