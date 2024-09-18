const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Color",
    },
    sizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Size",
    },
    stock: { type: Number, required: true },
    isListed: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Variant = mongoose.model("Variant", variantSchema);
module.exports = Variant;
