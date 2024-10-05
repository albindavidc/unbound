const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who submitted the rating
    rating: { type: Number, required: true }, // Rating value (e.g., 1-5 stars)
    review: { type: String },
  },
  { timestamps: true }
);

const imageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    type: {
      type: String,
      enum: ["primary", "secondary"],
      //  required: true
    },
  },
  { timestamps: true }
);

const variantSchema = new mongoose.Schema({
  // _id: {
  //   type: String,
  //   unique: true,  
  //   default: () => new mongoose.Types.ObjectId(),  
  color: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Color",
    // required: true,
  },
  size: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Size", 
    // required: true,
  },
  stock: {
    type: Number,
    // required: true,
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
      trim: true,
    },
    wishlist: {
      type: Boolean,
      default: false,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    variants: [variantSchema],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    quantity: {
      type: Number, //Max product per person
    },
    primaryImages: { type: [imageSchema] },
    secondaryImages: { type: [imageSchema] },
    canvasData: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customize",
    },
    customizedProduct: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    actualPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    bundlePrice: {
      type: Number,
      required: true,
    },
    bundleQuantity: {
      type: Number,
    },
    // onOffer: {
    //   type: String,
    //   required: true,
    // },
    // offerDiscountPrice: {
    //   type: Number,
    //   min: 0,
    //   default: 0,
    // },
    offerDiscountRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    ratings: [ratingSchema],
    arrivalDate: { type: Date, default: Date.now }, // Field to track the arrival date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
