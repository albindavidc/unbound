const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // The user who referred another person
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // The referred user
    required: false, // Can be null if the referral hasn't signed up yet
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
  },
  referralType: {
    type: String,
    enum: ['direct', 'tiered', 'affiliate'],
    required: true,
  },
  rewards: [
    {
      type: {
        type: String,
        enum: ['discount', 'cashback', 'points'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'redeemed'],
        default: 'pending',
      },
    },
  ],
  referralLink: {
    type: String, // Unique affiliate link for referral
    required: false, // Only required for affiliate referral types
  },
  dateReferred: {
    type: Date,
    default: Date.now,
  },
  referredPurchases: {
    type: Number, // Total number of purchases made by referred users
    default: 0,
  },
  totalRewardsEarned: {
    type: Number,
    default: 0, // Total rewards earned by the referrer
  },
  tieredReferrals: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      level: { type: Number, default: 1 }, // Level in the tier system (e.g., 1st, 2nd level)
    },
  ],
});

module.exports = mongoose.model('Referral', referralSchema);
