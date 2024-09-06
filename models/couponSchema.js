const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({

  code: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true, // Ensures each coupon code is unique
  },
  description: {
    type: String,
    required: true,
  },
  rateOfDiscount: {
    type: Number,
    required: true,
    min: 0, // Ensures the value is non-negative
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
  maximumDiscount: {
    type: Number,
    required: true,
    min: 0, // Ensures the value is non-negative
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expirationDate: {
    type: Date,
    default: Date.now(),
    required: true,
  },
});

// Compile the schema into a model
const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
