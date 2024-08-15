const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema(
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
      type: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },

    regularprice: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    volume: {
      type: Number,
   
    },
    quantity: {
      type: Number,
      required: true,
    },
    color: {
      type: [String],
      required: true,
    },    
    primaryImages: { type: [imageSchema]},
    secondaryImages: { type: [imageSchema]},
    isActive:{
      type: Boolean,
      default: true,

    },
    offerpercentage: {
      type: Number,
      default: 0,
    },
    ratings: [RatingSchema],
     variants: [
      {
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
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
