const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,
      required: false,
      unique: false,
      sparse: true,
      default: null,
    },
    googleId: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    referralCode: {
      type: String,
      unique: true,

    },
    referrals: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
