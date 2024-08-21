const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const orderSchema = new Schema(
  {
    customerId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        productId: {
          type: ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          type: ObjectId,
          ref: "Product.variants", // Corrected ref path
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
          unique: true,
        },
        status: {
          type: String,
        },
        paymentStatus: {
          type: String,
        },
        returnReason: {
          type: String,
        },
        shippedOn: {
          type: Date,
        },
        outForDelivery: {
          type: Date,
        },
        deliveredOn: {
          type: Date,
        },
        cancelledOn: {
          type: Date,
        },
        returnedOn: {
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
      enum: ["Paid", "Pending", "COD", "Failed", "Refunded", "Cancelled"],
      // required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("Order", orderSchema);
