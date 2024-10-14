//sizeSchema.js

const mongoose = require("mongoose");
const sizeSchema = new mongoose.Schema(
  {
    value: {
      type: Number,
      required: true,
      unique: true,
    },
    isListed: { type: Boolean, default: true },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Size", sizeSchema);
