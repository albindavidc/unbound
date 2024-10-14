// customizedProduct.js

const mongoose = require("mongoose");
const { Schema } = mongoose;

const customizedProduct = new Schema({
  userId: {
    type: String,
    required: true,
  },
  products: [
    {
      productId: {
        type: String,
        required: true,
      },
      canvasData: {
        front: {
          type: mongoose.Schema.Types.Mixed,
        },
        back: {
          type: mongoose.Schema.Types.Mixed,
        },
        left: {
          type: mongoose.Schema.Types.Mixed,
        },
        right: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
      customizedProductOption: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

const Customize = mongoose.model("Customize", customizedProduct);
module.exports = Customize;
