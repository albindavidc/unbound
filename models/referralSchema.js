// referralSchema.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const referralSchema = new Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  referredUserDetails: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        default: "In Active",
      },
    },
  ],
  referralCode: {
    type: String,
  },

  referralType: {
    type: String,
    enum: ["direct", "tiered", "affiliate"],
  },
  rewards: [
    {
      type: {
        type: String,
        enum: ["discount", "cashback", "points"],
      },
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "redeemed"],
        default: "pending",
      },
    },
  ],
  referralLink: {
    type: String,
  },
  referredPurchases: {
    type: Number,
    default: 0,
  },
  totalRewardsEarned: {
    type: Number,
    default: 0,
  },
  tieredReferrals: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      level: { type: Number, default: 1 },
    },
  ],
});

module.exports = mongoose.model("Referral", referralSchema);
