const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Product = require("./productSchema");
const Coupon = require("./couponSchema");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product.variants",
        },
        colorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Color",
        },
        sizeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Size",
          // required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, `Quantity Can't be less than 1`],
        },
        price: {
          type: Number,
        },
        itemTotal: {
          type: Number,
        },
      },
    ],
    totalPrice: {
      type: Number,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    shipmentFee:{
      type: Number,
      default: 0,
    },
    payable: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
