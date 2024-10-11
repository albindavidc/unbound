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
    customized:{
      type: Boolean,
      default: false,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        customized:{
          type: Boolean,
          default: false,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Variant",
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
      default: 40,
    },
    payable: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

cartSchema.statics.clearCart = async function (userId) {
  return await this.findOneAndUpdate(
    { userId: userId },
    {
      $set: {
        items: [],
        totalPrice: 0,
        coupon: null,
        couponDiscount: 0,
        payable: 0,
      },
    },
    { new: true }
  );
};

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
