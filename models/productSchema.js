const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensures the product name is unique
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      ref: "Brand",
      required: true,

      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    markdown1: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    markdown2: {
      type: String,
      required: true,
    },
    product_image: {
      type: [String],
      required: true,
      validate: {
        validator: function (value) {
          return value.length > 0; // Ensures there is at least one image
        },
        message: "Product must have at least one image",
      },
    },
    // variants: [
    //   {
    //     color: {
    //       type: ObjectId,
    //       ref: "Color",
    //       required: true,
    //     },
    //     size: {
    //       type: ObjectId,
    //       ref: "Size",
    //       required: true,
    //     },
    //     stock: {
    //       type: Number,
    //       required: true,
    //     },
    //   },
    // ],
    // reviews: [
    //   {
        // user: {
        //   user_id: {
        //     type: ObjectId,
        //     ref: "User",
        //   },
        //   name: {
        //     type: String,
        //   },
        //   email: {
        //     type: String,
        //   },
        // },

        // rating: {
        //   type: Number,
        // },
        // comment: {
        //   type: String,
        // },

        // product: {
        //   id: {
        //     type: ObjectId,
        //     ref: "Product",
        //   },
        //   name: {
        //     type: String,
        //   },
        //   color: {
        //     type: String,
        //   },
        //   size: {
        //     type: Number,
        //   },
        // },

    //     data: {
    //       type: Date,
    //       default: Date.now,
    //     },
    //   },
    // ],

    price: {
      type: Number,
    },

    actualPrice: {
      type: Number,
      required: true,
    },
    sellingPrice: {
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
    offerDiscountPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["Available", "Out of stock", "Discontinued"],
      default: "Available",
    },

  },
  { timestamps: true,
    strict: false,
   }
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
