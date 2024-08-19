const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who submitted the rating
    rating: { type: Number, required: true }, // Rating value (e.g., 1-5 stars)
    review: { type: String },
  },
  { timestamps: true }
);

const imageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  type: { type: String, enum: ["primary", "secondary"], required: true },
});

const variantSchema = new mongoose.Schema({
  color: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Color object ID
    ref: "Color", // Reference to the 'Color' model
    required: true,
  },
  size: {
    type: mongoose.Schema.Types.ObjectId, // Reference to Size object ID
    ref: "Size", // Reference to the 'Size' model
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
});

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"Brand",
    },
    variants: [variantSchema],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    quantity: {
      type: Number,
    },
    primaryImages: { type: [imageSchema] },
    secondaryImages: { type: [imageSchema] },
    isActive: {
      type: Boolean,
      default: true,
    },
    actualPrice: {
      type: Number,
    },
    sellingPrice: {
      type: Number,
    },
    bundlePrice: {
      type: Number,
      required: true,
    },
    onOffer: {
      type: Boolean,
      default: false,
    },
    offerDiscountPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    offerDiscountRate: {
      type: Number,
      min: 0,
      default: 0
    },
    ratings: [ratingSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
