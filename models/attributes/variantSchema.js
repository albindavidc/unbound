const mongoose = require("mongoose");


const variantSchema = new mongoose.Schema({
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    colorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Color',
    },
    sizeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Size',
    },
    stock: { type: Number, required: true },
    // Other variant-specific fields...
  }, { timestamps: true });
  
  const Variant = mongoose.model('Variant', variantSchema);
  module.exports = Variant;