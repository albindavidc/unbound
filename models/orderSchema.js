// orderSchema.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema(
  {
    customerId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
      required: true,
    },
    customized: {
      type: Boolean,
      default: false,
    },
    items: [
      {
        productId: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        customized: {
          type: Boolean,
          default: false,
        },
        review: {
          type: ObjectId,
          ref: "Product",
        },
        variant: {
          type: ObjectId,
          ref: "Variants",
          // required: true,
        },
        color: {
          type: ObjectId,
          ref: "Color",
        },
        size: {
          type: ObjectId,
          ref: "Size",
          // required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, `Quantity Can't be less than 1`],
        },
        productDetail: {
          name: {
            type: String,
          },
          color: {
            type: String,
          },
          size: {
            type: Number,
          },
          quantity: {
            type: Number,
          },
          price: {
            type: Number,
          },
        },
        price: {
          type: Number,
          required: true,
        },
        itemTotal: {
          type: Number,
        },
        orderID: {
          type: String,
          default: () => uuidv4(), // Generates a unique ID each time a new order is created
          unique: true, // Ensures the orderId is unique in the database
          required: true,
        },
        status: {
          type: String,
        },
        paymentStatus: {
          type: String,
          enum: ["Paid", "Pending", "COD", "Failed", "Refund", "Cancelled"],
          // required: true,
        },
        cancelReason: {
          type: String,
        },
        cancelRefundMethod: {
          type: String,
          enum: ["Refund to Bank Account", "Refund to Wallet"],
        },
        cancelledOn: {
          type: Date,
        },
        returnReason: {
          type: String,
        },
        returnRefundMethod: {
          type: String,
          enum: ["Refund to Bank Account", "Refund to Wallet"],
        },
        returnedOn: {
          type: Date,
        },
        shippedOn: {
          type: Date,
        },
        outForDelivery: {
          type: Date,
        },
      },
    ],
    shippingAddress: {
      name: {
        type: String,
      },
      houseName: {
        type: String,
      },
      locality: {
        type: String,
      },
      areaStreet: {
        type: String,
      },
      phone: {
        type: String,
      },
      zipcode: {
        type: Number,
      },
      state: {
        type: String,
      },
      landmark: {
        type: String,
      },
      city: {
        type: String,
      },
      address: {
        type: String,
      },
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    coupon: {
      type: ObjectId,
      ref: "Coupon",
    },
    couponDiscount: {
      type: Number,
      default: 0,
    },
    payable: {
      type: Number,
    },
    categoryDiscount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Pending", "COD", "Failed", "Refund", "Cancelled"],
      // required: true,
    },
    status: {
      type: String,
      // required: true,
    },
    deliveredOn: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
